import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { Api, TelegramClient } from 'telegram';
import type { TelegramClientParams } from 'telegram/client/telegramBaseClient';
import { ConnectionTCPMTProxyAbridged } from 'telegram/network/connection/TCPMTProxy';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';
import { telegramConversionService } from './telegram-conversion.service';

type TrackedAccount = {
  id: string;
  apiId: number;
  apiHash: string;
  sessionString: string;
};

type StopTrackingOptions = {
  logout?: boolean;
};

export const getTelegramClientParams = (): TelegramClientParams => {
  const host = env.TELEGRAM_MTPROXY_HOST;
  const port = env.TELEGRAM_MTPROXY_PORT;
  const secret = env.TELEGRAM_MTPROXY_SECRET;
  const hasAnyProxyConfig = Boolean(host || port || secret);

  if (!hasAnyProxyConfig) {
    return { connectionRetries: 10 };
  }

  if (!host || !port || !secret) {
    throw new Error(
      'MTProxy configuration is incomplete. Set TELEGRAM_MTPROXY_HOST, TELEGRAM_MTPROXY_PORT and TELEGRAM_MTPROXY_SECRET.',
    );
  }

  return {
    connectionRetries: 10,
    connection: ConnectionTCPMTProxyAbridged,
    proxy: {
      ip: host,
      port,
      secret,
      MTProxy: true,
    },
  };
};

class TelegramTrackerRuntime {
  private readonly clients = new Map<string, TelegramClient>();
  private readonly pendingStarts = new Map<string, Promise<void>>();

  private async closeClient(client: TelegramClient) {
    await client.destroy().catch(() => {});
  }

  public async startAllActive() {
    const accounts = await prisma.telegramTrackedAccount.findMany({
      where: { isActive: true },
      select: {
        id: true,
        apiId: true,
        apiHash: true,
        sessionString: true,
      },
    });

    await Promise.all(accounts.map((account) => this.startTracking(account)));
  }

  public isRunning(accountId: string) {
    return this.clients.has(accountId);
  }

  public async restartTracking(accountId: string) {
    const account = await prisma.telegramTrackedAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        apiId: true,
        apiHash: true,
        sessionString: true,
        isActive: true,
      },
    });

    await this.stopTracking(accountId);

    if (!account || !account.isActive) {
      return;
    }

    await this.startTracking(account);
  }

  public async stopTracking(
    accountId: string,
    options: StopTrackingOptions = {},
  ) {
    const pendingStart = this.pendingStarts.get(accountId);

    if (pendingStart) {
      await pendingStart.catch(() => {});
    }

    const client = this.clients.get(accountId);

    if (!client) {
      return;
    }

    try {
      if (options.logout) {
        await client.invoke(new Api.auth.LogOut());
      }
    } catch (error) {
      logger.warn(
        { err: error, accountId },
        'Failed to log out Telegram client',
      );
    } finally {
      await this.closeClient(client);
      this.clients.delete(accountId);
    }
  }

  public async stopAll() {
    const accountIds = [...this.clients.keys()];

    await Promise.all(accountIds.map((id) => this.stopTracking(id)));
  }

  private async startTracking(account: TrackedAccount) {
    if (this.clients.has(account.id)) {
      return;
    }

    const pendingStart = this.pendingStarts.get(account.id);

    if (pendingStart) {
      await pendingStart;
      return;
    }

    const startPromise = this.connectAndRegisterClient(account).finally(() => {
      this.pendingStarts.delete(account.id);
    });

    this.pendingStarts.set(account.id, startPromise);
    await startPromise;
  }

  private async connectAndRegisterClient(account: TrackedAccount) {
    const client = new TelegramClient(
      new StringSession(account.sessionString),
      account.apiId,
      account.apiHash,
      getTelegramClientParams(),
    );

    try {
      await client.connect();

      client.addEventHandler(
        (event) => {
          void this.handleIncomingMessage(account.id, event);
        },
        new NewMessage({ incoming: true }),
      );

      this.clients.set(account.id, client);

      logger.info({ accountId: account.id }, 'Telegram tracker connected');
    } catch (error) {
      await this.closeClient(client);
      throw error;
    }
  }

  private async handleIncomingMessage(
    accountId: string,
    event: NewMessageEvent,
  ) {
    try {
      const message = event.message;

      if (!message || message.out) {
        return;
      }

      const senderIdRaw = message.senderId;

      if (senderIdRaw === null || senderIdRaw === undefined) {
        return;
      }

      const senderId = BigInt(senderIdRaw.toString());

      const chatId =
        message.chatId === undefined ? null : BigInt(message.chatId.toString());

      const receivedAt = message.date
        ? new Date(message.date * 1000)
        : new Date();

      const text =
        typeof message.message === 'string' && message.message.length > 0
          ? message.message
          : null;

      await telegramConversionService.processFirstMessage(accountId, senderId);

      await prisma.incomingMessage.create({
        data: {
          trackedAccountId: accountId,
          fromTelegramUserId: senderId,
          chatTelegramId: chatId,
          telegramMessageId: message.id,
          messageText: text,
          receivedAt,
        },
      });
    } catch (error) {
      logger.error(
        { err: error, accountId },
        'Failed to persist incoming Telegram message',
      );
    }
  }
}

export const telegramTrackerRuntime = new TelegramTrackerRuntime();

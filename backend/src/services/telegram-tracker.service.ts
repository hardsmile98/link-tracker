import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/app-error";
import { getTelegramClientParams, telegramTrackerRuntime } from "./telegram-tracker.runtime";

type CreateTrackerInput = {
  label: string;
  apiId: number;
  apiHash: string;
  sessionString: string;
  isActive: boolean;
};

type UpdateTrackerInput = {
  id: string;
  label?: string;
  sessionString?: string;
  isActive?: boolean;
};

type StartTrackerAuthInput = {
  label: string;
  phoneNumber: string;
};

type VerifyTrackerCodeInput = {
  authSessionId: string;
  code: string;
};

type VerifyTrackerPasswordInput = {
  authSessionId: string;
  password: string;
};

type TrackerAuthSession = {
  id: string;
  client: TelegramClient;
  label: string;
  apiId: number;
  apiHash: string;
  phoneNumber: string;
  phoneCodeHash: string;
  isActive: boolean;
};

export class TelegramTrackerService {
  private readonly authSessions = new Map<string, TrackerAuthSession>();
  
  private async closeAuthClient(client: TelegramClient) {
    await client.destroy().catch(() => {});
  }

  public async listTrackers() {
    const trackers = await prisma.telegramTrackedAccount.findMany({
      select: {
        id: true,
        label: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [{ createdAt: "desc" }]
    });

    return trackers.map((tracker) => ({
      ...tracker,
      isRunning: telegramTrackerRuntime.isRunning(tracker.id)
    }));
  }

  public async createTracker(input: CreateTrackerInput) {
    const tracker = await prisma.telegramTrackedAccount.create({
      data: input
    });

    if (tracker.isActive) {
      await telegramTrackerRuntime.restartTracking(tracker.id);
    }

    return {
      ...tracker,
      isRunning: telegramTrackerRuntime.isRunning(tracker.id)
    };
  }

  public async updateTracker(input: UpdateTrackerInput) {
    const data: {
      label?: string;
      isActive?: boolean;
    } = {};

    if (input.label !== undefined) {
      data.label = input.label;
    }
    if (input.isActive !== undefined) {
      data.isActive = input.isActive;
    }

    try {
      const tracker = await prisma.telegramTrackedAccount.update({
        where: { id: input.id },
        data
      });

      await telegramTrackerRuntime.restartTracking(tracker.id);

      return {
        ...tracker,
        isRunning: telegramTrackerRuntime.isRunning(tracker.id)
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Telegram tracker not found", 404);
      }

      throw error;
    }
  }

  public async deleteTracker(id: string) {
    await telegramTrackerRuntime.stopTracking(id, { logout: true });

    try {
      await prisma.telegramTrackedAccount.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Telegram tracker not found", 404);
      }

      throw error;
    }
  }

  public async restartTracker(id: string) {
    const tracker = await prisma.telegramTrackedAccount.findUnique({
      where: { id },
      select: {
        id: true,
        label: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!tracker) {
      throw new AppError("Telegram tracker not found", 404);
    }

    await telegramTrackerRuntime.restartTracking(id);

    return {
      ...tracker,
      isRunning: telegramTrackerRuntime.isRunning(tracker.id)
    };
  }

  public async listIncomingMessages(trackerId: string) {
    const tracker = await prisma.telegramTrackedAccount.findUnique({
      where: { id: trackerId },
      select: { id: true }
    });

    if (!tracker) {
      throw new AppError("Telegram tracker not found", 404);
    }

    return prisma.incomingMessage.findMany({
      where: { trackedAccountId: trackerId },
      orderBy: [{ receivedAt: "desc" }]
    });
  }

  private escapeIlikeContains(term: string): string {
    return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  }

  private mapIncomingChatAggregateRows(
    rows: Array<{
      id: string;
      trackedAccountId: string;
      fromTelegramUserId: bigint;
      chatTelegramId: bigint | null;
      telegramMessageId: number | null;
      messageText: string | null;
      fromFirstName: string | null;
      fromLastName: string | null;
      receivedAt: Date;
      createdAt: Date;
      peerType: string;
      peerId: bigint;
      isTrash: boolean;
      trashMarkedAt: Date | null;
    }>
  ) {
    return rows.map((row) => ({
      peerType: row.peerType === "chat" ? ("chat" as const) : ("user" as const),
      peerId: row.peerId,
      isTrash: row.isTrash,
      trashMarkedAt: row.trashMarkedAt,
      lastMessage: {
        id: row.id,
        trackedAccountId: row.trackedAccountId,
        fromTelegramUserId: row.fromTelegramUserId,
        chatTelegramId: row.chatTelegramId,
        telegramMessageId: row.telegramMessageId,
        messageText: row.messageText,
        fromFirstName: row.fromFirstName,
        fromLastName: row.fromLastName,
        receivedAt: row.receivedAt,
        createdAt: row.createdAt
      }
    }));
  }

  public async listIncomingChats(trackerId: string, search?: string) {
    const tracker = await prisma.telegramTrackedAccount.findUnique({
      where: { id: trackerId },
      select: { id: true }
    });

    if (!tracker) {
      throw new AppError("Telegram tracker not found", 404);
    }

    const term = search?.trim() ?? "";
    const hasSearch = term.length > 0;
    const ilikePattern = hasSearch ? `%${this.escapeIlikeContains(term)}%` : "";

    type IncomingChatSqlRow = {
      id: string;
      trackedAccountId: string;
      fromTelegramUserId: bigint;
      chatTelegramId: bigint | null;
      telegramMessageId: number | null;
      messageText: string | null;
      fromFirstName: string | null;
      fromLastName: string | null;
      receivedAt: Date;
      createdAt: Date;
      peerType: string;
      peerId: bigint;
      isTrash: boolean;
      trashMarkedAt: Date | null;
    };

    const rows = await prisma.$queryRaw<IncomingChatSqlRow[]>`
      WITH params AS (
        SELECT
          CAST(${trackerId} AS uuid) AS tid,
          ${hasSearch}::boolean AS has_search,
          ${ilikePattern}::text AS ilike_pattern
      ),
      matching_peers AS (
        SELECT DISTINCT pk
        FROM (
          SELECT
            CASE
              WHEN m.chat_telegram_id IS NOT NULL THEN CONCAT('chat:', m.chat_telegram_id::text)
              ELSE CONCAT('user:', m.from_telegram_user_id::text)
            END AS pk
          FROM incoming_messages m
          CROSS JOIN params p
          WHERE m.tracked_account_id = p.tid
            AND (
              NOT p.has_search
              OR (
                m.message_text IS NOT NULL
                AND m.message_text ILIKE p.ilike_pattern ESCAPE '\\'
              )
            )
        ) t
      ),
      ranked AS (
        SELECT
          m.id,
          m.tracked_account_id AS "trackedAccountId",
          m.from_telegram_user_id AS "fromTelegramUserId",
          m.chat_telegram_id AS "chatTelegramId",
          m.telegram_message_id AS "telegramMessageId",
          m.message_text AS "messageText",
          m.from_first_name AS "fromFirstName",
          m.from_last_name AS "fromLastName",
          m.received_at AS "receivedAt",
          m.created_at AS "createdAt",
          CASE WHEN m.chat_telegram_id IS NOT NULL THEN 'chat' ELSE 'user' END AS "peerType",
          CASE
            WHEN m.chat_telegram_id IS NOT NULL THEN m.chat_telegram_id
            ELSE m.from_telegram_user_id
          END AS "peerId",
          COALESCE(a.is_trash, false) AS "isTrash",
          a.trash_marked_at AS "trashMarkedAt",
          ROW_NUMBER() OVER (
            PARTITION BY (
              CASE
                WHEN m.chat_telegram_id IS NOT NULL THEN CONCAT('chat:', m.chat_telegram_id::text)
                ELSE CONCAT('user:', m.from_telegram_user_id::text)
              END
            )
            ORDER BY m.received_at DESC
          ) AS rn
        FROM incoming_messages m
        INNER JOIN matching_peers mp ON mp.pk =
          CASE
            WHEN m.chat_telegram_id IS NOT NULL THEN CONCAT('chat:', m.chat_telegram_id::text)
            ELSE CONCAT('user:', m.from_telegram_user_id::text)
          END
        CROSS JOIN params p
        LEFT JOIN attributions a ON a.telegram_user_id = m.from_telegram_user_id
        WHERE m.tracked_account_id = p.tid
      )
      SELECT
        id,
        "trackedAccountId",
        "fromTelegramUserId",
        "chatTelegramId",
        "telegramMessageId",
        "messageText",
        "fromFirstName",
        "fromLastName",
        "receivedAt",
        "createdAt",
        "peerType",
        "peerId",
        "isTrash",
        "trashMarkedAt"
      FROM ranked
      WHERE rn = 1
      ORDER BY "receivedAt" DESC
    `;

    return this.mapIncomingChatAggregateRows(rows);
  }

  public async listIncomingMessagesForPeer(
    trackerId: string,
    peerType: "chat" | "user",
    peerId: bigint
  ) {
    const tracker = await prisma.telegramTrackedAccount.findUnique({
      where: { id: trackerId },
      select: { id: true }
    });

    if (!tracker) {
      throw new AppError("Telegram tracker not found", 404);
    }

    const where =
      peerType === "chat"
        ? { trackedAccountId: trackerId, chatTelegramId: peerId }
        : {
            trackedAccountId: trackerId,
            chatTelegramId: null,
            fromTelegramUserId: peerId
          };

    return prisma.incomingMessage.findMany({
      where,
      orderBy: [{ receivedAt: "asc" }]
    });
  }

  public async startTrackerAuth(input: StartTrackerAuthInput) {
    const client = new TelegramClient(new StringSession(""), env.TELEGRAM_API_ID, env.TELEGRAM_API_HASH, getTelegramClientParams());

    try {
      await client.connect();

      const { phoneCodeHash, isCodeViaApp } = await client.sendCode(
        {
          apiId: env.TELEGRAM_API_ID,
          apiHash: env.TELEGRAM_API_HASH
        },
        input.phoneNumber
      );

      const authSessionId = randomUUID();
      this.authSessions.set(authSessionId, {
        id: authSessionId,
        client,
        label: input.label,
        apiId: env.TELEGRAM_API_ID,
        apiHash: env.TELEGRAM_API_HASH,
        phoneNumber: input.phoneNumber,
        phoneCodeHash,
        isActive: true
      });

      return {
        authSessionId,
        isCodeViaApp
      };
    } catch (error) {
      await this.closeAuthClient(client);
      throw this.mapTelegramAuthError(error);
    }
  }

  public async verifyTrackerCode(input: VerifyTrackerCodeInput) {
    const authSession = this.authSessions.get(input.authSessionId);

    if (!authSession) {
      throw new AppError("Auth session not found or expired", 404);
    }

    try {
      await authSession.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: authSession.phoneNumber,
          phoneCodeHash: authSession.phoneCodeHash,
          phoneCode: input.code
        })
      );

      const tracker = await this.createTrackerFromAuthorizedSession(authSession);
      return { status: "DONE" as const, tracker };
    } catch (error) {
      if (this.isPasswordRequiredError(error)) {
        return { status: "PASSWORD_REQUIRED" as const };
      }

      throw this.mapTelegramAuthError(error);
    }
  }

  public async verifyTrackerPassword(input: VerifyTrackerPasswordInput) {
    const authSession = this.authSessions.get(input.authSessionId);

    if (!authSession) {
      throw new AppError("Auth session not found or expired", 404);
    }

    try {
      await authSession.client.signInWithPassword(
        {
          apiId: authSession.apiId,
          apiHash: authSession.apiHash
        },
        {
          password: async () => input.password,
          onError: async () => false
        }
      );

      const tracker = await this.createTrackerFromAuthorizedSession(authSession);
      return tracker;
    } catch (error) {
      throw this.mapTelegramAuthError(error);
    }
  }

  private async createTrackerFromAuthorizedSession(authSession: TrackerAuthSession) {
    const rawSession = authSession.client.session.save();

    const sessionString = typeof rawSession === "string" ? rawSession : "";

    if (!sessionString) {
      throw new AppError("Failed to create Telegram session string", 500);
    }

    this.authSessions.delete(authSession.id);

    await this.closeAuthClient(authSession.client);

    const tracker = await prisma.telegramTrackedAccount.create({
      data: {
        label: authSession.label,
        apiId: authSession.apiId,
        apiHash: authSession.apiHash,
        sessionString,
        isActive: authSession.isActive
      }
    });

    if (tracker.isActive) {
      await telegramTrackerRuntime.restartTracking(tracker.id);
    }

    return {
      ...tracker,
      isRunning: telegramTrackerRuntime.isRunning(tracker.id)
    };
  }

  private isPasswordRequiredError(error: unknown) {
    return error instanceof Error && error.message.includes("SESSION_PASSWORD_NEEDED");
  }

  private mapTelegramAuthError(error: unknown) {
    if (!(error instanceof Error)) {
      return error;
    }

    if (error.message.includes("PHONE_CODE_INVALID")) {
      return new AppError("Invalid confirmation code", 400);
    }

    if (error.message.includes("PHONE_CODE_EXPIRED")) {
      return new AppError("Confirmation code expired", 400);
    }

    if (error.message.includes("PASSWORD_HASH_INVALID")) {
      return new AppError("Invalid 2FA password", 400);
    }

    if (error.message.includes("PHONE_NUMBER_INVALID")) {
      return new AppError("Invalid phone number", 400);
    }

    if (error.message.includes("PHONE_NUMBER_BANNED")) {
      return new AppError("Phone number is banned by Telegram", 400);
    }

    return error;
  }
}

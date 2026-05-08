import { Bot, Keyboard, type Context, webhookCallback } from "grammy";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { prisma } from "../config/prisma";
import {
  getStringQueryParam,
  parseClickQueryParams
} from "../utils/click-query-params";
import { keitaroService } from "./keitaro.service";
import { tikTokEventsService } from "./tiktok-events.service";

type ManagerStep = "idle" | "awaiting_forward" | "awaiting_amount";

type PendingConversion = {
  telegramUserId: bigint;
  subid: string | null;
  ttpixelid: string | null;
  ttclid: string | null;
  _ttp: string | null;
  ip: string | null;
  userAgent: string | null;
};

type ManagerSession = {
  isAuthorized: boolean;
  step: ManagerStep;
  pendingConversion: PendingConversion | null;
};

const SEND_CLIENT_BUTTON = "Отправить клиента";
const FINISH_SESSION_BUTTON = "Завершить сессию";
const SEND_ANOTHER_BUTTON = "Отправить еще клиента";

class TelegramManagerBotRuntime {
  public readonly webhookPath = env.TELEGRAM_MANAGER_WEBHOOK_PATH;
  private readonly bot = new Bot(env.TELEGRAM_MANAGER_BOT_TOKEN);
  private readonly sessions = new Map<number, ManagerSession>();

  constructor() {
    this.registerHandlers();
  }

  public getWebhookCallback() {
    return webhookCallback(this.bot, "express");
  }

  public async start() {
    if (!env.TELEGRAM_MANAGER_WEBHOOK_URL) {
      throw new Error("TELEGRAM_MANAGER_WEBHOOK_URL is required.");
    }

    await this.bot.api.setWebhook(env.TELEGRAM_MANAGER_WEBHOOK_URL);

    logger.info(
      { path: this.webhookPath },
      "Telegram manager bot webhook configured"
    );
  }

  private registerHandlers() {
    this.bot.command("start", async (ctx) => {
      const session = this.ensureSession(ctx);

      if (session.isAuthorized) {
        await ctx.reply("Бот активен.", {
          reply_markup: this.getAuthorizedKeyboard()
        });
        return;
      }

      await ctx.reply("Введите пароль менеджера:");
    });

    this.bot.hears(SEND_CLIENT_BUTTON, async (ctx) => {
      const session = this.ensureSession(ctx);

      if (!session.isAuthorized) {
        await ctx.reply("Сначала введите пароль менеджера.");
        return;
      }

      session.step = "awaiting_forward";
      session.pendingConversion = null;

      await ctx.reply(
        "Перешлите сообщение покупателя, чтобы найти его клик.",
        {
          reply_markup: this.getAuthorizedKeyboard()
        }
      );
    });

    this.bot.hears(FINISH_SESSION_BUTTON, async (ctx) => {
      const session = this.ensureSession(ctx);

      if (!session.isAuthorized) {
        await ctx.reply("Сначала введите пароль менеджера.");
        return;
      }

      session.step = "idle";
      session.pendingConversion = null;

      await ctx.reply("Сессия завершена.", {
        reply_markup: this.getAuthorizedKeyboard()
      });
    });

    this.bot.hears(SEND_ANOTHER_BUTTON, async (ctx) => {
      const session = this.ensureSession(ctx);

      if (!session.isAuthorized) {
        await ctx.reply("Сначала введите пароль менеджера.");
        return;
      }

      session.step = "awaiting_forward";
      session.pendingConversion = null;

      await ctx.reply("Ок, перешлите сообщение следующего покупателя.", {
        reply_markup: this.getAuthorizedKeyboard()
      });
    });

    this.bot.on("message", async (ctx) => {
      const session = this.ensureSession(ctx);
      const text = ctx.message?.text?.trim();

      if (!session.isAuthorized) {
        if (!text) {
          await ctx.reply("Введите пароль текстом.");
          return;
        }

        if (text !== env.TELEGRAM_MANAGER_PASSWORD) {
          await ctx.reply("Неверный пароль. Попробуйте еще раз.");
          return;
        }

        session.isAuthorized = true;
        session.step = "idle";
        await ctx.reply("Доступ открыт.", {
          reply_markup: this.getAuthorizedKeyboard()
        });
        return;
      }

      if (session.step === "awaiting_forward") {
        const forwardedUserId = this.extractForwardedTelegramUserId(ctx);

        if (!forwardedUserId) {
          await ctx.reply("Нужно пересланное сообщение от покупателя.");

          return;
        }

        const pendingConversion =
          await this.resolvePendingConversion(forwardedUserId);

        if (!pendingConversion) {
          session.step = "idle";
  
          session.pendingConversion = null;
  
          await ctx.reply("Пользователь или клик не найдены. Попробуйте другого.", {
            reply_markup: this.getAuthorizedKeyboard()
          });
  
          return;
        }

        session.step = "awaiting_amount";
        session.pendingConversion = pendingConversion;

        await ctx.reply("Введите сумму покупки в USD (только число).");
        return;
      }

      if (session.step === "awaiting_amount") {
        if (!session.pendingConversion) {
          session.step = "idle";
          await ctx.reply("Сессия сброшена. Нажмите 'Отправить клиента'.", {
            reply_markup: this.getAuthorizedKeyboard()
          });
          return;
        }

        if (!text) {
          await ctx.reply("Введите сумму текстом, например: 150");
          return;
        }

        const amount = Number(text.replace(",", "."));

        if (!Number.isFinite(amount) || amount <= 0) {
          await ctx.reply("Некорректная сумма. Введите число больше 0.");
          return;
        }

        await this.sendConversion(session.pendingConversion, amount);

        session.step = "idle";
        session.pendingConversion = null;

        await ctx.reply("Событие отправлено.", {
          reply_markup: this.getPostConversionKeyboard()
        });
      }
    });

    this.bot.catch((error) => {
      logger.error({ err: error.error }, "Telegram manager bot error");
    });
  }

  private ensureSession(ctx: Context): ManagerSession {
    const fromId = ctx.from?.id;

    if (!fromId) {
      return {
        isAuthorized: false,
        step: "idle",
        pendingConversion: null
      };
    }

    const existing = this.sessions.get(fromId);
  
    if (existing) {
      return existing;
    }

    const created: ManagerSession = {
      isAuthorized: false,
      step: "idle",
      pendingConversion: null
    };
  
    this.sessions.set(fromId, created);
  
    return created;
  }

  private getAuthorizedKeyboard() {
    return new Keyboard().text(SEND_CLIENT_BUTTON).resized();
  }

  private getPostConversionKeyboard() {
    return new Keyboard()
      .text(SEND_ANOTHER_BUTTON)
      .text(FINISH_SESSION_BUTTON)
      .resized();
  }

  private extractForwardedTelegramUserId(ctx: Context): bigint | null {
    const message = ctx.message;

    if (!message) {
      return null;
    }

    const messageData = message as unknown as Record<string, unknown>;

    if (
      "forward_from" in messageData &&
      typeof messageData.forward_from === "object" &&
      messageData.forward_from !== null &&
      "id" in messageData.forward_from
    ) {
      const id = (messageData.forward_from as { id: number }).id;
      return BigInt(id);
    }

    if (
      "forward_origin" in messageData &&
      typeof messageData.forward_origin === "object" &&
      messageData.forward_origin !== null &&
      "type" in messageData.forward_origin &&
      messageData.forward_origin.type === "user" &&
      "sender_user" in messageData.forward_origin
    ) {
      const senderUser = (messageData.forward_origin as { sender_user: { id: number } })
        .sender_user;
      return BigInt(senderUser.id);
    }

    return null;
  }

  private async resolvePendingConversion(
    telegramUserId: bigint
  ): Promise<PendingConversion | null> {
    const attribution = await prisma.attribution.findUnique({
      where: {
        telegramUserId
      },
      select: {
        click: {
          select: {
            queryParams: true,
            ip: true,
            userAgent: true
          }
        }
      }
    });

    if (!attribution?.click) {
      return null;
    }

    const queryParams = parseClickQueryParams(attribution.click.queryParams);

    if (!queryParams) {
      return null;
    }

    const subid = getStringQueryParam(queryParams, "subid");
    const ttpixelid = getStringQueryParam(queryParams, "ttpixelid");

    if (!subid && !ttpixelid) {
      return null;
    }

    return {
      telegramUserId,
      subid,
      ttpixelid,
      ttclid: getStringQueryParam(queryParams, "ttclid"),
      _ttp: getStringQueryParam(queryParams, "_ttp"),
      ip: attribution.click.ip,
      userAgent: attribution.click.userAgent
    };
  }

  private async sendConversion(conversion: PendingConversion, amountUsd: number) {
    if (conversion.subid) {
      await keitaroService.sendLeadPostback(conversion.subid, "deposit", amountUsd);
    }

    if (conversion.ttpixelid && conversion.ttclid) {
      await tikTokEventsService.sendPurchaseEvent({
        telegramUserId: conversion.telegramUserId,
        pixelId: conversion.ttpixelid,
        ttclid: conversion.ttclid,
        _ttp: conversion._ttp,
        ip: conversion.ip,
        userAgent: conversion.userAgent,
        value: amountUsd,
        currency: "USD"
      });
    }
  }
}

export const telegramManagerBotRuntime = new TelegramManagerBotRuntime();

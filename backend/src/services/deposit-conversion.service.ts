import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import {
  getStringQueryParam,
  parseClickQueryParams
} from "../utils/click-query-params";
import { AppError } from "../utils/app-error";
import { keitaroService } from "./keitaro.service";
import { googleEventsService } from "./google-events.service";
import { tikTokEventsService } from "./tiktok-events.service";

type RecordDepositInput = {
  attributionId: string;
  telegramUserId: bigint;
  amountUsd: number;
};

export type DepositBuyerChatThread = {
  trackerId: string;
  peerType: "chat" | "user";
  peerId: string;
};

type ListRecentInput =
  | { limit: number; telegramUserId: bigint }
  | { limit: number };

type IncomingThreadRow = {
  fromTelegramUserId: bigint;
  tracked_account_id: string;
  chat_telegram_id: bigint | null;
};

export type DepositConversionAttribution = {
  attributionId: string;
  telegramUserId: bigint;
  subid: string | null;
  ttpixelid: string | null;
  ttclid: string | null;
  _ttp: string | null;
  gapixelid: string | null;
  gclid: string | null;
  _ga: string | null;
  ip: string | null;
  userAgent: string | null;
};

export class DepositConversionService {
  public async recordDeposit(input: RecordDepositInput) {
    return prisma.depositConversion.create({
      data: {
        attributionId: input.attributionId,
        telegramUserId: input.telegramUserId,
        amountUsd: new Prisma.Decimal(input.amountUsd)
      }
    });
  }

  public async findAttributionForTelegramUser(
    telegramUserId: bigint
  ): Promise<DepositConversionAttribution | null> {
    const attribution = await prisma.attribution.findUnique({
      where: {
        telegramUserId
      },
      select: {
        id: true,
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
    const gapixelid = getStringQueryParam(queryParams, "gapixelid");

    if (!subid && !ttpixelid && !gapixelid) {
      return null;
    }

    return {
      attributionId: attribution.id,
      telegramUserId,
      subid,
      ttpixelid,
      ttclid: getStringQueryParam(queryParams, "ttclid"),
      _ttp: getStringQueryParam(queryParams, "_ttp"),
      gapixelid,
      gclid: getStringQueryParam(queryParams, "gclid"),
      _ga: getStringQueryParam(queryParams, "_ga"),
      ip: attribution.click.ip,
      userAgent: attribution.click.userAgent
    };
  }

  public async sendAndRecordDeposit(
    conversion: DepositConversionAttribution,
    amountUsd: number
  ) {
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

    if (conversion.gapixelid && conversion.gclid) {
      await googleEventsService.sendPurchaseEvent({
        telegramUserId: conversion.telegramUserId,
        pixelId: conversion.gapixelid,
        gclid: conversion.gclid,
        _ga: conversion._ga,
        ip: conversion.ip,
        userAgent: conversion.userAgent,
        value: amountUsd,
        currency: "USD"
      });
    }

    return this.recordDeposit({
      attributionId: conversion.attributionId,
      telegramUserId: conversion.telegramUserId,
      amountUsd
    });
  }

  public async createManualDeposit(input: {
    telegramUserId: bigint;
    amountUsd: number;
  }) {
    const conversion = await this.findAttributionForTelegramUser(input.telegramUserId);

    if (!conversion) {
      throw new AppError("Атрибуция для этого Telegram ID не найдена", 404);
    }

    return this.sendAndRecordDeposit(conversion, input.amountUsd);
  }

  public async findLatestThreadsForTelegramUsers(
    userIds: bigint[]
  ): Promise<Map<string, DepositBuyerChatThread>> {
    const out = new Map<string, DepositBuyerChatThread>();
    if (userIds.length === 0) {
      return out;
    }

    const unique = [...new Set(userIds.map((id) => id.toString()))].map((s) => BigInt(s));

    const rows = await prisma.$queryRaw<IncomingThreadRow[]>(
      Prisma.sql`
        SELECT DISTINCT ON (m.from_telegram_user_id)
          m.from_telegram_user_id AS "fromTelegramUserId",
          m.tracked_account_id,
          m.chat_telegram_id
        FROM incoming_messages m
        WHERE m.from_telegram_user_id IN (${Prisma.join(unique)})
        ORDER BY m.from_telegram_user_id, m.received_at DESC
      `
    );

    for (const row of rows) {
      const key = row.fromTelegramUserId.toString();
      const peerType = row.chat_telegram_id != null ? ("chat" as const) : ("user" as const);
      const peerId = (row.chat_telegram_id ?? row.fromTelegramUserId).toString();
      out.set(key, {
        trackerId: row.tracked_account_id,
        peerType,
        peerId
      });
    }

    return out;
  }

  public async listRecent(input: ListRecentInput) {
    const { limit } = input;

    return prisma.depositConversion.findMany({
      ...("telegramUserId" in input ? { where: { telegramUserId: input.telegramUserId } } : {}),
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        attributionId: true,
        telegramUserId: true,
        amountUsd: true,
        createdAt: true,
        attribution: {
          select: {
            clickUuid: true
          }
        }
      }
    });
  }
}

export const depositConversionService = new DepositConversionService();

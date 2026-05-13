import { prisma } from "../config/prisma";
import {
  getStringQueryParam,
  parseClickQueryParams
} from "../utils/click-query-params";
import { AppError } from "../utils/app-error";
import { keitaroService } from "./keitaro.service";

type TrashConversionAttribution = {
  attributionId: string;
  telegramUserId: bigint;
  subid: string | null;
  isTrash: boolean;
  trashMarkedAt: Date | null;
};

type TrashStatus = {
  isTrash: boolean;
  trashMarkedAt: Date | null;
};

type AttributionTrashDelegate = {
  findUnique(args: {
    where: { telegramUserId: bigint };
    select: {
      id?: boolean;
      isTrash?: boolean;
      trashMarkedAt?: boolean;
      click?: {
        select: {
          queryParams: boolean;
        };
      };
    };
  }): Promise<{
    id?: string;
    isTrash?: boolean;
    trashMarkedAt?: Date | null;
    click?: { queryParams: unknown } | null;
  } | null>;
  update(args: {
    where: { id: string };
    data: {
      isTrash: boolean;
      trashMarkedAt: Date;
    };
    select: {
      isTrash: boolean;
      trashMarkedAt: boolean;
    };
  }): Promise<TrashStatus>;
};

const attributionTrashDelegate =
  prisma.attribution as unknown as AttributionTrashDelegate;

export class TrashConversionService {
  public async findAttributionForTelegramUser(
    telegramUserId: bigint
  ): Promise<TrashConversionAttribution | null> {
    const attribution = await attributionTrashDelegate.findUnique({
      where: {
        telegramUserId
      },
      select: {
        id: true,
        isTrash: true,
        trashMarkedAt: true,
        click: {
          select: {
            queryParams: true
          }
        }
      }
    });

    if (!attribution?.id || !attribution.click) {
      return null;
    }

    const queryParams = parseClickQueryParams(attribution.click.queryParams);

    if (!queryParams) {
      return null;
    }

    const subid = getStringQueryParam(queryParams, "subid");

    return {
      attributionId: attribution.id,
      telegramUserId,
      subid,
      isTrash: Boolean(attribution.isTrash),
      trashMarkedAt: attribution.trashMarkedAt ?? null
    };
  }

  public async getTrashStatus(telegramUserId: bigint): Promise<TrashStatus> {
    const attribution = await attributionTrashDelegate.findUnique({
      where: {
        telegramUserId
      },
      select: {
        isTrash: true,
        trashMarkedAt: true
      }
    });

    return {
      isTrash: Boolean(attribution?.isTrash),
      trashMarkedAt: attribution?.trashMarkedAt ?? null
    };
  }

  public async sendAndMarkTrash(telegramUserId: bigint): Promise<TrashStatus> {
    const conversion = await this.findAttributionForTelegramUser(telegramUserId);

    if (!conversion) {
      throw new AppError("Атрибуция для этого Telegram ID не найдена", 404);
    }

    if (conversion.isTrash) {
      return {
        isTrash: true,
        trashMarkedAt: conversion.trashMarkedAt
      };
    }

    if (!conversion.subid) {
      throw new AppError("Subid для этого Telegram ID не найден", 404);
    }

    await keitaroService.sendLeadPostback(conversion.subid, "trash");

    return attributionTrashDelegate.update({
      where: {
        id: conversion.attributionId
      },
      data: {
        isTrash: true,
        trashMarkedAt: new Date()
      },
      select: {
        isTrash: true,
        trashMarkedAt: true
      }
    });
  }
}

export const trashConversionService = new TrashConversionService();

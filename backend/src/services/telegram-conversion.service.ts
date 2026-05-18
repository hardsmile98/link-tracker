import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { getStringQueryParam, parseClickQueryParams } from "../utils/click-query-params";
import { keitaroService } from "./keitaro.service";
import { googleEventsService } from "./google-events.service";
import { tikTokEventsService } from "./tiktok-events.service";

class TelegramConversionService {
  public async processFirstMessage(accountId: string, senderId: bigint) {
    const incomingMessagesCount = await prisma.incomingMessage.count({
      where: {
        trackedAccountId: accountId,
        fromTelegramUserId: senderId
      }
    });

    if (incomingMessagesCount > 0) {
      return;
    }

    const attribution = await prisma.attribution.findUnique({
      where: {
        telegramUserId: senderId
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
      logger.warn({ accountId, senderId }, "No attribution found for first message conversion");
      return;
    }

    const queryParams = parseClickQueryParams(attribution.click.queryParams);

    if (!queryParams) {
      return;
    }

    const subid = getStringQueryParam(queryParams, "subid");
    const ttpixelid = getStringQueryParam(queryParams, "ttpixelid");
    const ttclid = getStringQueryParam(queryParams, "ttclid");
    const _ttp = getStringQueryParam(queryParams, "_ttp");
    const gapixelid = getStringQueryParam(queryParams, "gapixelid");
    const gclid = getStringQueryParam(queryParams, "gclid");
    const _ga = getStringQueryParam(queryParams, "_ga");

    if (!subid && !(ttpixelid && ttclid) && !(gapixelid && gclid)) {
      return;
    }

    logger.info(
      { accountId, senderId, subid, ttpixelid, ttclid, gapixelid, gclid },
      "Sending first message conversions"
    );

    const tasks: Promise<void>[] = [];

    if (subid) {
      tasks.push(keitaroService.sendLeadPostback(subid, "registration"));
    }

    if (ttpixelid && ttclid) {
      tasks.push(
        tikTokEventsService.sendContactEvent({
          telegramUserId: senderId,
          pixelId: ttpixelid,
          ttclid,
          _ttp,
          ip: attribution.click.ip,
          userAgent: attribution.click.userAgent
        })
      );
    }

    if (gapixelid && gclid) {
      tasks.push(
        googleEventsService.sendContactEvent({
          telegramUserId: senderId,
          pixelId: gapixelid,
          gclid,
          _ga,
          ip: attribution.click.ip,
          userAgent: attribution.click.userAgent
        })
      );
    }

    await Promise.all(tasks);
  }
}

export const telegramConversionService = new TelegramConversionService();

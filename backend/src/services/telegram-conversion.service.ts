import { prisma } from '../config/prisma';
import { getStringQueryParam, parseClickQueryParams } from '../utils/click-query-params';
import { keitaroService } from './keitaro.service';
import { tikTokEventsService } from './tiktok-events.service';
import { logger } from '../config/logger';

class TelegramConversionService {
  public async processFirstMessage(accountId: string, senderId: bigint) {
    const incomingMessagesCount = await prisma.incomingMessage.count({
        where: {
          trackedAccountId: accountId,
          fromTelegramUserId: senderId,
        },
      });

    const isFirstMessage = incomingMessagesCount === 0;

    if (!isFirstMessage) {
      logger.info({ accountId, senderId }, 'Not first message');

      return;
    }

    const attribution = await prisma.attribution.findUnique({
      where: {
        telegramUserId: senderId,
      },
      select: {
        click: {
          select: {
            queryParams: true,
            ip: true,
            userAgent: true,
          },
        },
      },
    });

    if (!attribution?.click) {
      logger.warn({ accountId, senderId }, 'No attribution found');

      return;
    }

    const queryParams = parseClickQueryParams(attribution.click.queryParams);

    if (!queryParams) {
      logger.warn({ accountId, senderId }, 'No query params found');

      return;
    }

    const subid = getStringQueryParam(queryParams, 'subid');
    const ttpixelid = getStringQueryParam(queryParams, 'ttpixelid');
    const ttclid = getStringQueryParam(queryParams, 'ttclid');
    const _ttp = getStringQueryParam(queryParams, '_ttp');

    logger.info({ accountId, senderId, subid, ttpixelid, ttclid, _ttp }, 'Query params found');
  
    if (subid) {
      logger.info({ accountId, senderId, subid }, 'Sending lead postback');

      await keitaroService.sendLeadPostback(subid, 'lead');
    }

    if (ttpixelid && ttclid) {
      logger.info({ accountId, senderId, ttpixelid }, 'Sending contact event');

      await tikTokEventsService.sendContactEvent({
        telegramUserId: senderId,
        pixelId: ttpixelid,
        ttclid,
        _ttp,
        ip: attribution.click.ip,
        userAgent: attribution.click.userAgent,
      });
    }
  }
}

export const telegramConversionService = new TelegramConversionService();

import { prisma } from '../config/prisma';
import { getStringQueryParam, parseClickQueryParams } from '../utils/click-query-params';
import { facebookConversionsService } from './facebook-conversions.service';
import { keitaroService } from './keitaro.service';
import { tikTokEventsService } from './tiktok-events.service';

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
      return;
    }

    const queryParams = parseClickQueryParams(attribution.click.queryParams);

    if (!queryParams) {
      return;
    }

    const subid = getStringQueryParam(queryParams, 'subid');
    const ttpixelid = getStringQueryParam(queryParams, 'ttpixelid');
    const ttclid = getStringQueryParam(queryParams, 'ttclid');
    const _ttp = getStringQueryParam(queryParams, '_ttp');
  
    if (subid) {
      await keitaroService.sendLeadPostback(subid, 'lead');
    }

    if (ttpixelid) {
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

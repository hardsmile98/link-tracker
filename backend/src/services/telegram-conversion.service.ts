import { prisma } from '../config/prisma';
import { facebookConversionsService } from './facebook-conversions.service';
import { keitaroService } from './keitaro.service';
import { tikTokEventsService } from './tiktok-events.service';

type ClickQueryParams = Record<string, string | string[]>;

class TelegramConversionService {
  private getStringQueryParam(
    params: ClickQueryParams,
    key: string,
  ): string | null {
    const value = params[key];

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }

    return null;
  }

  private parseClickQueryParams(raw: unknown): ClickQueryParams | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }

    const result: ClickQueryParams = {};

    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string') {
        result[key] = value;
        continue;
      }

      if (Array.isArray(value)) {
        const normalized = value.filter(
          (item): item is string => typeof item === 'string',
        );

        if (normalized.length > 0) {
          result[key] = normalized;
        }
      }
    }

    return result;
  }

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

    const queryParams = this.parseClickQueryParams(attribution.click.queryParams);

    if (!queryParams) {
      return;
    }

    const subid = this.getStringQueryParam(queryParams, 'subid');
    const ttpixelid = this.getStringQueryParam(queryParams, 'ttpixelid');
    const ttclid = this.getStringQueryParam(queryParams, 'ttclid');
    const _ttp = this.getStringQueryParam(queryParams, '_ttp');
  
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

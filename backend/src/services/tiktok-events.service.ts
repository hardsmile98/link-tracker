import { logger } from '../config/logger';
import { prisma } from '../config/prisma';

class TikTokEventsService {
  public async sendContactEvent(input: {
    telegramUserId: bigint;
    pixelId: string;
    ttclid: string | null;
    _ttp: string | null;
    ip: string | null;
    userAgent: string | null;
  }) {
    const { telegramUserId, pixelId, ttclid, _ttp, ip, userAgent } = input;
  
    const adAccount = await prisma.adAccount.findFirst({
      where: {
        platform: 'tiktok',
        pixelId,
      },
      select: {
        accessKey: true,
        pixelId: true,
      },
    });

    if (!adAccount) {
      logger.warn(
        { pixelId },
        'TikTok ad account not found',
      );
      return;
    }

    try {
      const response = await fetch(
        'https://business-api.tiktok.com/open_api/v1.3/event/track/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Access-Token': adAccount.accessKey,
          },
          body: JSON.stringify({
            event_source: 'web',
            event_source_id: adAccount.pixelId,
            data: [
              {
                event: 'Contact',
                event_time: Math.floor(Date.now() / 1000),
                event_id: `${telegramUserId}:${Date.now()}:contact`,
                user: {
                  ttclid,
                  ttp: _ttp ?? undefined,
                  external_id: telegramUserId.toString(),
                  ip: ip ?? undefined,
                  user_agent: userAgent ?? undefined,
                },
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        logger.warn(
          {
            status: response.status,
            statusText: response.statusText,
            pixelId,
          },
          'TikTok events API returned non-OK status',
        );
      }
    } catch (error) {
      logger.warn(
        { err: error, pixelId },
        'Failed to send TikTok contact event',
      );
    }
  }
}

export const tikTokEventsService = new TikTokEventsService();

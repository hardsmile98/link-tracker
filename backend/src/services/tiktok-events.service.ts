import { logger } from '../config/logger';
import { prisma } from '../config/prisma';

class TikTokEventsService {
  private async sendEvent(input: {
    event: "Contact" | "Purchase";
    eventSuffix: "contact" | "purchase";
    telegramUserId: bigint;
    pixelId: string;
    ttclid: string | null;
    _ttp: string | null;
    ip: string | null;
    userAgent: string | null;
    value?: number;
    currency?: string;
  }) {
    const {
      event,
      eventSuffix,
      telegramUserId,
      pixelId,
      ttclid,
      _ttp,
      ip,
      userAgent,
      value,
      currency
    } = input;

    const adAccount = await prisma.adAccount.findFirst({
      where: {
        platform: "tiktok",
        pixelId
      },
      select: {
        accessKey: true,
        pixelId: true
      }
    });

    if (!adAccount) {
      logger.warn({ pixelId }, "TikTok ad account not found");
      return;
    }

    try {
      const response = await fetch(
        "https://business-api.tiktok.com/open_api/v1.3/event/track/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Access-Token": adAccount.accessKey
          },
          body: JSON.stringify({
            event_source: "web",
            event_source_id: adAccount.pixelId,
            data: [
              {
                event,
                event_time: Math.floor(Date.now() / 1000),
                event_id: `${telegramUserId}:${Date.now()}:${eventSuffix}`,
                user: {
                  ttclid,
                  ttp: _ttp ?? undefined,
                  external_id: telegramUserId.toString(),
                  ip: ip ?? undefined,
                  user_agent: userAgent ?? undefined
                },
                properties:
                  value !== undefined
                    ? {
                        value,
                        currency: currency ?? "USD"
                      }
                    : undefined
              }
            ]
          })
        }
      );

      if (!response.ok) {
        logger.warn(
          {
            status: response.status,
            statusText: response.statusText,
            pixelId,
            event
          },
          "TikTok events API returned non-OK status"
        );
      }
    } catch (error) {
      logger.warn(
        { err: error, pixelId, event },
        "Failed to send TikTok event"
      );
    }
  }

  public async sendContactEvent(input: {
    telegramUserId: bigint;
    pixelId: string;
    ttclid: string | null;
    _ttp: string | null;
    ip: string | null;
    userAgent: string | null;
  }) {
    const { telegramUserId, pixelId, ttclid, _ttp, ip, userAgent } = input;

    await this.sendEvent({
      event: "Contact",
      eventSuffix: "contact",
      telegramUserId,
      pixelId,
      ttclid,
      _ttp,
      ip,
      userAgent
    });
  }

  public async sendPurchaseEvent(input: {
    telegramUserId: bigint;
    pixelId: string;
    ttclid: string | null;
    _ttp: string | null;
    ip: string | null;
    userAgent: string | null;
    value: number;
    currency: string;
  }) {
    const { telegramUserId, pixelId, ttclid, _ttp, ip, userAgent, value, currency } =
      input;

    await this.sendEvent({
      event: "Purchase",
      eventSuffix: "purchase",
      telegramUserId,
      pixelId,
      ttclid,
      _ttp,
      ip,
      userAgent,
      value,
      currency
    });
  }
}

export const tikTokEventsService = new TikTokEventsService();

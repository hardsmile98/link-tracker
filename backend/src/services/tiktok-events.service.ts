import { logger } from '../config/logger';
import { prisma } from '../config/prisma';

class TikTokEventsService {
  private async sendEvent(input: {
    event: "Contact" | "Lead" | "Purchase";
    eventSuffix: "contact" | "lead" | "purchase";
    externalId: string;
    pixelId: string;
    ttclid: string | null;
    _ttp: string | null;
    ip: string | null;
    userAgent: string | null;
    value?: number;
    currency?: string;
  }): Promise<boolean> {
    const {
      event,
      eventSuffix,
      externalId,
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
      return false;
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
                event_id: `${externalId}:${eventSuffix}`,
                user: {
                  ttclid,
                  ttp: _ttp ?? undefined,
                  external_id: externalId,
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
        return false;
      }

      return true;
    } catch (error) {
      logger.warn(
        { err: error, pixelId, event },
        "Failed to send TikTok event"
      );
      return false;
    }
  }

  public async sendLeadEvent(input: {
    clickId: string;
    pixelId: string;
    ttclid: string | null;
    _ttp: string | null;
    ip: string | null;
    userAgent: string | null;
  }): Promise<boolean> {
    const { clickId, pixelId, ttclid, _ttp, ip, userAgent } = input;

    return this.sendEvent({
      event: "Lead",
      eventSuffix: "lead",
      externalId: clickId,
      pixelId,
      ttclid,
      _ttp,
      ip,
      userAgent
    });
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

    return this.sendEvent({
      event: "Contact",
      eventSuffix: "contact",
      externalId: telegramUserId.toString(),
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

    return this.sendEvent({
      event: "Purchase",
      eventSuffix: "purchase",
      externalId: telegramUserId.toString(),
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

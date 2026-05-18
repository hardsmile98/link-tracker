import { logger } from "../config/logger";
import { prisma } from "../config/prisma";

type GoogleEventName = "generate_lead" | "working_lead" | "purchase";

class GoogleEventsService {
  private parseClientId(_ga: string | null, fallbackId: string): string {
    if (!_ga) {
      return fallbackId;
    }

    const parts = _ga.split(".");

    if (parts.length >= 4) {
      return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    }

    return fallbackId;
  }

  private async sendEvent(input: {
    eventName: GoogleEventName;
    eventSuffix: "lead" | "contact" | "purchase";
    externalId: string;
    pixelId: string;
    gclid: string | null;
    _ga: string | null;
    ip: string | null;
    userAgent: string | null;
    value?: number;
    currency?: string;
  }) {
    const {
      eventName,
      eventSuffix,
      externalId,
      pixelId,
      gclid,
      _ga,
      ip,
      userAgent,
      value,
      currency
    } = input;

    const adAccount = await prisma.adAccount.findFirst({
      where: {
        platform: "google",
        pixelId
      },
      select: {
        accessKey: true,
        pixelId: true
      }
    });

    if (!adAccount) {
      logger.warn({ pixelId }, "Google ad account not found");
      return;
    }

    const params: Record<string, string | number> = {
      event_id: `${externalId}:${eventSuffix}`,
      engagement_time_msec: 1
    };

    if (gclid) {
      params.gclid = gclid;
    }

    if (eventName === "purchase" && value !== undefined) {
      params.value = value;
      params.currency = currency ?? "USD";
      params.transaction_id = `${externalId}:purchase`;
    }

    const body: Record<string, unknown> = {
      client_id: this.parseClientId(_ga, externalId),
      user_id: externalId,
      events: [
        {
          name: eventName,
          params
        }
      ]
    };

    if (userAgent) {
      body.device = { user_agent: userAgent };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (ip) {
      headers["X-Ga-Mp-User-Ip"] = ip;
    }

    const url = new URL("https://www.google-analytics.com/mp/collect");
    url.searchParams.set("measurement_id", adAccount.pixelId);
    url.searchParams.set("api_secret", adAccount.accessKey);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        logger.warn(
          {
            status: response.status,
            statusText: response.statusText,
            pixelId,
            eventName
          },
          "Google Analytics Measurement Protocol returned non-OK status"
        );
      }
    } catch (error) {
      logger.warn(
        { err: error, pixelId, eventName },
        "Failed to send Google event"
      );
    }
  }

  public async sendLeadEvent(input: {
    clickId: string;
    pixelId: string;
    gclid: string | null;
    _ga: string | null;
    ip: string | null;
    userAgent: string | null;
  }) {
    const { clickId, pixelId, gclid, _ga, ip, userAgent } = input;

    await this.sendEvent({
      eventName: "generate_lead",
      eventSuffix: "lead",
      externalId: clickId,
      pixelId,
      gclid,
      _ga,
      ip,
      userAgent
    });
  }

  public async sendContactEvent(input: {
    telegramUserId: bigint;
    pixelId: string;
    gclid: string | null;
    _ga: string | null;
    ip: string | null;
    userAgent: string | null;
  }) {
    const { telegramUserId, pixelId, gclid, _ga, ip, userAgent } = input;

    await this.sendEvent({
      eventName: "working_lead",
      eventSuffix: "contact",
      externalId: telegramUserId.toString(),
      pixelId,
      gclid,
      _ga,
      ip,
      userAgent
    });
  }

  public async sendPurchaseEvent(input: {
    telegramUserId: bigint;
    pixelId: string;
    gclid: string | null;
    _ga: string | null;
    ip: string | null;
    userAgent: string | null;
    value: number;
    currency: string;
  }) {
    const { telegramUserId, pixelId, gclid, _ga, ip, userAgent, value, currency } =
      input;

    await this.sendEvent({
      eventName: "purchase",
      eventSuffix: "purchase",
      externalId: telegramUserId.toString(),
      pixelId,
      gclid,
      _ga,
      ip,
      userAgent,
      value,
      currency
    });
  }
}

export const googleEventsService = new GoogleEventsService();

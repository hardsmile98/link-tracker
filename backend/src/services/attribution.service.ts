import { prisma } from "../config/prisma";

type LinkAttributionInput = {
  clickUuid: string | null;
  telegramUserId: bigint;
};

const formatReferrer = (referrer: string | null): string | null => {
  if (!referrer) {
    return null;
  }

  try {
    const url = new URL(referrer);

    return `${url.origin}${url.pathname}`;
  } catch (error) {
    return null;
  }
};

export class AttributionService {
  private async resolveRedirectUrl(referrer: string | null) {
    const formattedReferrer = formatReferrer(referrer);

    if (formattedReferrer) {

      const matchedRule = await prisma.redirectRule.findUnique({
        where: { referrer: formattedReferrer },
        select: { redirectUrl: true }
      });

      if (matchedRule) {
        return matchedRule.redirectUrl;
      }
    }

    const fallbackRule = await prisma.redirectRule.findFirst({
      where: { referrer: null },
      orderBy: { createdAt: "desc" },
      select: { redirectUrl: true }
    });

    return fallbackRule?.redirectUrl;
  }

  public async linkAttribution(input: LinkAttributionInput) {
    const existingAttribution = await prisma.attribution.findUnique({
      where: {
        telegramUserId: input.telegramUserId
      }
    });

    let validClickUuid: string | null = null;
    let clickReferrer: string | null = null;
  
    if (input.clickUuid) {
      const click = await prisma.click.findUnique({
        where: { id: input.clickUuid },
        select: { id: true, referrer: true }
      });

      if (click) {
        validClickUuid = click.id;
        clickReferrer = click.referrer ?? null;
      }
    }

    const redirectUrl = await this.resolveRedirectUrl(clickReferrer);

    if (!existingAttribution) {
      const attribution = await prisma.attribution.create({
        data: {
          clickUuid: validClickUuid,
          telegramUserId: input.telegramUserId
        }
      });

      return {
        attribution,
        redirectUrl
      };
    }

    if (validClickUuid) {
      const attribution = await prisma.attribution.update({
        where: { id: existingAttribution.id },
        data: { clickUuid: validClickUuid }
      });

      return {
        attribution,
        redirectUrl
      };
    }

    return {
      attribution: existingAttribution,
      redirectUrl
    };
  }
}

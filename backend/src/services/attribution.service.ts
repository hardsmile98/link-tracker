import { prisma } from "../config/prisma";

type LinkAttributionInput = {
  clickUuid: string | null;
  telegramUserId: bigint;
};

export class AttributionService {
  public async linkAttribution(input: LinkAttributionInput) {
    const existingAttribution = await prisma.attribution.findUnique({
      where: {
        telegramUserId: input.telegramUserId
      }
    });

    let validClickUuid: string | null = null;
  
    if (input.clickUuid) {
      const click = await prisma.click.findUnique({
        where: { id: input.clickUuid },
        select: { id: true }
      });

      if (click) {
        validClickUuid = click.id;
      }
    }

    if (!existingAttribution) {
      return prisma.attribution.create({
        data: {
          clickUuid: validClickUuid,
          telegramUserId: input.telegramUserId
        }
      });
    }

    if (validClickUuid) {
      return prisma.attribution.update({
        where: { id: existingAttribution.id },
        data: { clickUuid: validClickUuid }
      });
    }

    return existingAttribution;
  }
}

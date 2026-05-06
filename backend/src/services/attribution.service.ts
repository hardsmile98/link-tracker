import { prisma } from "../config/prisma";
import { AppError } from "../utils/app-error";

type LinkAttributionInput = {
  clickUuid: string;
  telegramUserId: bigint;
};

export class AttributionService {
  public async linkAttribution(input: LinkAttributionInput) {
    const click = await prisma.click.findUnique({
      where: { id: input.clickUuid },
      select: { id: true }
    });

    if (!click) {
      throw new AppError("click_id not found", 404);
    }

    const attribution = await prisma.attribution.upsert({
      where: {
        clickUuid_telegramUserId: {
          clickUuid: input.clickUuid,
          telegramUserId: input.telegramUserId
        }
      },
      create: {
        clickUuid: input.clickUuid,
        telegramUserId: input.telegramUserId
      },
      update: {}
    });

    return attribution;
  }

  public async getAttributionHistory(telegramUserId: bigint) {
    return prisma.attribution.findMany({
      where: { telegramUserId },
      orderBy: { createdAt: "desc" },
      include: {
        click: true
      }
    });
  }
}

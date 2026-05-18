import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/app-error";

type CreateRedirectRuleInput = {
  name: string;
  referrer: string | null;
  redirectUrl: string;
};

type UpdateRedirectRuleInput = {
  id: string;
  name?: string;
  referrer?: string | null;
  redirectUrl?: string;
};

export class RedirectRuleService {
  public async listRules() {
    return prisma.redirectRule.findMany({
      orderBy: [{ referrer: "asc" }, { createdAt: "desc" }]
    });
  }

  public async createRule(input: CreateRedirectRuleInput) {
    await this.ensureSingleFallback(input.referrer, null);

    try {
      return await prisma.redirectRule.create({
        data: {
          name: input.name,
          referrer: input.referrer,
          redirectUrl: input.redirectUrl
        }
      });
    } catch (error) {
      this.handlePrismaError(error);
      throw error;
    }
  }

  public async updateRule(input: UpdateRedirectRuleInput) {
    const existingRule = await prisma.redirectRule.findUnique({
      where: { id: input.id }
    });

    if (!existingRule) {
      throw new AppError("Redirect rule not found", 404);
    }

    const nextReferrer = input.referrer !== undefined ? input.referrer : existingRule.referrer;

    await this.ensureSingleFallback(nextReferrer, existingRule.id);

    const data: { name?: string; referrer?: string | null; redirectUrl?: string } = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }

    if (input.referrer !== undefined) {
      data.referrer = input.referrer;
    }

    if (input.redirectUrl !== undefined) {
      data.redirectUrl = input.redirectUrl;
    }

    try {
      return await prisma.redirectRule.update({
        where: { id: input.id },
        data
      });
    } catch (error) {
      this.handlePrismaError(error);
      throw error;
    }
  }

  public async deleteRule(id: string) {
    try {
      return await prisma.redirectRule.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Redirect rule not found", 404);
      }

      throw error;
    }
  }

  private async ensureSingleFallback(referrer: string | null, currentRuleId: string | null) {
    if (referrer !== null) {
      return;
    }

    const existingFallback = await prisma.redirectRule.findFirst({
      where: {
        referrer: null,
        ...(currentRuleId ? { id: { not: currentRuleId } } : {})
      },
      select: { id: true }
    });

    if (existingFallback) {
      throw new AppError("Fallback redirect rule already exists", 409);
    }
  }

  private handlePrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("Redirect rule with this referrer already exists", 409);
    }
  }
}

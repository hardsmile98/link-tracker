import { AdAccountPlatform, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/app-error";

type CreateAdAccountInput = {
  platform: AdAccountPlatform;
  name: string;
  pixelId: string;
  accessKey: string;
};

type UpdateAdAccountInput = {
  id: string;
  platform?: AdAccountPlatform;
  name?: string;
  pixelId?: string;
  accessKey?: string;
};

export class AdAccountService {
  public async listAccounts() {
    return prisma.adAccount.findMany({
      orderBy: [{ platform: "asc" }, { createdAt: "desc" }]
    });
  }

  public async createAccount(input: CreateAdAccountInput) {
    return prisma.adAccount.create({
      data: input
    });
  }

  public async updateAccount(input: UpdateAdAccountInput) {
    const data: {
      platform?: AdAccountPlatform;
      name?: string;
      pixelId?: string;
      accessKey?: string;
    } = {};

    if (input.platform !== undefined) {
      data.platform = input.platform;
    }
    if (input.name !== undefined) {
      data.name = input.name;
    }
    if (input.pixelId !== undefined) {
      data.pixelId = input.pixelId;
    }
    if (input.accessKey !== undefined) {
      data.accessKey = input.accessKey;
    }

    try {
      return await prisma.adAccount.update({
        where: { id: input.id },
        data
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Ad account not found", 404);
      }

      throw error;
    }
  }

  public async deleteAccount(id: string) {
    try {
      return await prisma.adAccount.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Ad account not found", 404);
      }

      throw error;
    }
  }
}

import { AdAccountPlatform } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import { AdAccountService } from "../services/ad-account.service";

const adAccountService = new AdAccountService();

const platformSchema = z.enum(AdAccountPlatform);

const createAdAccountSchema = z.object({
  platform: platformSchema,
  name: z.string().trim().min(1),
  pixel_id: z.string().trim().min(1),
  access_key: z.string().trim().min(1)
});

const updateAdAccountSchema = z
  .object({
    platform: platformSchema.optional(),
    name: z.string().trim().min(1).optional(),
    pixel_id: z.string().trim().min(1).optional(),
    access_key: z.string().trim().min(1).optional()
  })
  .refine(
    (value) =>
      value.platform !== undefined ||
      value.name !== undefined ||
      value.pixel_id !== undefined ||
      value.access_key !== undefined,
    {
      message: "At least one field is required"
    }
  );

const idParamsSchema = z.object({
  id: z.uuid()
});

function mapAdAccount(account: {
  id: string;
  platform: AdAccountPlatform;
  name: string;
  pixelId: string;
  accessKey: string;
  createdAt: Date;
}) {
  return {
    id: account.id,
    platform: account.platform,
    name: account.name,
    pixel_id: account.pixelId,
    access_key: account.accessKey,
    created_at: account.createdAt
  };
}

export async function listAdAccounts(_req: Request, res: Response) {
  const accounts = await adAccountService.listAccounts();

  res.json({
    success: true,
    data: accounts.map(mapAdAccount)
  });
}

export async function createAdAccount(req: Request, res: Response) {
  const payload = createAdAccountSchema.parse(req.body);

  const account = await adAccountService.createAccount({
    platform: payload.platform,
    name: payload.name,
    pixelId: payload.pixel_id,
    accessKey: payload.access_key
  });

  res.status(201).json({
    success: true,
    data: mapAdAccount(account)
  });
}

export async function updateAdAccount(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const payload = updateAdAccountSchema.parse(req.body);

  const input: {
    id: string;
    platform?: AdAccountPlatform;
    name?: string;
    pixelId?: string;
    accessKey?: string;
  } = { id };

  if (payload.platform !== undefined) {
    input.platform = payload.platform;
  }
  if (payload.name !== undefined) {
    input.name = payload.name;
  }
  if (payload.pixel_id !== undefined) {
    input.pixelId = payload.pixel_id;
  }
  if (payload.access_key !== undefined) {
    input.accessKey = payload.access_key;
  }

  const account = await adAccountService.updateAccount(input);

  res.json({
    success: true,
    data: mapAdAccount(account)
  });
}

export async function deleteAdAccount(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);

  await adAccountService.deleteAccount(id);

  res.status(204).send();
}

import { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { AttributionService } from "../services/attribution.service";
import { AppError } from "../utils/app-error";
import { parseInitData, verifyTelegramInitData } from "../utils/telegram";

const attributionService = new AttributionService();

const linkSchema = z.object({
  click_id: z.string().uuid().optional(),
  telegram_user_id: z.coerce.bigint(),
  init_data: z.string().min(1).optional()
});

const telegramUserSchema = z.object({
  id: z.coerce.bigint()
});

export async function linkAttribution(req: Request, res: Response) {
  const payload = linkSchema.parse(req.body);

  const initDataFromHeader = req.get("x-telegram-init-data");

  const initData = payload.init_data ?? initDataFromHeader;

  if (!initData) {
    throw new AppError("Missing Telegram initData", 400);
  }

  const isValidInitData = verifyTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);

  if (!isValidInitData) {
    throw new AppError("Invalid Telegram initData signature", 401);
  }

  const parsedInitData = parseInitData(initData);

  const userJson = parsedInitData.user;

  if (!userJson) {
    throw new AppError("Telegram initData does not contain user", 401);
  }

  const telegramUser = telegramUserSchema.parse(JSON.parse(userJson));

  if (telegramUser.id !== payload.telegram_user_id) {
    throw new AppError("telegram_user_id mismatch with Telegram initData", 401);
  }

  const clickIdFromStartParam = parsedInitData.start_param;

  const clickId = payload.click_id ?? clickIdFromStartParam;

  const result = await attributionService.linkAttribution({
    clickUuid: clickId ?? null,
    telegramUserId: payload.telegram_user_id
  });

  res.status(201).json({
    success: true,
    data: {
      id: result.attribution.id,
      redirect_url: result.redirectUrl
    }
  });
}
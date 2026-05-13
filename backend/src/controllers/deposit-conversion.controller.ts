import { Request, Response } from "express";
import { z } from "zod";
import { depositConversionService } from "../services/deposit-conversion.service";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  telegram_user_id: z
    .string()
    .regex(/^\d+$/, "telegram_user_id must be a positive integer string")
    .optional()
});

const createSchema = z.object({
  telegram_user_id: z
    .string()
    .regex(/^\d+$/, "telegram_user_id must be a positive integer string"),
  amount_usd: z.coerce.number().positive().finite()
});

function mapDepositConversion(row: {
  id: string;
  attributionId: string;
  telegramUserId: bigint;
  amountUsd: { toString(): string };
  createdAt: Date;
  attribution?: {
    clickUuid: string | null;
  } | null;
}) {
  return {
    id: row.id,
    attribution_id: row.attributionId,
    click_id: row.attribution?.clickUuid ?? null,
    telegram_user_id: row.telegramUserId.toString(),
    amount_usd: row.amountUsd.toString(),
    created_at: row.createdAt
  };
}

export async function listDepositConversions(req: Request, res: Response) {
  const query = listQuerySchema.parse(req.query);
  const limit = query.limit ?? 100;
  const telegramUserId =
    query.telegram_user_id !== undefined ? BigInt(query.telegram_user_id) : undefined;

  const rows = await depositConversionService.listRecent(
    telegramUserId !== undefined ? { limit, telegramUserId } : { limit }
  );

  const distinctUserIds =
    telegramUserId !== undefined
      ? [telegramUserId]
      : [...new Set(rows.map((r) => r.telegramUserId))];

  const threadByUser =
    await depositConversionService.findLatestThreadsForTelegramUsers(distinctUserIds);

  res.json({
    success: true,
    data: rows.map((row) => {
      const uid = row.telegramUserId.toString();
      const thread = threadByUser.get(uid) ?? null;

      return {
        ...mapDepositConversion(row),
        chat_thread:
          thread === null
            ? null
            : {
                tracker_id: thread.trackerId,
                peer_type: thread.peerType,
                peer_id: thread.peerId
              }
      };
    })
  });
}

export async function createDepositConversion(req: Request, res: Response) {
  const payload = createSchema.parse(req.body);
  const row = await depositConversionService.createManualDeposit({
    telegramUserId: BigInt(payload.telegram_user_id),
    amountUsd: payload.amount_usd
  });

  res.status(201).json({
    success: true,
    data: mapDepositConversion(row)
  });
}

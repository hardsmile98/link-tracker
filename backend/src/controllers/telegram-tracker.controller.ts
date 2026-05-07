import { Request, Response } from "express";
import { z } from "zod";
import { TelegramTrackerService } from "../services/telegram-tracker.service";

const telegramTrackerService = new TelegramTrackerService();

const startTrackerAuthSchema = z.object({
  label: z.string().trim().min(1),
  phone_number: z.string().trim().min(1)
});

const verifyTrackerCodeSchema = z.object({
  auth_session_id: z.uuid(),
  code: z.string().trim().min(1)
});

const verifyTrackerPasswordSchema = z.object({
  auth_session_id: z.uuid(),
  password: z.string().trim().min(1)
});

const updateTrackerSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    is_active: z.boolean().optional()
  })
  .refine(
    (value) => value.label !== undefined || value.is_active !== undefined,
    { message: "At least one field is required" }
  );

const idParamsSchema = z.object({
  id: z.uuid()
});

function mapTracker(tracker: {
  id: string;
  label: string;
  isActive: boolean;
  isRunning: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: tracker.id,
    label: tracker.label,
    is_active: tracker.isActive,
    is_running: tracker.isRunning,
    created_at: tracker.createdAt,
    updated_at: tracker.updatedAt
  };
}

export async function listTelegramTrackers(_req: Request, res: Response) {
  const trackers = await telegramTrackerService.listTrackers();

  res.json({
    success: true,
    data: trackers.map(mapTracker)
  });
}

export async function startTelegramTrackerAuth(req: Request, res: Response) {
  const payload = startTrackerAuthSchema.parse(req.body);

  const result = await telegramTrackerService.startTrackerAuth({
    label: payload.label,
    phoneNumber: payload.phone_number
  });

  res.status(201).json({
    success: true,
    data: {
      auth_session_id: result.authSessionId,
      next_step: "code",
      is_code_via_app: result.isCodeViaApp
    }
  });
}

export async function verifyTelegramTrackerCode(req: Request, res: Response) {
  const payload = verifyTrackerCodeSchema.parse(req.body);

  const result = await telegramTrackerService.verifyTrackerCode({
    authSessionId: payload.auth_session_id,
    code: payload.code
  });

  if (result.status === "PASSWORD_REQUIRED") {
    res.json({
      success: true,
      data: {
        auth_session_id: payload.auth_session_id,
        next_step: "password"
      }
    });
    return;
  }

  res.json({
    success: true,
    data: {
      next_step: "done",
      tracker: mapTracker(result.tracker)
    }
  });
}

export async function verifyTelegramTrackerPassword(req: Request, res: Response) {
  const payload = verifyTrackerPasswordSchema.parse(req.body);

  const tracker = await telegramTrackerService.verifyTrackerPassword({
    authSessionId: payload.auth_session_id,
    password: payload.password
  });

  res.json({
    success: true,
    data: {
      next_step: "done",
      tracker: mapTracker(tracker)
    }
  });
}

export async function updateTelegramTracker(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const payload = updateTrackerSchema.parse(req.body);

  const input: {
    id: string;
    label?: string;
    isActive?: boolean;
  } = { id };

  if (payload.label !== undefined) {
    input.label = payload.label;
  }
  if (payload.is_active !== undefined) {
    input.isActive = payload.is_active;
  }

  const tracker = await telegramTrackerService.updateTracker(input);

  res.json({
    success: true,
    data: mapTracker(tracker)
  });
}

export async function deleteTelegramTracker(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  await telegramTrackerService.deleteTracker(id);
  res.status(204).send();
}

export async function restartTelegramTracker(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const tracker = await telegramTrackerService.restartTracker(id);

  res.json({
    success: true,
    data: mapTracker(tracker)
  });
}

export async function listTelegramIncomingMessages(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const incomingMessages = await telegramTrackerService.listIncomingMessages(id);

  res.json({
    success: true,
    data: incomingMessages.map((item) => ({
      id: item.id,
      tracked_account_id: item.trackedAccountId,
      from_telegram_user_id: item.fromTelegramUserId.toString(),
      chat_telegram_id: item.chatTelegramId?.toString() ?? null,
      telegram_message_id: item.telegramMessageId,
      message_text: item.messageText,
      received_at: item.receivedAt,
      created_at: item.createdAt
    }))
  });
}

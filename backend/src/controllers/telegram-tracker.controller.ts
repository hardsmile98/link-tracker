import { Request, Response } from "express";
import { z } from "zod";
import { TelegramTrackerService } from "../services/telegram-tracker.service";
import { trashConversionService } from "../services/trash-conversion.service";

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
  id: z.string().trim().min(1)
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

function mapIncomingMessage(item: {
  id: string;
  trackedAccountId: string;
  fromTelegramUserId: bigint;
  chatTelegramId: bigint | null;
  telegramMessageId: number | null;
  messageText: string | null;
  fromFirstName: string | null;
  fromLastName: string | null;
  receivedAt: Date;
  createdAt: Date;
}) {
  return {
    id: item.id,
    tracked_account_id: item.trackedAccountId,
    from_telegram_user_id: item.fromTelegramUserId.toString(),
    chat_telegram_id: item.chatTelegramId?.toString() ?? null,
    telegram_message_id: item.telegramMessageId,
    message_text: item.messageText,
    from_first_name: item.fromFirstName,
    from_last_name: item.fromLastName,
    received_at: item.receivedAt,
    created_at: item.createdAt
  };
}

const listChatsQuerySchema = z.object({
  q: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.string().optional()
  )
});

const peerMessagesParamsSchema = z.object({
  id: z.string().trim().min(1),
  peerType: z.enum(["chat", "user"]),
  peerId: z
    .string()
    .regex(/^-?\d+$/, "peer id must be a decimal integer string")
});

const telegramUserParamsSchema = z.object({
  telegramUserId: z
    .string()
    .regex(/^\d+$/, "telegram user id must be a positive decimal integer string")
});

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
    data: incomingMessages.map(mapIncomingMessage)
  });
}

export async function listTelegramIncomingChats(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const { q } = listChatsQuerySchema.parse(req.query);
  const chats = await telegramTrackerService.listIncomingChats(id, q);

  res.json({
    success: true,
    data: chats.map(({ peerType, peerId, isTrash, trashMarkedAt, lastMessage }) => ({
      peer_type: peerType,
      peer_id: peerId.toString(),
      buyer_telegram_user_id: lastMessage.fromTelegramUserId.toString(),
      is_trash: isTrash,
      trash_marked_at: trashMarkedAt,
      last_message: mapIncomingMessage(lastMessage)
    }))
  });
}

export async function listTelegramIncomingMessagesForPeer(req: Request, res: Response) {
  const { id, peerType, peerId } = peerMessagesParamsSchema.parse(req.params);
  const peerIdBigInt = BigInt(peerId);
  const messages = await telegramTrackerService.listIncomingMessagesForPeer(id, peerType, peerIdBigInt);

  res.json({
    success: true,
    data: messages.map(mapIncomingMessage)
  });
}

export async function getTelegramUserTrashStatus(req: Request, res: Response) {
  const { telegramUserId } = telegramUserParamsSchema.parse(req.params);
  const status = await trashConversionService.getTrashStatus(BigInt(telegramUserId));

  res.json({
    success: true,
    data: {
      telegram_user_id: telegramUserId,
      is_trash: status.isTrash,
      trash_marked_at: status.trashMarkedAt
    }
  });
}

export async function markTelegramUserAsTrash(req: Request, res: Response) {
  const { telegramUserId } = telegramUserParamsSchema.parse(req.params);
  const status = await trashConversionService.sendAndMarkTrash(BigInt(telegramUserId));

  res.json({
    success: true,
    data: {
      telegram_user_id: telegramUserId,
      is_trash: status.isTrash,
      trash_marked_at: status.trashMarkedAt
    }
  });
}

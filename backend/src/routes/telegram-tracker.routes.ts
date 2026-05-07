import { Router } from "express";
import { requireAdminAuth } from "../middleware/require-admin-auth";
import {
  deleteTelegramTracker,
  listTelegramIncomingMessages,
  listTelegramTrackers,
  restartTelegramTracker,
  startTelegramTrackerAuth,
  updateTelegramTracker,
  verifyTelegramTrackerCode,
  verifyTelegramTrackerPassword
} from "../controllers/telegram-tracker.controller";

export const telegramTrackerRouter = Router();

telegramTrackerRouter.use(requireAdminAuth);

telegramTrackerRouter.get("/api/admin/telegram-trackers", listTelegramTrackers);
telegramTrackerRouter.post("/api/admin/telegram-trackers/auth/phone", startTelegramTrackerAuth);
telegramTrackerRouter.post("/api/admin/telegram-trackers/auth/code", verifyTelegramTrackerCode);
telegramTrackerRouter.post("/api/admin/telegram-trackers/auth/password", verifyTelegramTrackerPassword);
telegramTrackerRouter.patch("/api/admin/telegram-trackers/:id", updateTelegramTracker);
telegramTrackerRouter.post("/api/admin/telegram-trackers/:id/restart", restartTelegramTracker);
telegramTrackerRouter.delete("/api/admin/telegram-trackers/:id", deleteTelegramTracker);
telegramTrackerRouter.get("/api/admin/telegram-trackers/:id/messages", listTelegramIncomingMessages);

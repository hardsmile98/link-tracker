import { Request, Response } from "express";
import { z } from "zod";
import { tikTokEventsService } from "../services/tiktok-events.service";
import { AppError } from "../utils/app-error";

const leadQuerySchema = z.object({
  ttclid: z.string().min(1),
  pixelId: z.string().min(1),
  click_id: z.string().min(1)
});

export async function sendTikTokLead(req: Request, res: Response) {
  const payload = leadQuerySchema.parse(req.query);

  const sent = await tikTokEventsService.sendLeadEvent({
    clickId: payload.click_id,
    pixelId: payload.pixelId,
    ttclid: payload.ttclid,
    _ttp: null,
    ip: null,
    userAgent: null
  });

  if (!sent) {
    throw new AppError("TikTok ad account not found or event was rejected", 404);
  }

  res.status(200).json({ success: true });
}

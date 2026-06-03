import { Router } from "express";
import { sendTikTokLead } from "../controllers/tiktok-lead.controller";

export const tiktokLeadRouter = Router();

tiktokLeadRouter.post("/api/tiktok/lead", sendTikTokLead);

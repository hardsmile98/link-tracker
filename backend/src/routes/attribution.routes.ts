import { Router } from "express";
import { linkAttribution } from "../controllers/attribution.controller";

export const attributionRouter = Router();

attributionRouter.post("/api/attribution/link", linkAttribution);

import { Router } from "express";
import { handleClick } from "../controllers/click.controller";

export const clickRouter = Router();

clickRouter.get("/api/click", handleClick);

import { Router } from "express";
import {
  createDepositConversion,
  listDepositConversions
} from "../controllers/deposit-conversion.controller";
import { requireAdminAuth } from "../middleware/require-admin-auth";

export const depositConversionRouter = Router();

depositConversionRouter.use(requireAdminAuth);

depositConversionRouter.get("/api/admin/deposit-conversions", listDepositConversions);
depositConversionRouter.post("/api/admin/deposit-conversions", createDepositConversion);

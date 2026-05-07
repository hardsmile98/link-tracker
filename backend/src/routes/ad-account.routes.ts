import { Router } from "express";
import {
  createAdAccount,
  deleteAdAccount,
  listAdAccounts,
  updateAdAccount
} from "../controllers/ad-account.controller";
import { requireAdminAuth } from "../middleware/require-admin-auth";

export const adAccountRouter = Router();

adAccountRouter.use(requireAdminAuth);

adAccountRouter.get("/api/admin/ad-accounts", listAdAccounts);
adAccountRouter.post("/api/admin/ad-accounts", createAdAccount);
adAccountRouter.patch("/api/admin/ad-accounts/:id", updateAdAccount);
adAccountRouter.delete("/api/admin/ad-accounts/:id", deleteAdAccount);

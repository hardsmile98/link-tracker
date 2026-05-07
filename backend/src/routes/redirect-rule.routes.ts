import { Router } from "express";
import {
  createRedirectRule,
  deleteRedirectRule,
  listRedirectRules,
  updateRedirectRule
} from "../controllers/redirect-rule.controller";
import { requireAdminAuth } from "../middleware/require-admin-auth";

export const redirectRuleRouter = Router();

redirectRuleRouter.use(requireAdminAuth);

redirectRuleRouter.get("/api/admin/redirect-rules", listRedirectRules);
redirectRuleRouter.post("/api/admin/redirect-rules", createRedirectRule);
redirectRuleRouter.patch("/api/admin/redirect-rules/:id", updateRedirectRule);
redirectRuleRouter.delete("/api/admin/redirect-rules/:id", deleteRedirectRule);

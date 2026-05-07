import { Router } from "express";
import { adminLogin, adminLogout, adminMe } from "../controllers/admin-auth.controller";

export const adminAuthRouter = Router();

adminAuthRouter.post("/api/admin/login", adminLogin);
adminAuthRouter.post("/api/admin/logout", adminLogout);
adminAuthRouter.get("/api/admin/me", adminMe);

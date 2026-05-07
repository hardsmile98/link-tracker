import { NextFunction, Request, Response } from "express";
import { AdminAuthService } from "../services/admin-auth.service";
import { AppError } from "../utils/app-error";
import { parseCookieHeader } from "../utils/cookie";

const authService = new AdminAuthService();

function parseSessionCookie(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [sessionId, token] = value.split(".");

  if (!sessionId || !token) {
    return null;
  }

  return { sessionId, token };
}

export function requireAdminAuth(req: Request, _res: Response, next: NextFunction) {
  const cookies = parseCookieHeader(req.headers.cookie);

  const rawSessionValue = cookies[AdminAuthService.sessionCookieName];

  const session = parseSessionCookie(rawSessionValue);

  if (!session || !authService.isValidSession(session.sessionId, session.token)) {
    throw new AppError("Unauthorized", 401);
  }

  next();
}

import { Request, Response } from "express";
import { z } from "zod";
import { AdminAuthService } from "../services/admin-auth.service";
import { AppError } from "../utils/app-error";
import { buildSetCookie, parseCookieHeader } from "../utils/cookie";

const authService = new AdminAuthService();

const loginSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1)
});

function readSession(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie);
  const rawSessionValue = cookies[AdminAuthService.sessionCookieName];

  if (!rawSessionValue) {
    return null;
  }

  const [sessionId, token] = rawSessionValue.split(".");

  if (!sessionId || !token) {
    return null;
  }

  return { sessionId, token };
}

export async function adminLogin(req: Request, res: Response) {
  const payload = loginSchema.parse(req.body);

  if (!authService.validateCredentials(payload.login, payload.password)) {
    throw new AppError("Invalid login or password", 401);
  }

  const session = authService.createSession();

  const sessionCookie = authService.buildSessionCookieValue(session.sessionId, session.token);

  res.setHeader(
    "Set-Cookie",
    buildSetCookie(AdminAuthService.sessionCookieName, sessionCookie, {
      maxAgeSeconds: session.expiresAt - Date.now()
    })
  );

  res.json({
    success: true,
    data: {
      authenticated: true
    }
  });
}

export async function adminLogout(req: Request, res: Response) {
  const session = readSession(req);

  if (session) {
    authService.destroySession(session.sessionId);
  }

  res.setHeader(
    "Set-Cookie",
    buildSetCookie(AdminAuthService.sessionCookieName, "", {
      maxAgeSeconds: 0
    })
  );

  res.json({
    success: true,
    data: {
      authenticated: false
    }
  });
}

export async function adminMe(req: Request, res: Response) {
  const session = readSession(req);

  const authenticated = Boolean(
    session && authService.isValidSession(session.sessionId, session.token)
  );

  res.json({
    success: true,
    data: {
      authenticated
    }
  });
}

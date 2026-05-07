import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type SessionRecord = {
  tokenHash: string;
  expiresAt: number;
};

const sessions = new Map<string, SessionRecord>();

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export class AdminAuthService {
  public static readonly sessionCookieName = SESSION_COOKIE_NAME;

  public validateCredentials(login: string, password: string) {
    return login === env.ADMIN_LOGIN && password === env.ADMIN_PASSWORD;
  }

  public createSession() {
    const sessionId = randomBytes(24).toString("hex");

    const token = randomBytes(32).toString("hex");
  
    const tokenHash = sha256(token);

    const expiresAt = Date.now() + SESSION_TTL_MS;

    sessions.set(sessionId, {
      tokenHash,
      expiresAt
    });

    return {
      sessionId,
      token,
      expiresAt
    };
  }

  public isValidSession(sessionId: string, token: string) {
    const record = sessions.get(sessionId);

    if (!record) {
      return false;
    }

    if (record.expiresAt <= Date.now()) {
      sessions.delete(sessionId);
  
      return false;
    }

    return record.tokenHash === sha256(token);
  }

  public destroySession(sessionId: string) {
    sessions.delete(sessionId);
  }

  public buildSessionCookieValue(sessionId: string, token: string) {
    return `${sessionId}.${token}`;
  }
}

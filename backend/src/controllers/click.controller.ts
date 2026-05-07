import { Request, Response } from "express";
import { env } from "../config/env";
import { ClickService } from "../services/click.service";

const clickService = new ClickService();

function normalizeQueryParams(query: Request["query"]): Record<string, string | string[]> {
  const normalized: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      normalized[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      normalized[key] = value.filter((item): item is string => typeof item === "string");
    }
  }

  return normalized;
}

function getClientIp(req: Request): string | undefined {
  const xForwardedFor = req.headers["x-forwarded-for"];

  if (typeof xForwardedFor === "string") {
    return xForwardedFor.split(",")[0]?.trim();
  }

  return req.ip;
}

export async function handleClick(req: Request, res: Response) {
  const queryParams = normalizeQueryParams(req.query);

  const click = await clickService.createClick({
    queryParams,
    referrer: req.get("referer") ?? '',
    userAgent: req.get("user-agent") ?? null,
    ip: getClientIp(req) ?? null,
  });

  const redirectUrl = new URL(`https://t.me/${env.TELEGRAM_BOT_USERNAME}`);

  redirectUrl.searchParams.set("startapp", click.id);

  res.redirect(302, redirectUrl.toString());
}

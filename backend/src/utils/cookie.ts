import { env } from "../config/env";

type CookieOptions = {
  maxAgeSeconds?: number;
};

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, chunk) => {
    const [rawName, ...rawValueParts] = chunk.trim().split("=");

    if (!rawName || rawValueParts.length === 0) {
      return acc;
    }

    acc[rawName] = decodeURIComponent(rawValueParts.join("="));
    return acc;
  }, {});
}

export function buildSetCookie(name: string, value: string, options: CookieOptions = {}) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax"
  ];

  if (options.maxAgeSeconds !== undefined) {
    attributes.push(`Max-Age=${options.maxAgeSeconds}`);
  }

  if (env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

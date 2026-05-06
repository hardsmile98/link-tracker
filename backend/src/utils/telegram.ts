import crypto from "node:crypto";

export type ParsedInitData = Record<string, string>;

export function parseInitData(initDataRaw: string): ParsedInitData {
  const params = new URLSearchParams(initDataRaw);
  const parsed: ParsedInitData = {};

  for (const [key, value] of params.entries()) {
    parsed[key] = value;
  }

  return parsed;
}

export function verifyTelegramInitData(initDataRaw: string, botToken: string): boolean {
  if (!initDataRaw) {
    return false;
  }

  const params = new URLSearchParams(initDataRaw);
  const receivedHash = params.get("hash");

  if (!receivedHash) {
    return false;
  }

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

  if (receivedHash.length !== calculatedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(calculatedHash, "hex"), Buffer.from(receivedHash, "hex"));
}

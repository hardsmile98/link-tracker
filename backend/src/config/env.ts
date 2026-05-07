import { config } from "dotenv";
import { z } from "zod";

config();

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional()
);

const optionalPositiveInt = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional()
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_USERNAME: z.string().min(1),
  TELEGRAM_MINI_APP_SHORT_NAME: z.string().min(1),
  TELEGRAM_API_ID: z.coerce.number().int().positive(),
  TELEGRAM_API_HASH: z.string().min(1),
  TELEGRAM_MTPROXY_HOST: optionalNonEmptyString,
  TELEGRAM_MTPROXY_PORT: optionalPositiveInt,
  TELEGRAM_MTPROXY_SECRET: optionalNonEmptyString,
  ADMIN_LOGIN: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  CORS_ORIGIN: z.string().default("*"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid env configuration: ${parsed.error.message}`);
}

export const env = parsed.data;

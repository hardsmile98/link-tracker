import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env";
import { logger } from "./logger";

const pool = new Pool({
  connectionString: env.DATABASE_URL
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: [{ level: "error", emit: "event" }, { level: "warn", emit: "event" }]
});

prisma.$on("error", (event) => {
  logger.error({ event }, "Prisma error");
});

prisma.$on("warn", (event) => {
  logger.warn({ event }, "Prisma warning");
});

export async function closeDbPool() {
  await pool.end();
}

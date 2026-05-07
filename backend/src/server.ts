import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { closeDbPool, prisma } from "./config/prisma";
import { telegramTrackerRuntime } from "./services/telegram-tracker.runtime";

async function bootstrap() {
  await telegramTrackerRuntime.startAllActive();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "Tracking backend started");
  });

  async function shutdown(signal: string) {
    logger.info({ signal }, "Graceful shutdown started");

    server.close(async () => {
      await telegramTrackerRuntime.stopAll();
      await prisma.$disconnect();

      await closeDbPool();

      logger.info("HTTP server closed");

      process.exit(0);
    });
  }

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

void bootstrap().catch((error) => {
  logger.error({ err: error }, "Failed to bootstrap application");
  process.exit(1);
});

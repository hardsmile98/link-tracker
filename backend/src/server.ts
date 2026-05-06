import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { closeDbPool, prisma } from "./config/prisma";

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "Tracking backend started");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Graceful shutdown started");

  server.close(async () => {
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

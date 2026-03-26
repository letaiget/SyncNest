import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initializeDatabase } from "./db/sqlite.js";

async function bootstrap() {
  initializeDatabase();

  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info("SyncNest server started", {
      env: env.NODE_ENV,
      port: env.PORT,
    });
  });
}

bootstrap().catch((error: unknown) => {
  logger.error("Failed to start SyncNest server", {
    error: error instanceof Error ? error.message : "unknown error",
  });
  process.exit(1);
});

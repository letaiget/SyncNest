import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { auditLogsRouter } from "./features/audit-logs/audit-logs.router.js";
import { authRouter } from "./features/auth/auth.router.js";
import { devicesRouter } from "./features/devices/devices.router.js";
import { fileLocksRouter } from "./features/file-locks/file-locks.router.js";
import { networksRouter } from "./features/networks/networks.router.js";
import { storageRouter } from "./features/storage/storage.router.js";
import { healthRouter } from "./routes/health.js";
import { metricsRouter } from "./routes/metrics.js";
import { systemConfigRouter } from "./routes/system-config.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(morgan("dev"));

  app.get("/", (_req, res) => {
    res.status(200).json({
      name: "SyncNest Server",
      version: "0.1.0",
      docs: "See repository README for current status",
    });
  });

  app.use("/health", healthRouter);
  app.use("/system/config", systemConfigRouter);
  app.use("/metrics", metricsRouter);
  app.use("/auth", authRouter);
  app.use("/networks", networksRouter);
  app.use("/devices", devicesRouter);
  app.use("/file-locks", fileLocksRouter);
  app.use("/audit-logs", auditLogsRouter);
  app.use("/storage", storageRouter);

  return app;
}

import { Router } from "express";
import { env } from "../config/env.js";

export const systemConfigRouter = Router();

systemConfigRouter.get("/", (_req, res) => {
  res.status(200).json({
    fileLockTtlSeconds: env.FILE_LOCK_TTL_SECONDS,
    cleanupIntervalSeconds: env.CLEANUP_INTERVAL_SECONDS,
    auditLogRetentionDays: env.AUDIT_LOG_RETENTION_DAYS,
    auditLogRetentionEnabled: env.AUDIT_LOG_RETENTION_DAYS > 0,
  });
});

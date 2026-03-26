import { Router } from "express";
import { env } from "../config/env.js";
import { db } from "../db/sqlite.js";

export const systemConfigRouter = Router();

systemConfigRouter.get("/", (_req, res) => {
  res.status(200).json({
    fileLockTtlSeconds: env.FILE_LOCK_TTL_SECONDS,
    cleanupIntervalSeconds: env.CLEANUP_INTERVAL_SECONDS,
    auditLogRetentionDays: env.AUDIT_LOG_RETENTION_DAYS,
    auditLogRetentionEnabled: env.AUDIT_LOG_RETENTION_DAYS > 0,
  });
});

systemConfigRouter.get("/cleanup-dry-run", (_req, res) => {
  const nowIso = new Date().toISOString();
  const verificationUsedBeforeIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const fileLockCutoffIso = new Date(Date.now() - env.FILE_LOCK_TTL_SECONDS * 1000).toISOString();
  const auditLogCutoffIso =
    env.AUDIT_LOG_RETENTION_DAYS > 0
      ? new Date(Date.now() - env.AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const expiredVerificationCodes = (
    db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM email_verification_codes
        WHERE expires_at < @now
           OR (used_at IS NOT NULL AND used_at < @usedBefore)
        `
      )
      .get({ now: nowIso, usedBefore: verificationUsedBeforeIso }) as { count: number }
  ).count;

  const expiredFileLocks = (
    db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM file_locks
        WHERE released_at IS NULL AND acquired_at < @cutoff
        `
      )
      .get({ cutoff: fileLockCutoffIso }) as { count: number }
  ).count;

  const expiredAccessTokens = (
    db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM access_tokens
        WHERE revoked_at IS NULL AND expires_at < @now
        `
      )
      .get({ now: nowIso }) as { count: number }
  ).count;

  const auditLogsForDeletion =
    auditLogCutoffIso === null
      ? 0
      : (
          db
            .prepare(
              `
              SELECT COUNT(*) as count
              FROM audit_logs
              WHERE created_at < @cutoff
              `
            )
            .get({ cutoff: auditLogCutoffIso }) as { count: number }
        ).count;

  res.status(200).json({
    generatedAt: nowIso,
    auditLogRetentionEnabled: env.AUDIT_LOG_RETENTION_DAYS > 0,
    candidates: {
      expiredVerificationCodes,
      expiredFileLocks,
      expiredAccessTokens,
      auditLogsForDeletion,
    },
    totals: {
      allCandidates:
        expiredVerificationCodes + expiredFileLocks + expiredAccessTokens + auditLogsForDeletion,
    },
  });
});

import { Router } from "express";
import { env } from "../config/env.js";
import { db } from "../db/sqlite.js";
import { randomUUID } from "node:crypto";
import { getAuthUser, requireAuth } from "../middleware/require-auth.js";
import { requireSystemOwnerScope } from "../middleware/require-role.js";
import { runCleanupPassOnce } from "../jobs/cleanup.job.js";
import { incCounter } from "../metrics/metrics.js";

export const systemConfigRouter = Router();
systemConfigRouter.use(requireAuth);
systemConfigRouter.use(requireSystemOwnerScope);

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

systemConfigRouter.post("/cleanup/run", (req, res) => {
  try {
    const user = getAuthUser(req);
    const stats = runCleanupPassOnce();
    incCounter("cleanup_manual_runs_total");

    const ownedNetworks = db
      .prepare("SELECT id FROM networks WHERE owner_user_id = ?")
      .all(user.id) as Array<{ id: string }>;

    if (ownedNetworks.length > 0) {
      const insertAuditLogStmt = db.prepare(`
        INSERT INTO audit_logs (id, network_id, actor_user_id, event_type, payload_json, status, created_at)
        VALUES (@id, @network_id, @actor_user_id, @event_type, @payload_json, @status, @created_at)
      `);
      const createdAt = new Date().toISOString();

      const tx = db.transaction(() => {
        for (const network of ownedNetworks) {
          insertAuditLogStmt.run({
            id: randomUUID(),
            network_id: network.id,
            actor_user_id: user.id,
            event_type: "system.cleanup.manual.run",
            payload_json: JSON.stringify({
              expiredCodes: stats.expiredCodes,
              expiredLocks: stats.expiredLocks,
              expiredAccessTokens: stats.expiredAccessTokens,
              retainedAuditLogsDeleted: stats.retainedAuditLogsDeleted,
              totalChanges: stats.totalChanges,
            }),
            status: "success",
            created_at: createdAt,
          });
        }
      });
      tx();
    }

    return res.status(200).json({
      message: "Cleanup pass executed",
      ...stats,
    });
  } catch (_error: unknown) {
    incCounter("cleanup_manual_errors_total");
    return res.status(500).json({ error: "Failed to execute cleanup pass" });
  }
});

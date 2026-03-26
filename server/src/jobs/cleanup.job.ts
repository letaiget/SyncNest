import { db } from "../db/sqlite.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { incCounter } from "../metrics/metrics.js";

function nowIso(): string {
  return new Date().toISOString();
}

function cleanupExpiredVerificationCodes(): number {
  const result = db
    .prepare(
      `
      DELETE FROM email_verification_codes
      WHERE expires_at < @now
         OR (used_at IS NOT NULL AND used_at < @usedBefore)
      `
    )
    .run({
      now: nowIso(),
      usedBefore: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });
  return result.changes;
}

function cleanupExpiredFileLocks(): number {
  const cutoffIso = new Date(Date.now() - env.FILE_LOCK_TTL_SECONDS * 1000).toISOString();
  const result = db
    .prepare(
      `
      UPDATE file_locks
      SET released_at = @released_at
      WHERE released_at IS NULL AND acquired_at < @cutoff
      `
    )
    .run({
      released_at: nowIso(),
      cutoff: cutoffIso,
    });
  return result.changes;
}

function cleanupStaleAccessTokens(): number {
  const result = db
    .prepare(
      `
      UPDATE access_tokens
      SET revoked_at = @revoked_at
      WHERE revoked_at IS NULL AND expires_at < @now
      `
    )
    .run({
      revoked_at: nowIso(),
      now: nowIso(),
    });
  return result.changes;
}

function cleanupAuditLogsByRetention(): number {
  if (env.AUDIT_LOG_RETENTION_DAYS <= 0) {
    return 0;
  }

  const cutoffIso = new Date(Date.now() - env.AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const result = db
    .prepare(
      `
      DELETE FROM audit_logs
      WHERE created_at < @cutoff
      `
    )
    .run({ cutoff: cutoffIso });

  return result.changes;
}

export function runCleanupPassOnce(): void {
  incCounter("cleanup_runs_total");
  const expiredCodes = cleanupExpiredVerificationCodes();
  const expiredLocks = cleanupExpiredFileLocks();
  const expiredAccessTokens = cleanupStaleAccessTokens();
  const retainedAuditLogsDeleted = cleanupAuditLogsByRetention();
  incCounter(
    "cleanup_changes_total",
    expiredCodes + expiredLocks + expiredAccessTokens + retainedAuditLogsDeleted
  );
  incCounter("audit_logs_retention_deletions_total", retainedAuditLogsDeleted);

  if (expiredCodes > 0 || expiredLocks > 0 || expiredAccessTokens > 0 || retainedAuditLogsDeleted > 0) {
    logger.info("Cleanup job applied changes", {
      expiredCodes,
      expiredLocks,
      expiredAccessTokens,
      retainedAuditLogsDeleted,
    });
  }
}

export function startCleanupJob(): NodeJS.Timeout {
  runCleanupPassOnce();

  const intervalMs = env.CLEANUP_INTERVAL_SECONDS * 1000;
  logger.info("Cleanup job started", {
    intervalSeconds: env.CLEANUP_INTERVAL_SECONDS,
    fileLockTtlSeconds: env.FILE_LOCK_TTL_SECONDS,
    auditLogRetentionDays: env.AUDIT_LOG_RETENTION_DAYS,
  });

  return setInterval(() => {
    runCleanupPassOnce();
  }, intervalMs);
}

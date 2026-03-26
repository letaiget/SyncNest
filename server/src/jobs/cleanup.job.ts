import { db } from "../db/sqlite.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

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

function runCleanupPass(): void {
  const expiredCodes = cleanupExpiredVerificationCodes();
  const expiredLocks = cleanupExpiredFileLocks();
  const expiredAccessTokens = cleanupStaleAccessTokens();

  if (expiredCodes > 0 || expiredLocks > 0 || expiredAccessTokens > 0) {
    logger.info("Cleanup job applied changes", {
      expiredCodes,
      expiredLocks,
      expiredAccessTokens,
    });
  }
}

export function startCleanupJob(): NodeJS.Timeout {
  runCleanupPass();

  const intervalMs = env.CLEANUP_INTERVAL_SECONDS * 1000;
  logger.info("Cleanup job started", {
    intervalSeconds: env.CLEANUP_INTERVAL_SECONDS,
    fileLockTtlSeconds: env.FILE_LOCK_TTL_SECONDS,
  });

  return setInterval(() => {
    runCleanupPass();
  }, intervalMs);
}

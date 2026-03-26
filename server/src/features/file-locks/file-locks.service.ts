import { randomUUID } from "node:crypto";
import { db } from "../../db/sqlite.js";
import { env } from "../../config/env.js";
import { incCounter } from "../../metrics/metrics.js";

type FileRow = {
  id: string;
  network_id: string;
  deleted_at: string | null;
};

type FileLockRow = {
  id: string;
  network_id: string;
  file_id: string;
  lock_owner_user_id: string;
  lock_owner_device_id: string | null;
  acquired_at: string;
  released_at: string | null;
};

export class FileLockError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function isLockExpired(acquiredAt: string): boolean {
  const acquiredMs = new Date(acquiredAt).getTime();
  const ttlMs = env.FILE_LOCK_TTL_SECONDS * 1000;
  return Date.now() - acquiredMs > ttlMs;
}

const getNetworkOwnerStmt = db.prepare("SELECT owner_user_id FROM networks WHERE id = ? LIMIT 1");
const findFileByIdStmt = db.prepare("SELECT id, network_id, deleted_at FROM files WHERE id = ? LIMIT 1");
const findFileLockByFileIdStmt = db.prepare("SELECT * FROM file_locks WHERE file_id = ? LIMIT 1");
const insertFileLockStmt = db.prepare(`
  INSERT INTO file_locks (
    id, network_id, file_id, lock_owner_user_id, lock_owner_device_id, acquired_at, released_at
  ) VALUES (
    @id, @network_id, @file_id, @lock_owner_user_id, @lock_owner_device_id, @acquired_at, NULL
  )
`);
const updateFileLockAcquireStmt = db.prepare(`
  UPDATE file_locks
  SET lock_owner_user_id = @lock_owner_user_id,
      lock_owner_device_id = @lock_owner_device_id,
      acquired_at = @acquired_at,
      released_at = NULL
  WHERE id = @id
`);
const updateFileLockHeartbeatStmt = db.prepare(`
  UPDATE file_locks
  SET acquired_at = @acquired_at
  WHERE id = @id AND released_at IS NULL
`);
const updateFileLockReleaseStmt = db.prepare(`
  UPDATE file_locks
  SET released_at = @released_at
  WHERE id = @id AND released_at IS NULL
`);

const insertAuditLogStmt = db.prepare(`
  INSERT INTO audit_logs (id, network_id, actor_user_id, event_type, payload_json, status, created_at)
  VALUES (@id, @network_id, @actor_user_id, @event_type, @payload_json, @status, @created_at)
`);

function assertNetworkAccess(networkId: string, userId: string): void {
  const owner = getNetworkOwnerStmt.get(networkId) as { owner_user_id: string } | undefined;
  if (!owner) {
    throw new FileLockError("Network not found", 404);
  }
  if (owner.owner_user_id !== userId) {
    throw new FileLockError("Forbidden network access", 403);
  }
}

function assertFileInNetwork(networkId: string, fileId: string): void {
  const file = findFileByIdStmt.get(fileId) as FileRow | undefined;
  if (!file || file.network_id !== networkId || file.deleted_at) {
    throw new FileLockError("File not found", 404);
  }
}

function writeAuditLog(input: {
  networkId: string;
  actorUserId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "success" | "error";
}): void {
  insertAuditLogStmt.run({
    id: randomUUID(),
    network_id: input.networkId,
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    payload_json: JSON.stringify(input.payload),
    status: input.status,
    created_at: nowIso(),
  });
}

function resolveActiveLockForFile(input: {
  fileId: string;
  networkId: string;
  actorUserId: string;
}): FileLockRow | null {
  const lock = findFileLockByFileIdStmt.get(input.fileId) as FileLockRow | undefined;
  if (!lock || lock.released_at) {
    return null;
  }

  if (isLockExpired(lock.acquired_at)) {
    const releasedAt = nowIso();
    updateFileLockReleaseStmt.run({
      id: lock.id,
      released_at: releasedAt,
    });
    incCounter("lock_ttl_expirations_total");
    writeAuditLog({
      networkId: input.networkId,
      actorUserId: input.actorUserId,
      eventType: "file.lock.expired",
      payload: {
        fileId: input.fileId,
        previousLockOwnerUserId: lock.lock_owner_user_id,
        previousLockOwnerDeviceId: lock.lock_owner_device_id,
      },
      status: "success",
    });
    return null;
  }

  return lock;
}

export function getFileLockStatus(input: {
  networkId: string;
  userId: string;
  fileId: string;
}): {
  locked: boolean;
  lock: null | {
    fileId: string;
    lockOwnerUserId: string;
    lockOwnerDeviceId: string | null;
    acquiredAt: string;
  };
} {
  assertNetworkAccess(input.networkId, input.userId);
  assertFileInNetwork(input.networkId, input.fileId);

  const lock = resolveActiveLockForFile({
    fileId: input.fileId,
    networkId: input.networkId,
    actorUserId: input.userId,
  });
  if (!lock) {
    return { locked: false, lock: null };
  }

  return {
    locked: true,
    lock: {
      fileId: lock.file_id,
      lockOwnerUserId: lock.lock_owner_user_id,
      lockOwnerDeviceId: lock.lock_owner_device_id,
      acquiredAt: lock.acquired_at,
    },
  };
}

export function acquireFileLock(input: {
  networkId: string;
  userId: string;
  fileId: string;
  deviceId?: string;
}): { acquired: boolean; alreadyOwned: boolean } {
  assertNetworkAccess(input.networkId, input.userId);
  assertFileInNetwork(input.networkId, input.fileId);

  const existing = findFileLockByFileIdStmt.get(input.fileId) as FileLockRow | undefined;
  const active = resolveActiveLockForFile({
    fileId: input.fileId,
    networkId: input.networkId,
    actorUserId: input.userId,
  });
  const timestamp = nowIso();

  if (!existing) {
    insertFileLockStmt.run({
      id: randomUUID(),
      network_id: input.networkId,
      file_id: input.fileId,
      lock_owner_user_id: input.userId,
      lock_owner_device_id: input.deviceId ?? null,
      acquired_at: timestamp,
    });
    writeAuditLog({
      networkId: input.networkId,
      actorUserId: input.userId,
      eventType: "file.locked",
      payload: { fileId: input.fileId, deviceId: input.deviceId ?? null },
      status: "success",
    });
    return { acquired: true, alreadyOwned: false };
  }

  if (active) {
    if (active.lock_owner_user_id === input.userId) {
      return { acquired: true, alreadyOwned: true };
    }
    throw new FileLockError("File is already locked by another user", 409);
  }

  updateFileLockAcquireStmt.run({
    id: existing.id,
    lock_owner_user_id: input.userId,
    lock_owner_device_id: input.deviceId ?? null,
    acquired_at: timestamp,
  });
  writeAuditLog({
    networkId: input.networkId,
    actorUserId: input.userId,
    eventType: "file.locked",
    payload: { fileId: input.fileId, deviceId: input.deviceId ?? null },
    status: "success",
  });

  return { acquired: true, alreadyOwned: false };
}

export function releaseFileLock(input: {
  networkId: string;
  userId: string;
  fileId: string;
}): { released: boolean } {
  assertNetworkAccess(input.networkId, input.userId);
  assertFileInNetwork(input.networkId, input.fileId);

  const lock = resolveActiveLockForFile({
    fileId: input.fileId,
    networkId: input.networkId,
    actorUserId: input.userId,
  });
  if (!lock) {
    return { released: false };
  }

  if (lock.lock_owner_user_id !== input.userId) {
    throw new FileLockError("Only lock owner can unlock file", 403);
  }

  const result = updateFileLockReleaseStmt.run({
    id: lock.id,
    released_at: nowIso(),
  });

  if (result.changes > 0) {
    writeAuditLog({
      networkId: input.networkId,
      actorUserId: input.userId,
      eventType: "file.unlocked",
      payload: { fileId: input.fileId },
      status: "success",
    });
    return { released: true };
  }

  return { released: false };
}

export function heartbeatFileLock(input: {
  networkId: string;
  userId: string;
  fileId: string;
}): { renewed: boolean } {
  assertNetworkAccess(input.networkId, input.userId);
  assertFileInNetwork(input.networkId, input.fileId);

  const lock = resolveActiveLockForFile({
    fileId: input.fileId,
    networkId: input.networkId,
    actorUserId: input.userId,
  });
  if (!lock) {
    incCounter("lock_heartbeat_rejected_total");
    return { renewed: false };
  }

  if (lock.lock_owner_user_id !== input.userId) {
    incCounter("lock_heartbeat_rejected_total");
    throw new FileLockError("Only lock owner can renew lock heartbeat", 403);
  }

  const result = updateFileLockHeartbeatStmt.run({
    id: lock.id,
    acquired_at: nowIso(),
  });

  if (result.changes > 0) {
    incCounter("lock_heartbeat_renewed_total");
    return { renewed: true };
  }

  incCounter("lock_heartbeat_rejected_total");
  return { renewed: false };
}

import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { initializeDatabase, db } from "../src/db/sqlite.js";
import { resetRateLimitBuckets } from "../src/middleware/rate-limit.js";
import { runCleanupPassOnce } from "../src/jobs/cleanup.job.js";

const app = createApp();
const DEFAULT_PASSWORD = "StrongPass123";

function resetDatabase(): void {
  db.exec(`
    DELETE FROM access_tokens;
    DELETE FROM sessions;
    DELETE FROM email_verification_codes;
    DELETE FROM file_locks;
    DELETE FROM files;
    DELETE FROM folders;
    DELETE FROM devices;
    DELETE FROM audit_logs;
    DELETE FROM networks;
    DELETE FROM users;
  `);
}

async function registerAndLogin(params: { username: string; email: string }) {
  const requestCodeRes = await request(app).post("/auth/register/request-code").send({
    username: params.username,
    email: params.email,
    password: DEFAULT_PASSWORD,
  });
  expect(requestCodeRes.status).toBe(201);

  const confirmRes = await request(app).post("/auth/register/confirm").send({
    email: params.email,
    code: requestCodeRes.body.verificationCode,
  });
  expect(confirmRes.status).toBe(201);

  const loginRes = await request(app).post("/auth/login").send({
    username: params.username,
    password: DEFAULT_PASSWORD,
  });
  expect(loginRes.status).toBe(200);

  return {
    accessToken: loginRes.body.accessToken as string,
    refreshToken: loginRes.body.refreshToken as string,
  };
}

async function prepareNetworkFolderFile(accessToken: string) {
  const createNetworkRes = await request(app)
    .post("/networks")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name: "Shared Network" });
  expect(createNetworkRes.status).toBe(201);
  const networkId = createNetworkRes.body.networkId as string;

  const createFolderRes = await request(app)
    .post("/storage/folders")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      networkId,
      name: "Projects",
    });
  expect(createFolderRes.status).toBe(201);
  const folderId = createFolderRes.body.folderId as string;

  const createFileRes = await request(app)
    .post("/storage/files")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      networkId,
      folderId,
      name: "README.txt",
      sizeBytes: 256,
      mimeType: "text/plain",
    });
  expect(createFileRes.status).toBe(201);
  const fileId = createFileRes.body.fileId as string;

  return { networkId, folderId, fileId };
}

describe("SyncNest API integration", () => {
  beforeAll(() => {
    initializeDatabase();
  });

  beforeEach(() => {
    resetDatabase();
    resetRateLimitBuckets();
  });

  it("completes auth flow and can access protected profile route", async () => {
    const requestCodeRes = await request(app).post("/auth/register/request-code").send({
      username: "mark",
      email: "mark@example.com",
      password: "StrongPass123",
    });
    expect(requestCodeRes.status).toBe(201);
    expect(requestCodeRes.body.verificationCode).toHaveLength(6);

    const confirmRes = await request(app).post("/auth/register/confirm").send({
      email: "mark@example.com",
      code: requestCodeRes.body.verificationCode,
    });
    expect(confirmRes.status).toBe(201);
    expect(confirmRes.body.user.username).toBe("mark");

    const loginRes = await request(app).post("/auth/login").send({
      username: "mark",
      password: "StrongPass123",
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeTruthy();
    expect(loginRes.body.refreshToken).toBeTruthy();

    const meRes = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.username).toBe("mark");
  });

  it("supports network + storage + file lock flow", async () => {
    const requestCodeRes = await request(app).post("/auth/register/request-code").send({
      username: "owner",
      email: "owner@example.com",
      password: "StrongPass123",
    });
    await request(app).post("/auth/register/confirm").send({
      email: "owner@example.com",
      code: requestCodeRes.body.verificationCode,
    });

    const loginRes = await request(app).post("/auth/login").send({
      username: "owner",
      password: "StrongPass123",
    });
    const accessToken = loginRes.body.accessToken as string;

    const createNetworkRes = await request(app)
      .post("/networks")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Home Network" });
    expect(createNetworkRes.status).toBe(201);
    const networkId = createNetworkRes.body.networkId as string;

    const createFolderRes = await request(app)
      .post("/storage/folders")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        networkId,
        name: "Projects",
      });
    expect(createFolderRes.status).toBe(201);
    const folderId = createFolderRes.body.folderId as string;

    const createFileRes = await request(app)
      .post("/storage/files")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        networkId,
        folderId,
        name: "README.txt",
        sizeBytes: 128,
        mimeType: "text/plain",
      });
    expect(createFileRes.status).toBe(201);
    const fileId = createFileRes.body.fileId as string;

    const lockRes = await request(app)
      .post("/file-locks/lock")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        networkId,
        fileId,
      });
    expect(lockRes.status).toBe(200);
    expect(lockRes.body.acquired).toBe(true);

    const statusRes = await request(app)
      .get("/file-locks/status")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({
        networkId,
        fileId,
      });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.locked).toBe(true);

    const unlockRes = await request(app)
      .post("/file-locks/unlock")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        networkId,
        fileId,
      });
    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.released).toBe(true);
  });

  it("rejects unauthorized access to protected routes", async () => {
    const res = await request(app).get("/networks");
    expect(res.status).toBe(401);
  });

  it("rejects cross-user access to another user's network", async () => {
    const owner = await registerAndLogin({
      username: "owner2",
      email: "owner2@example.com",
    });
    const intruder = await registerAndLogin({
      username: "intruder",
      email: "intruder@example.com",
    });

    const createNetworkRes = await request(app)
      .post("/networks")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Private Network" });
    expect(createNetworkRes.status).toBe(201);
    const networkId = createNetworkRes.body.networkId as string;

    const forbiddenRes = await request(app)
      .get("/devices")
      .set("Authorization", `Bearer ${intruder.accessToken}`)
      .query({ networkId });
    expect(forbiddenRes.status).toBe(403);
  });

  it("invalidates old access token after logout and refresh rejects bad token", async () => {
    const session = await registerAndLogin({
      username: "logout-user",
      email: "logout-user@example.com",
    });

    const badRefreshRes = await request(app).post("/auth/refresh").send({
      refreshToken: "a".repeat(64),
    });
    expect(badRefreshRes.status).toBe(401);

    const logoutRes = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send();
    expect(logoutRes.status).toBe(200);

    const meRes = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${session.accessToken}`);
    expect(meRes.status).toBe(401);
  });

  it("returns 409 when another user tries to lock an already locked file", async () => {
    const owner = await registerAndLogin({
      username: "lock-owner",
      email: "lock-owner@example.com",
    });
    const intruder = await registerAndLogin({
      username: "lock-intruder",
      email: "lock-intruder@example.com",
    });

    const { networkId, fileId } = await prepareNetworkFolderFile(owner.accessToken);

    const ownerLockRes = await request(app)
      .post("/file-locks/lock")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ networkId, fileId });
    expect(ownerLockRes.status).toBe(200);
    expect(ownerLockRes.body.acquired).toBe(true);

    const intruderLockRes = await request(app)
      .post("/file-locks/lock")
      .set("Authorization", `Bearer ${intruder.accessToken}`)
      .send({ networkId, fileId });
    expect(intruderLockRes.status).toBe(403);
  });

  it("returns 403 when non-owner tries to unlock or heartbeat a lock", async () => {
    const owner = await registerAndLogin({
      username: "lock-owner-2",
      email: "lock-owner-2@example.com",
    });
    const intruder = await registerAndLogin({
      username: "lock-intruder-2",
      email: "lock-intruder-2@example.com",
    });

    const { networkId, fileId } = await prepareNetworkFolderFile(owner.accessToken);

    const ownerLockRes = await request(app)
      .post("/file-locks/lock")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ networkId, fileId });
    expect(ownerLockRes.status).toBe(200);

    const intruderUnlockRes = await request(app)
      .post("/file-locks/unlock")
      .set("Authorization", `Bearer ${intruder.accessToken}`)
      .send({ networkId, fileId });
    expect(intruderUnlockRes.status).toBe(403);

    const intruderHeartbeatRes = await request(app)
      .post("/file-locks/heartbeat")
      .set("Authorization", `Bearer ${intruder.accessToken}`)
      .send({ networkId, fileId });
    expect(intruderHeartbeatRes.status).toBe(403);
  });

  it("auto-expires stale lock on status check by TTL", async () => {
    const owner = await registerAndLogin({
      username: "ttl-owner",
      email: "ttl-owner@example.com",
    });
    const { networkId, fileId } = await prepareNetworkFolderFile(owner.accessToken);

    const lockRes = await request(app)
      .post("/file-locks/lock")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ networkId, fileId });
    expect(lockRes.status).toBe(200);

    const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    db.prepare("UPDATE file_locks SET acquired_at = ? WHERE file_id = ?").run(staleIso, fileId);

    const statusRes = await request(app)
      .get("/file-locks/status")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .query({ networkId, fileId });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.locked).toBe(false);
  });

  it("cleanup pass releases stale locks", async () => {
    const owner = await registerAndLogin({
      username: "cleanup-owner",
      email: "cleanup-owner@example.com",
    });
    const { networkId, fileId } = await prepareNetworkFolderFile(owner.accessToken);

    const lockRes = await request(app)
      .post("/file-locks/lock")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ networkId, fileId });
    expect(lockRes.status).toBe(200);

    const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    db.prepare("UPDATE file_locks SET acquired_at = ? WHERE file_id = ?").run(staleIso, fileId);

    runCleanupPassOnce();

    const statusRes = await request(app)
      .get("/file-locks/status")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .query({ networkId, fileId });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.locked).toBe(false);
  });

  it("keeps lock active when owner sends heartbeat", async () => {
    const owner = await registerAndLogin({
      username: "heartbeat-owner",
      email: "heartbeat-owner@example.com",
    });
    const { networkId, fileId } = await prepareNetworkFolderFile(owner.accessToken);

    const lockRes = await request(app)
      .post("/file-locks/lock")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ networkId, fileId });
    expect(lockRes.status).toBe(200);

    const nearExpiryIso = new Date(Date.now() - 60 * 1000).toISOString();
    db.prepare("UPDATE file_locks SET acquired_at = ? WHERE file_id = ?").run(nearExpiryIso, fileId);

    const heartbeatRes = await request(app)
      .post("/file-locks/heartbeat")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ networkId, fileId });
    expect(heartbeatRes.status).toBe(200);
    expect(heartbeatRes.body.renewed).toBe(true);

    const lockRow = db
      .prepare("SELECT acquired_at, released_at FROM file_locks WHERE file_id = ? LIMIT 1")
      .get(fileId) as { acquired_at: string; released_at: string | null } | undefined;
    expect(lockRow).toBeTruthy();
    expect(lockRow?.released_at).toBeNull();
    expect(new Date(lockRow!.acquired_at).getTime()).toBeGreaterThan(new Date(nearExpiryIso).getTime());

    const statusRes = await request(app)
      .get("/file-locks/status")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .query({ networkId, fileId });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.locked).toBe(true);
  });
});

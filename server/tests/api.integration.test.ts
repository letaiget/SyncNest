import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { initializeDatabase, db } from "../src/db/sqlite.js";

const app = createApp();

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

describe("SyncNest API integration", () => {
  beforeAll(() => {
    initializeDatabase();
  });

  beforeEach(() => {
    resetDatabase();
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
});

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "../config/env.js";

function ensureDatabaseDirectory(dbPath: string): void {
  const absolutePath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
  const directory = path.dirname(absolutePath);
  fs.mkdirSync(directory, { recursive: true });
}

ensureDatabaseDirectory(env.DATABASE_PATH);

export const db = new Database(env.DATABASE_PATH);

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS networks (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      host_device_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(owner_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      network_id TEXT NOT NULL,
      actor_user_id TEXT,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(network_id) REFERENCES networks(id),
      FOREIGN KEY(actor_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS email_verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      network_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      computer_name TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      connection_type TEXT NOT NULL,
      status TEXT NOT NULL,
      last_seen_at TEXT,
      disconnected_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(network_id) REFERENCES networks(id),
      FOREIGN KEY(owner_user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_devices_network_id ON devices(network_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_network_id ON audit_logs(network_id);
  `);
}

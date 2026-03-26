import { randomUUID } from "node:crypto";
import { db } from "../../db/sqlite.js";

export type DeviceRow = {
  id: string;
  network_id: string;
  owner_user_id: string;
  name: string;
  computer_name: string;
  ip_address: string;
  connection_type: string;
  status: "online" | "offline";
  last_seen_at: string | null;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
};

export class DevicesError extends Error {
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

const getNetworkOwnerStmt = db.prepare(
  "SELECT owner_user_id FROM networks WHERE id = ? LIMIT 1"
);
const listDevicesByNetworkStmt = db.prepare(
  "SELECT * FROM devices WHERE network_id = ? ORDER BY created_at DESC"
);
const findDeviceByIdStmt = db.prepare("SELECT * FROM devices WHERE id = ? LIMIT 1");
const insertDeviceStmt = db.prepare(`
  INSERT INTO devices (
    id, network_id, owner_user_id, name, computer_name, ip_address, connection_type,
    status, last_seen_at, disconnected_at, created_at, updated_at
  )
  VALUES (
    @id, @network_id, @owner_user_id, @name, @computer_name, @ip_address, @connection_type,
    @status, @last_seen_at, @disconnected_at, @created_at, @updated_at
  )
`);
const updateDeviceDisconnectStmt = db.prepare(`
  UPDATE devices
  SET status = 'offline', disconnected_at = @disconnected_at, updated_at = @updated_at
  WHERE id = @id
`);
const insertAuditLogStmt = db.prepare(`
  INSERT INTO audit_logs (id, network_id, actor_user_id, event_type, payload_json, status, created_at)
  VALUES (@id, @network_id, @actor_user_id, @event_type, @payload_json, @status, @created_at)
`);

function assertNetworkAccess(networkId: string, userId: string): void {
  const owner = getNetworkOwnerStmt.get(networkId) as { owner_user_id: string } | undefined;
  if (!owner) {
    throw new DevicesError("Network not found", 404);
  }
  if (owner.owner_user_id !== userId) {
    throw new DevicesError("Forbidden network access", 403);
  }
}

function writeAuditLog(params: {
  networkId: string;
  actorUserId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "success" | "error";
}): void {
  insertAuditLogStmt.run({
    id: randomUUID(),
    network_id: params.networkId,
    actor_user_id: params.actorUserId,
    event_type: params.eventType,
    payload_json: JSON.stringify(params.payload),
    status: params.status,
    created_at: nowIso(),
  });
}

export function listDevices(input: { networkId: string; userId: string }): DeviceRow[] {
  assertNetworkAccess(input.networkId, input.userId);
  return listDevicesByNetworkStmt.all(input.networkId) as DeviceRow[];
}

export function connectDevice(input: {
  networkId: string;
  userId: string;
  name: string;
  computerName: string;
  ipAddress: string;
  connectionType: "local" | "internet";
}): { deviceId: string } {
  assertNetworkAccess(input.networkId, input.userId);

  const timestamp = nowIso();
  const deviceId = randomUUID();

  const transaction = db.transaction(() => {
    insertDeviceStmt.run({
      id: deviceId,
      network_id: input.networkId,
      owner_user_id: input.userId,
      name: input.name,
      computer_name: input.computerName,
      ip_address: input.ipAddress,
      connection_type: input.connectionType,
      status: "online",
      last_seen_at: timestamp,
      disconnected_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    });
    writeAuditLog({
      networkId: input.networkId,
      actorUserId: input.userId,
      eventType: "device.connected",
      payload: {
        deviceId,
        name: input.name,
        computerName: input.computerName,
        ipAddress: input.ipAddress,
        connectionType: input.connectionType,
      },
      status: "success",
    });
  });

  transaction();

  return { deviceId };
}

export function disconnectDevice(input: {
  networkId: string;
  userId: string;
  deviceId: string;
}): void {
  assertNetworkAccess(input.networkId, input.userId);

  const device = findDeviceByIdStmt.get(input.deviceId) as DeviceRow | undefined;
  if (!device || device.network_id !== input.networkId) {
    throw new DevicesError("Device not found in this network", 404);
  }

  const timestamp = nowIso();

  const transaction = db.transaction(() => {
    updateDeviceDisconnectStmt.run({
      id: input.deviceId,
      disconnected_at: timestamp,
      updated_at: timestamp,
    });
    writeAuditLog({
      networkId: input.networkId,
      actorUserId: input.userId,
      eventType: "device.disconnected",
      payload: {
        deviceId: input.deviceId,
      },
      status: "success",
    });
  });

  transaction();
}

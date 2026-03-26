import { randomUUID } from "node:crypto";
import { db } from "../../db/sqlite.js";

type NetworkRow = {
  id: string;
  owner_user_id: string;
  name: string;
  host_device_id: string | null;
  created_at: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

const insertNetworkStmt = db.prepare(`
  INSERT INTO networks (id, owner_user_id, name, host_device_id, created_at)
  VALUES (@id, @owner_user_id, @name, NULL, @created_at)
`);
const listNetworksStmt = db.prepare(
  "SELECT * FROM networks WHERE owner_user_id = ? ORDER BY created_at DESC"
);
const insertAuditLogStmt = db.prepare(`
  INSERT INTO audit_logs (id, network_id, actor_user_id, event_type, payload_json, status, created_at)
  VALUES (@id, @network_id, @actor_user_id, @event_type, @payload_json, @status, @created_at)
`);

export function createNetwork(input: { ownerUserId: string; name: string }): { networkId: string } {
  const networkId = randomUUID();
  const createdAt = nowIso();

  const transaction = db.transaction(() => {
    insertNetworkStmt.run({
      id: networkId,
      owner_user_id: input.ownerUserId,
      name: input.name,
      created_at: createdAt,
    });
    insertAuditLogStmt.run({
      id: randomUUID(),
      network_id: networkId,
      actor_user_id: input.ownerUserId,
      event_type: "network.created",
      payload_json: JSON.stringify({ name: input.name }),
      status: "success",
      created_at: createdAt,
    });
  });

  transaction();
  return { networkId };
}

export function listNetworks(input: { ownerUserId: string }): NetworkRow[] {
  return listNetworksStmt.all(input.ownerUserId) as NetworkRow[];
}

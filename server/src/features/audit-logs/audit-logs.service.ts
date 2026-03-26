import { db } from "../../db/sqlite.js";

export type AuditLogRow = {
  id: string;
  network_id: string;
  actor_user_id: string | null;
  event_type: string;
  payload_json: string;
  status: string;
  created_at: string;
};

export class AuditLogsError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

const getNetworkOwnerStmt = db.prepare(
  "SELECT owner_user_id FROM networks WHERE id = ? LIMIT 1"
);

const countLogsStmt = db.prepare(`
  SELECT COUNT(*) as total
  FROM audit_logs
  WHERE network_id = @network_id
    AND (@event_type IS NULL OR event_type = @event_type)
    AND (@status IS NULL OR status = @status)
`);

const listLogsStmt = db.prepare(`
  SELECT id, network_id, actor_user_id, event_type, payload_json, status, created_at
  FROM audit_logs
  WHERE network_id = @network_id
    AND (@event_type IS NULL OR event_type = @event_type)
    AND (@status IS NULL OR status = @status)
  ORDER BY created_at DESC
  LIMIT @limit OFFSET @offset
`);

function assertNetworkAccess(networkId: string, userId: string): void {
  const owner = getNetworkOwnerStmt.get(networkId) as { owner_user_id: string } | undefined;
  if (!owner) {
    throw new AuditLogsError("Network not found", 404);
  }
  if (owner.owner_user_id !== userId) {
    throw new AuditLogsError("Forbidden network access", 403);
  }
}

export function listAuditLogs(input: {
  networkId: string;
  userId: string;
  eventType?: string;
  status?: string;
  page: number;
  pageSize: number;
}): {
  items: Array<
    Omit<AuditLogRow, "payload_json"> & {
      payload: Record<string, unknown>;
    }
  >;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
} {
  assertNetworkAccess(input.networkId, input.userId);

  const offset = (input.page - 1) * input.pageSize;

  const totalRow = countLogsStmt.get({
    network_id: input.networkId,
    event_type: input.eventType ?? null,
    status: input.status ?? null,
  }) as { total: number };

  const rows = listLogsStmt.all({
    network_id: input.networkId,
    event_type: input.eventType ?? null,
    status: input.status ?? null,
    limit: input.pageSize,
    offset,
  }) as AuditLogRow[];

  const items = rows.map((row) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(row.payload_json) as Record<string, unknown>;
    } catch {
      payload = {};
    }

    return {
      id: row.id,
      network_id: row.network_id,
      actor_user_id: row.actor_user_id,
      event_type: row.event_type,
      status: row.status,
      created_at: row.created_at,
      payload,
    };
  });

  const totalPages = Math.max(1, Math.ceil(totalRow.total / input.pageSize));

  return {
    items,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total: totalRow.total,
      totalPages,
    },
  };
}

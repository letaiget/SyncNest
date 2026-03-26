import { randomUUID } from "node:crypto";
import { db } from "../../db/sqlite.js";

type FolderRow = {
  id: string;
  network_id: string;
  parent_folder_id: string | null;
  name: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type FileRow = {
  id: string;
  network_id: string;
  folder_id: string | null;
  name: string;
  size_bytes: number;
  mime_type: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export class StorageError extends Error {
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

const getNetworkOwnerStmt = db.prepare("SELECT owner_user_id FROM networks WHERE id = ? LIMIT 1");
const insertAuditLogStmt = db.prepare(`
  INSERT INTO audit_logs (id, network_id, actor_user_id, event_type, payload_json, status, created_at)
  VALUES (@id, @network_id, @actor_user_id, @event_type, @payload_json, @status, @created_at)
`);

const listFoldersStmt = db.prepare(`
  SELECT * FROM folders
  WHERE network_id = @network_id
    AND ((@parent_folder_id IS NULL AND parent_folder_id IS NULL) OR parent_folder_id = @parent_folder_id)
    AND deleted_at IS NULL
  ORDER BY name ASC
`);
const findFolderByIdStmt = db.prepare("SELECT * FROM folders WHERE id = ? LIMIT 1");
const insertFolderStmt = db.prepare(`
  INSERT INTO folders (id, network_id, parent_folder_id, name, deleted_at, created_at, updated_at)
  VALUES (@id, @network_id, @parent_folder_id, @name, NULL, @created_at, @updated_at)
`);
const updateFolderStmt = db.prepare(`
  UPDATE folders
  SET name = @name, parent_folder_id = @parent_folder_id, updated_at = @updated_at
  WHERE id = @id
`);
const softDeleteFolderStmt = db.prepare(`
  UPDATE folders
  SET deleted_at = @deleted_at, updated_at = @updated_at
  WHERE id = @id AND deleted_at IS NULL
`);
const softDeleteFilesInFolderStmt = db.prepare(`
  UPDATE files
  SET deleted_at = @deleted_at, updated_at = @updated_at
  WHERE folder_id = @folder_id AND deleted_at IS NULL
`);
const restoreFolderStmt = db.prepare(`
  UPDATE folders
  SET deleted_at = NULL, updated_at = @updated_at
  WHERE id = @id AND deleted_at IS NOT NULL
`);

const listFilesStmt = db.prepare(`
  SELECT * FROM files
  WHERE network_id = @network_id
    AND ((@folder_id IS NULL AND folder_id IS NULL) OR folder_id = @folder_id)
    AND deleted_at IS NULL
  ORDER BY name ASC
`);
const findFileByIdStmt = db.prepare("SELECT * FROM files WHERE id = ? LIMIT 1");
const insertFileStmt = db.prepare(`
  INSERT INTO files (id, network_id, folder_id, name, size_bytes, mime_type, deleted_at, created_at, updated_at)
  VALUES (@id, @network_id, @folder_id, @name, @size_bytes, @mime_type, NULL, @created_at, @updated_at)
`);
const updateFileStmt = db.prepare(`
  UPDATE files
  SET name = @name, folder_id = @folder_id, updated_at = @updated_at
  WHERE id = @id
`);
const softDeleteFileStmt = db.prepare(`
  UPDATE files
  SET deleted_at = @deleted_at, updated_at = @updated_at
  WHERE id = @id AND deleted_at IS NULL
`);
const restoreFileStmt = db.prepare(`
  UPDATE files
  SET deleted_at = NULL, updated_at = @updated_at
  WHERE id = @id AND deleted_at IS NOT NULL
`);

const listTrashFoldersStmt = db.prepare(`
  SELECT * FROM folders
  WHERE network_id = ? AND deleted_at IS NOT NULL
  ORDER BY deleted_at DESC
`);
const listTrashFilesStmt = db.prepare(`
  SELECT * FROM files
  WHERE network_id = ? AND deleted_at IS NOT NULL
  ORDER BY deleted_at DESC
`);

function assertNetworkAccess(networkId: string, userId: string): void {
  const owner = getNetworkOwnerStmt.get(networkId) as { owner_user_id: string } | undefined;
  if (!owner) {
    throw new StorageError("Network not found", 404);
  }
  if (owner.owner_user_id !== userId) {
    throw new StorageError("Forbidden network access", 403);
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

export function listFolders(input: {
  networkId: string;
  userId: string;
  parentFolderId?: string | null;
}): FolderRow[] {
  assertNetworkAccess(input.networkId, input.userId);
  return listFoldersStmt.all({
    network_id: input.networkId,
    parent_folder_id: input.parentFolderId ?? null,
  }) as FolderRow[];
}

export function createFolder(input: {
  networkId: string;
  userId: string;
  parentFolderId?: string | null;
  name: string;
}): { folderId: string } {
  assertNetworkAccess(input.networkId, input.userId);

  if (input.parentFolderId) {
    const parent = findFolderByIdStmt.get(input.parentFolderId) as FolderRow | undefined;
    if (!parent || parent.network_id !== input.networkId || parent.deleted_at) {
      throw new StorageError("Parent folder not found", 404);
    }
  }

  const folderId = randomUUID();
  const timestamp = nowIso();
  insertFolderStmt.run({
    id: folderId,
    network_id: input.networkId,
    parent_folder_id: input.parentFolderId ?? null,
    name: input.name,
    created_at: timestamp,
    updated_at: timestamp,
  });

  writeAuditLog({
    networkId: input.networkId,
    actorUserId: input.userId,
    eventType: "folder.created",
    payload: {
      folderId,
      parentFolderId: input.parentFolderId ?? null,
      name: input.name,
    },
    status: "success",
  });

  return { folderId };
}

export function updateFolder(input: {
  networkId: string;
  userId: string;
  folderId: string;
  name?: string;
  parentFolderId?: string | null;
}): void {
  assertNetworkAccess(input.networkId, input.userId);

  const folder = findFolderByIdStmt.get(input.folderId) as FolderRow | undefined;
  if (!folder || folder.network_id !== input.networkId || folder.deleted_at) {
    throw new StorageError("Folder not found", 404);
  }

  if (input.parentFolderId) {
    const parent = findFolderByIdStmt.get(input.parentFolderId) as FolderRow | undefined;
    if (!parent || parent.network_id !== input.networkId || parent.deleted_at) {
      throw new StorageError("Parent folder not found", 404);
    }
    if (parent.id === folder.id) {
      throw new StorageError("Folder cannot be moved to itself", 400);
    }
  }

  updateFolderStmt.run({
    id: folder.id,
    name: input.name ?? folder.name,
    parent_folder_id:
      input.parentFolderId === undefined ? folder.parent_folder_id : input.parentFolderId,
    updated_at: nowIso(),
  });

  writeAuditLog({
    networkId: input.networkId,
    actorUserId: input.userId,
    eventType: "folder.updated",
    payload: {
      folderId: folder.id,
      name: input.name ?? folder.name,
      parentFolderId:
        input.parentFolderId === undefined ? folder.parent_folder_id : input.parentFolderId,
    },
    status: "success",
  });
}

export function deleteFolder(input: { networkId: string; userId: string; folderId: string }): void {
  assertNetworkAccess(input.networkId, input.userId);

  const folder = findFolderByIdStmt.get(input.folderId) as FolderRow | undefined;
  if (!folder || folder.network_id !== input.networkId || folder.deleted_at) {
    throw new StorageError("Folder not found", 404);
  }

  const timestamp = nowIso();
  const transaction = db.transaction(() => {
    softDeleteFolderStmt.run({
      id: folder.id,
      deleted_at: timestamp,
      updated_at: timestamp,
    });
    softDeleteFilesInFolderStmt.run({
      folder_id: folder.id,
      deleted_at: timestamp,
      updated_at: timestamp,
    });
  });
  transaction();

  writeAuditLog({
    networkId: input.networkId,
    actorUserId: input.userId,
    eventType: "folder.deleted",
    payload: { folderId: folder.id },
    status: "success",
  });
}

export function restoreFolder(input: { networkId: string; userId: string; folderId: string }): void {
  assertNetworkAccess(input.networkId, input.userId);

  const folder = findFolderByIdStmt.get(input.folderId) as FolderRow | undefined;
  if (!folder || folder.network_id !== input.networkId || !folder.deleted_at) {
    throw new StorageError("Folder not found in trash", 404);
  }

  restoreFolderStmt.run({
    id: folder.id,
    updated_at: nowIso(),
  });

  writeAuditLog({
    networkId: input.networkId,
    actorUserId: input.userId,
    eventType: "folder.restored",
    payload: { folderId: folder.id },
    status: "success",
  });
}

export function listFiles(input: {
  networkId: string;
  userId: string;
  folderId?: string | null;
}): FileRow[] {
  assertNetworkAccess(input.networkId, input.userId);
  return listFilesStmt.all({
    network_id: input.networkId,
    folder_id: input.folderId ?? null,
  }) as FileRow[];
}

export function createFile(input: {
  networkId: string;
  userId: string;
  folderId?: string | null;
  name: string;
  sizeBytes?: number;
  mimeType?: string | null;
}): { fileId: string } {
  assertNetworkAccess(input.networkId, input.userId);

  if (input.folderId) {
    const folder = findFolderByIdStmt.get(input.folderId) as FolderRow | undefined;
    if (!folder || folder.network_id !== input.networkId || folder.deleted_at) {
      throw new StorageError("Folder not found", 404);
    }
  }

  const fileId = randomUUID();
  const timestamp = nowIso();
  insertFileStmt.run({
    id: fileId,
    network_id: input.networkId,
    folder_id: input.folderId ?? null,
    name: input.name,
    size_bytes: input.sizeBytes ?? 0,
    mime_type: input.mimeType ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  });

  writeAuditLog({
    networkId: input.networkId,
    actorUserId: input.userId,
    eventType: "file.created",
    payload: {
      fileId,
      folderId: input.folderId ?? null,
      name: input.name,
      sizeBytes: input.sizeBytes ?? 0,
    },
    status: "success",
  });

  return { fileId };
}

export function updateFile(input: {
  networkId: string;
  userId: string;
  fileId: string;
  name?: string;
  folderId?: string | null;
}): void {
  assertNetworkAccess(input.networkId, input.userId);

  const file = findFileByIdStmt.get(input.fileId) as FileRow | undefined;
  if (!file || file.network_id !== input.networkId || file.deleted_at) {
    throw new StorageError("File not found", 404);
  }

  if (input.folderId) {
    const folder = findFolderByIdStmt.get(input.folderId) as FolderRow | undefined;
    if (!folder || folder.network_id !== input.networkId || folder.deleted_at) {
      throw new StorageError("Folder not found", 404);
    }
  }

  updateFileStmt.run({
    id: file.id,
    name: input.name ?? file.name,
    folder_id: input.folderId === undefined ? file.folder_id : input.folderId,
    updated_at: nowIso(),
  });

  writeAuditLog({
    networkId: input.networkId,
    actorUserId: input.userId,
    eventType: "file.updated",
    payload: {
      fileId: file.id,
      name: input.name ?? file.name,
      folderId: input.folderId === undefined ? file.folder_id : input.folderId,
    },
    status: "success",
  });
}

export function deleteFile(input: { networkId: string; userId: string; fileId: string }): void {
  assertNetworkAccess(input.networkId, input.userId);

  const file = findFileByIdStmt.get(input.fileId) as FileRow | undefined;
  if (!file || file.network_id !== input.networkId || file.deleted_at) {
    throw new StorageError("File not found", 404);
  }

  softDeleteFileStmt.run({
    id: file.id,
    deleted_at: nowIso(),
    updated_at: nowIso(),
  });

  writeAuditLog({
    networkId: input.networkId,
    actorUserId: input.userId,
    eventType: "file.deleted",
    payload: { fileId: file.id },
    status: "success",
  });
}

export function restoreFile(input: { networkId: string; userId: string; fileId: string }): void {
  assertNetworkAccess(input.networkId, input.userId);

  const file = findFileByIdStmt.get(input.fileId) as FileRow | undefined;
  if (!file || file.network_id !== input.networkId || !file.deleted_at) {
    throw new StorageError("File not found in trash", 404);
  }

  restoreFileStmt.run({
    id: file.id,
    updated_at: nowIso(),
  });

  writeAuditLog({
    networkId: input.networkId,
    actorUserId: input.userId,
    eventType: "file.restored",
    payload: { fileId: file.id },
    status: "success",
  });
}

export function listTrash(input: {
  networkId: string;
  userId: string;
  type?: "folder" | "file";
}): { folders: FolderRow[]; files: FileRow[] } {
  assertNetworkAccess(input.networkId, input.userId);

  if (input.type === "folder") {
    return {
      folders: listTrashFoldersStmt.all(input.networkId) as FolderRow[],
      files: [],
    };
  }

  if (input.type === "file") {
    return {
      folders: [],
      files: listTrashFilesStmt.all(input.networkId) as FileRow[],
    };
  }

  return {
    folders: listTrashFoldersStmt.all(input.networkId) as FolderRow[],
    files: listTrashFilesStmt.all(input.networkId) as FileRow[],
  };
}

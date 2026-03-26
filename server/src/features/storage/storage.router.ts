import { Response, Router } from "express";
import { z } from "zod";
import { getAuthUser, requireAuth } from "../../middleware/require-auth.js";
import {
  createFile,
  createFolder,
  deleteFile,
  deleteFolder,
  listFiles,
  listFolders,
  listTrash,
  restoreFile,
  restoreFolder,
  StorageError,
  updateFile,
  updateFolder,
} from "./storage.service.js";

const listFoldersQuerySchema = z.object({
  networkId: z.string().uuid(),
  parentFolderId: z.string().uuid().optional(),
});

const createFolderSchema = z.object({
  networkId: z.string().uuid(),
  parentFolderId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
});

const updateFolderSchema = z.object({
  networkId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  parentFolderId: z.string().uuid().nullable().optional(),
});

const listFilesQuerySchema = z.object({
  networkId: z.string().uuid(),
  folderId: z.string().uuid().optional(),
});

const createFileSchema = z.object({
  networkId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  sizeBytes: z.number().int().nonnegative().optional(),
  mimeType: z.string().max(255).nullable().optional(),
});

const updateFileSchema = z.object({
  networkId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

const networkOnlySchema = z.object({
  networkId: z.string().uuid(),
});

const trashQuerySchema = z.object({
  networkId: z.string().uuid(),
  type: z.enum(["folder", "file"]).optional(),
});

export const storageRouter = Router();
storageRouter.use(requireAuth);

function respondWithError(res: Response, error: unknown) {
  if (error instanceof StorageError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return res.status(500).json({ error: "Internal server error" });
}

storageRouter.get("/folders", (req, res) => {
  const parsed = listFoldersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }
  try {
    const folders = listFolders({
      networkId: parsed.data.networkId,
      userId: getAuthUser(req).id,
      parentFolderId: parsed.data.parentFolderId ?? null,
    });
    return res.status(200).json({ folders });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

storageRouter.post("/folders", (req, res) => {
  const parsed = createFolderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }
  try {
    const result = createFolder({
      networkId: parsed.data.networkId,
      userId: getAuthUser(req).id,
      parentFolderId: parsed.data.parentFolderId ?? null,
      name: parsed.data.name,
    });
    return res.status(201).json({ message: "Folder created", folderId: result.folderId });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

storageRouter.patch("/folders/:folderId", (req, res) => {
  const body = updateFolderSchema.safeParse(req.body);
  const params = z.object({ folderId: z.string().uuid() }).safeParse(req.params);
  if (!body.success || !params.success) {
    return res.status(400).json({ error: "Invalid request", details: { body: body.success, params: params.success } });
  }
  try {
    updateFolder({
      networkId: body.data.networkId,
      userId: getAuthUser(req).id,
      folderId: params.data.folderId,
      name: body.data.name,
      parentFolderId: body.data.parentFolderId,
    });
    return res.status(200).json({ message: "Folder updated" });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

storageRouter.delete("/folders/:folderId", (req, res) => {
  const body = networkOnlySchema.safeParse(req.body);
  const params = z.object({ folderId: z.string().uuid() }).safeParse(req.params);
  if (!body.success || !params.success) {
    return res.status(400).json({ error: "Invalid request" });
  }
  try {
    deleteFolder({
      networkId: body.data.networkId,
      userId: getAuthUser(req).id,
      folderId: params.data.folderId,
    });
    return res.status(200).json({ message: "Folder moved to trash" });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

storageRouter.post("/folders/:folderId/restore", (req, res) => {
  const body = networkOnlySchema.safeParse(req.body);
  const params = z.object({ folderId: z.string().uuid() }).safeParse(req.params);
  if (!body.success || !params.success) {
    return res.status(400).json({ error: "Invalid request" });
  }
  try {
    restoreFolder({
      networkId: body.data.networkId,
      userId: getAuthUser(req).id,
      folderId: params.data.folderId,
    });
    return res.status(200).json({ message: "Folder restored from trash" });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

storageRouter.get("/files", (req, res) => {
  const parsed = listFilesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }
  try {
    const files = listFiles({
      networkId: parsed.data.networkId,
      userId: getAuthUser(req).id,
      folderId: parsed.data.folderId ?? null,
    });
    return res.status(200).json({ files });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

storageRouter.post("/files", (req, res) => {
  const parsed = createFileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }
  try {
    const result = createFile({
      networkId: parsed.data.networkId,
      userId: getAuthUser(req).id,
      folderId: parsed.data.folderId ?? null,
      name: parsed.data.name,
      sizeBytes: parsed.data.sizeBytes,
      mimeType: parsed.data.mimeType,
    });
    return res.status(201).json({ message: "File created", fileId: result.fileId });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

storageRouter.patch("/files/:fileId", (req, res) => {
  const body = updateFileSchema.safeParse(req.body);
  const params = z.object({ fileId: z.string().uuid() }).safeParse(req.params);
  if (!body.success || !params.success) {
    return res.status(400).json({ error: "Invalid request" });
  }
  try {
    updateFile({
      networkId: body.data.networkId,
      userId: getAuthUser(req).id,
      fileId: params.data.fileId,
      name: body.data.name,
      folderId: body.data.folderId,
    });
    return res.status(200).json({ message: "File updated" });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

storageRouter.delete("/files/:fileId", (req, res) => {
  const body = networkOnlySchema.safeParse(req.body);
  const params = z.object({ fileId: z.string().uuid() }).safeParse(req.params);
  if (!body.success || !params.success) {
    return res.status(400).json({ error: "Invalid request" });
  }
  try {
    deleteFile({
      networkId: body.data.networkId,
      userId: getAuthUser(req).id,
      fileId: params.data.fileId,
    });
    return res.status(200).json({ message: "File moved to trash" });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

storageRouter.post("/files/:fileId/restore", (req, res) => {
  const body = networkOnlySchema.safeParse(req.body);
  const params = z.object({ fileId: z.string().uuid() }).safeParse(req.params);
  if (!body.success || !params.success) {
    return res.status(400).json({ error: "Invalid request" });
  }
  try {
    restoreFile({
      networkId: body.data.networkId,
      userId: getAuthUser(req).id,
      fileId: params.data.fileId,
    });
    return res.status(200).json({ message: "File restored from trash" });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

storageRouter.get("/trash", (req, res) => {
  const parsed = trashQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }
  try {
    const trash = listTrash({
      networkId: parsed.data.networkId,
      userId: getAuthUser(req).id,
      type: parsed.data.type,
    });
    return res.status(200).json(trash);
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

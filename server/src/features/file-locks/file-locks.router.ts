import { Response, Router } from "express";
import { z } from "zod";
import { getAuthUser, requireAuth } from "../../middleware/require-auth.js";
import {
  acquireFileLock,
  FileLockError,
  getFileLockStatus,
  heartbeatFileLock,
  releaseFileLock,
} from "./file-locks.service.js";

const statusQuerySchema = z.object({
  networkId: z.string().uuid(),
  fileId: z.string().uuid(),
});

const lockBodySchema = z.object({
  networkId: z.string().uuid(),
  fileId: z.string().uuid(),
  deviceId: z.string().uuid().optional(),
});

const unlockBodySchema = z.object({
  networkId: z.string().uuid(),
  fileId: z.string().uuid(),
});

const heartbeatBodySchema = z.object({
  networkId: z.string().uuid(),
  fileId: z.string().uuid(),
});

function respondWithError(res: Response, error: unknown) {
  if (error instanceof FileLockError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return res.status(500).json({ error: "Internal server error" });
}

export const fileLocksRouter = Router();
fileLocksRouter.use(requireAuth);

fileLocksRouter.get("/status", (req, res) => {
  const parsed = statusQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }

  try {
    const status = getFileLockStatus({
      networkId: parsed.data.networkId,
      userId: getAuthUser(req).id,
      fileId: parsed.data.fileId,
    });
    return res.status(200).json(status);
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

fileLocksRouter.post("/lock", (req, res) => {
  const parsed = lockBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  try {
    const result = acquireFileLock({
      networkId: parsed.data.networkId,
      userId: getAuthUser(req).id,
      fileId: parsed.data.fileId,
      deviceId: parsed.data.deviceId,
    });
    return res.status(200).json({
      message: result.alreadyOwned ? "Lock already owned by current user" : "File locked",
      ...result,
    });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

fileLocksRouter.post("/unlock", (req, res) => {
  const parsed = unlockBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  try {
    const result = releaseFileLock({
      networkId: parsed.data.networkId,
      userId: getAuthUser(req).id,
      fileId: parsed.data.fileId,
    });
    return res.status(200).json({
      message: result.released ? "File unlocked" : "File was already unlocked",
      ...result,
    });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

fileLocksRouter.post("/heartbeat", (req, res) => {
  const parsed = heartbeatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  try {
    const result = heartbeatFileLock({
      networkId: parsed.data.networkId,
      userId: getAuthUser(req).id,
      fileId: parsed.data.fileId,
    });
    return res.status(200).json({
      message: result.renewed ? "Lock heartbeat renewed" : "No active lock to renew",
      ...result,
    });
  } catch (error: unknown) {
    return respondWithError(res, error);
  }
});

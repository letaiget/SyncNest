import { Router } from "express";
import { z } from "zod";
import {
  connectDevice,
  disconnectDevice,
  DevicesError,
  listDevices,
} from "./devices.service.js";
import { getAuthUser, requireAuth } from "../../middleware/require-auth.js";

const listDevicesQuerySchema = z.object({
  networkId: z.string().uuid(),
});

const connectDeviceSchema = z.object({
  networkId: z.string().uuid(),
  name: z.string().min(2).max(128),
  computerName: z.string().min(2).max(128),
  ipAddress: z.string().min(3).max(64),
  connectionType: z.enum(["local", "internet"]),
});

const disconnectDeviceSchema = z.object({
  networkId: z.string().uuid(),
});

export const devicesRouter = Router();

devicesRouter.use(requireAuth);

devicesRouter.get("/", (req, res) => {
  const parsed = listDevicesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query",
      details: parsed.error.flatten(),
    });
  }

  try {
    const devices = listDevices({
      networkId: parsed.data.networkId,
      userId: getAuthUser(req).id,
    });
    return res.status(200).json({ devices });
  } catch (error: unknown) {
    if (error instanceof DevicesError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

devicesRouter.post("/connect", (req, res) => {
  const parsed = connectDeviceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = connectDevice({
      networkId: parsed.data.networkId,
      userId: getAuthUser(req).id,
      name: parsed.data.name,
      computerName: parsed.data.computerName,
      ipAddress: parsed.data.ipAddress,
      connectionType: parsed.data.connectionType,
    });
    return res.status(201).json({
      message: "Device connected",
      deviceId: result.deviceId,
    });
  } catch (error: unknown) {
    if (error instanceof DevicesError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

devicesRouter.post("/:deviceId/disconnect", (req, res) => {
  const bodyParsed = disconnectDeviceSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: bodyParsed.error.flatten(),
    });
  }

  const paramsParsed = z.object({ deviceId: z.string().uuid() }).safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({
      error: "Invalid route params",
      details: paramsParsed.error.flatten(),
    });
  }

  try {
    disconnectDevice({
      networkId: bodyParsed.data.networkId,
      userId: getAuthUser(req).id,
      deviceId: paramsParsed.data.deviceId,
    });
    return res.status(200).json({ message: "Device disconnected" });
  } catch (error: unknown) {
    if (error instanceof DevicesError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

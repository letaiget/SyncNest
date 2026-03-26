import { Router } from "express";
import { z } from "zod";
import { getAuthUser, requireAuth } from "../../middleware/require-auth.js";
import { createNetwork, listNetworks } from "./networks.service.js";

const createNetworkSchema = z.object({
  name: z.string().min(2).max(128),
});

export const networksRouter = Router();

networksRouter.use(requireAuth);

networksRouter.get("/", (req, res) => {
  const networks = listNetworks({ ownerUserId: getAuthUser(req).id });
  return res.status(200).json({ networks });
});

networksRouter.post("/", (req, res) => {
  const parsed = createNetworkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  const result = createNetwork({
    ownerUserId: getAuthUser(req).id,
    name: parsed.data.name,
  });

  return res.status(201).json({
    message: "Network created",
    networkId: result.networkId,
  });
});

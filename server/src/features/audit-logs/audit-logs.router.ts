import { Router } from "express";
import { z } from "zod";
import { getAuthUser, requireAuth } from "../../middleware/require-auth.js";
import { AuditLogsError, listAuditLogs } from "./audit-logs.service.js";

const querySchema = z.object({
  networkId: z.string().uuid(),
  eventType: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const auditLogsRouter = Router();

auditLogsRouter.use(requireAuth);

auditLogsRouter.get("/", (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query",
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = listAuditLogs({
      networkId: parsed.data.networkId,
      userId: getAuthUser(req).id,
      eventType: parsed.data.eventType,
      status: parsed.data.status,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });

    return res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof AuditLogsError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

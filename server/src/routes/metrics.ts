import { Router } from "express";
import { getMetricsText } from "../metrics/metrics.js";

export const metricsRouter = Router();

metricsRouter.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.status(200).send(getMetricsText());
});

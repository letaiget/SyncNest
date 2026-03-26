import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { authRouter } from "./features/auth/auth.router.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(morgan("dev"));

  app.get("/", (_req, res) => {
    res.status(200).json({
      name: "SyncNest Server",
      version: "0.1.0",
      docs: "See repository README for current status",
    });
  });

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);

  return app;
}

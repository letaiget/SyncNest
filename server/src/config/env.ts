import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_PATH: z.string().min(1).default("./data/syncnest.db"),
  FILE_LOCK_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  CLEANUP_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
});

export const env = envSchema.parse(process.env);

import { NextFunction, Request, Response } from "express";
import { db } from "../db/sqlite.js";
import { getAuthUser } from "./require-auth.js";

export function requireSystemOwnerScope(req: Request, res: Response, next: NextFunction): void {
  const user = getAuthUser(req);
  const row = db
    .prepare("SELECT 1 as ok FROM networks WHERE owner_user_id = ? LIMIT 1")
    .get(user.id) as { ok: number } | undefined;

  if (!row?.ok) {
    res.status(403).json({ error: "Forbidden system endpoint access" });
    return;
  }

  next();
}

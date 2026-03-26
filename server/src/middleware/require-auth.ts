import { Request, Response, NextFunction } from "express";
import { AuthError, getCurrentUserFromToken } from "../features/auth/auth.service.js";

export type AuthenticatedUser = {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

function getBearerToken(rawHeader: string | undefined): string | null {
  if (!rawHeader) {
    return null;
  }
  const [scheme, token] = rawHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  try {
    const user = getCurrentUserFromToken(token);
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

export function getAuthUser(req: Request): AuthenticatedUser {
  return (req as unknown as AuthenticatedRequest).user;
}

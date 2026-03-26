import { Router } from "express";
import { z } from "zod";
import {
  AuthError,
  confirmRegistration,
  getCurrentUserFromToken,
  login,
  logoutAllByUser,
  logoutByAccessToken,
  refreshAccessToken,
  requestRegistrationCode,
} from "./auth.service.js";
import { getAuthUser, requireAuth } from "../../middleware/require-auth.js";
import { createRateLimiter } from "../../middleware/rate-limit.js";

const requestCodeSchema = z.object({
  username: z.string().min(3).max(32),
  email: z.email(),
  password: z.string().min(8).max(128),
});

const confirmSchema = z.object({
  email: z.email(),
  code: z.string().length(6),
});

const loginSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(32),
});

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

export const authRouter = Router();

const requestCodeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: "Too many verification code requests. Please try again later.",
});

const loginLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  message: "Too many login attempts. Please try again later.",
});

const refreshLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  message: "Too many token refresh attempts. Please try again later.",
});

authRouter.post("/register/request-code", requestCodeLimiter, (req, res) => {
  const parsed = requestCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = requestRegistrationCode(parsed.data);
    return res.status(201).json({
      message: "Verification code created",
      expiresAt: result.expiresAt,
      verificationCode: result.verificationCode,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/register/confirm", (req, res) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  try {
    const user = confirmRegistration(parsed.data);
    return res.status(201).json({
      message: "Registration completed",
      user,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/login", loginLimiter, (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  try {
    const session = login(parsed.data);
    return res.status(200).json(session);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/refresh", refreshLimiter, (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  try {
    const refreshed = refreshAccessToken(parsed.data);
    return res.status(200).json(refreshed);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.get("/me", (req, res) => {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const user = getCurrentUserFromToken(token);
    return res.status(200).json({ user });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/logout", (req, res) => {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    logoutByAccessToken(token);
    return res.status(200).json({ message: "Logged out" });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/logout-all", requireAuth, (req, res) => {
  try {
    const result = logoutAllByUser(getAuthUser(req).id);
    return res.status(200).json({
      message: "Logged out from all sessions",
      revokedSessions: result.revokedSessions,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

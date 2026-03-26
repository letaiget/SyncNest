import { Router } from "express";
import { z } from "zod";
import {
  AuthError,
  confirmRegistration,
  getCurrentUserFromToken,
  login,
  requestRegistrationCode,
} from "./auth.service.js";

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

authRouter.post("/register/request-code", (req, res) => {
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

authRouter.post("/login", (req, res) => {
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

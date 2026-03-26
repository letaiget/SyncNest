import { Request, Response, NextFunction } from "express";

type Bucket = {
  count: number;
  resetAtMs: number;
};

const buckets = new Map<string, Bucket>();

function getClientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
  const ip = forwardedIp || req.ip || req.socket.remoteAddress || "unknown";
  return `${ip}:${req.path}`;
}

export function createRateLimiter(config: {
  windowMs: number;
  maxRequests: number;
  message: string;
}) {
  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    const key = getClientKey(req);
    const existing = buckets.get(key);

    if (!existing || now >= existing.resetAtMs) {
      buckets.set(key, {
        count: 1,
        resetAtMs: now + config.windowMs,
      });
      next();
      return;
    }

    existing.count += 1;
    buckets.set(key, existing);

    if (existing.count > config.maxRequests) {
      const retryAfterSeconds = Math.ceil((existing.resetAtMs - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: config.message,
        retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

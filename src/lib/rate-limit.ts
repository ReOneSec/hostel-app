import { NextRequest } from "next/server";

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

const LIMITS: Record<string, RateLimitConfig> = {
  login: { max: 10, windowMs: 60 * 1000 }, // 10/min per IP
  api: { max: 300, windowMs: 60 * 1000 }, // 300/min per user/IP
  uploads: { max: 20, windowMs: 60 * 60 * 1000 }, // 20/hour per user
  announcements_compose: { max: 30, windowMs: 60 * 60 * 1000 }, // 30/hour per sender
};

// In-memory sliding window bucket store
const store = new Map<string, { count: number; resetAt: number }>();

// Periodic memory clean-up
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.resetAt <= now) {
      store.delete(key);
    }
  }
}, 60 * 1000);

export function getClientIp(req: NextRequest | Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  retryAfter: number; // in seconds
}

export function checkRateLimit(
  key: string,
  type: keyof typeof LIMITS = "api"
): RateLimitResult {
  const config = LIMITS[type];
  const now = Date.now();
  const bucketKey = `${type}:${key}`;

  const current = store.get(bucketKey);

  if (!current || current.resetAt <= now) {
    store.set(bucketKey, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      success: true,
      limit: config.max,
      remaining: config.max - 1,
      retryAfter: Math.ceil(config.windowMs / 1000),
    };
  }

  if (current.count >= config.max) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return {
      success: false,
      limit: config.max,
      remaining: 0,
      retryAfter,
    };
  }

  current.count += 1;
  return {
    success: true,
    limit: config.max,
    remaining: config.max - current.count,
    retryAfter: Math.ceil((current.resetAt - now) / 1000),
  };
}

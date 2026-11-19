/**
 * Shared rate limits for the crew endpoints.
 *
 * Uses Upstash Redis (UPSTASH_REDIS_REST_URL/TOKEN, or the Vercel KV
 * KV_REST_API_URL/TOKEN pair) so limits hold across serverless instances.
 * Without Redis it falls back to the in-process limiter, which is only a
 * speed bump — fine for development, not something to rely on in production.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { checkRateLimit } from "@/lib/rate-limit";

export type LimitName = "applications" | "uploadToken";

const LIMITS: Record<LimitName, { max: number; windowMs: number; window: `${number} ${"s" | "m" | "h" | "d"}` }> = {
  // The spec: 3 applications per IP per day.
  applications: { max: 3, windowMs: 24 * 60 * 60 * 1000, window: "1 d" },
  uploadToken: { max: 10, windowMs: 60 * 60 * 1000, window: "1 h" },
};

let redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

const limiters = new Map<LimitName, Ratelimit>();

export async function limit(name: LimitName, key: string): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const cfg = LIMITS[name];
  const r = getRedis();
  if (!r) {
    const res = checkRateLimit(`crew:${name}:${key}`, { max: cfg.max, windowMs: cfg.windowMs });
    return { ok: !res.limited, retryAfterSeconds: res.retryAfterSeconds };
  }
  let limiter = limiters.get(name);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(cfg.max, cfg.window),
      prefix: `crew:${name}`,
    });
    limiters.set(name, limiter);
  }
  const res = await limiter.limit(key);
  return { ok: res.success, retryAfterSeconds: Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)) };
}

export function tooMany(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

/**
 * A small in-process rate limiter.
 *
 * A serverless instance is short-lived and several may run at once, so this is
 * a speed bump rather than a guarantee. It is enough to stop a single client
 * hammering an endpoint, and it costs no extra infrastructure. Swap in a shared
 * store (e.g. @upstash/ratelimit) if abuse becomes a real problem.
 */

type Bucket = number[];

const buckets = new Map<string, Bucket>();

/** Stop the map growing without bound on a long-lived instance. */
const MAX_TRACKED_KEYS = 1000;

export type RateLimitOptions = {
  /** Length of the sliding window. */
  windowMs: number;
  /** Requests permitted within the window. */
  max: number;
};

export type RateLimitResult = {
  limited: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Seconds until the window frees up, for a Retry-After header. */
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  { windowMs, max }: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [k, times] of buckets) {
      if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  const limited = hits.length > max;

  return {
    limited,
    remaining: Math.max(0, max - hits.length),
    retryAfterSeconds: limited
      ? Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000))
      : 0,
  };
}

/** Derive a limiter key from the request's apparent origin. */
export function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Clear all state. Intended for tests, which must not leak counts into each other. */
export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Fixed-window in-memory limiter. Enough for a single-instance MVP; swap for
 * Upstash Redis (or any shared store) before running more than one instance.
 */
const WINDOW_MS = 60_000;
const DEFAULT_MAX = 20;
// Past this many tracked keys, lapsed windows are swept so the map can't grow forever.
const SWEEP_THRESHOLD = 10_000;

const hits = new Map<string, { count: number; resetAt: number }>();

function sweepExpired(now: number) {
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
}

export function rateLimit(key: string, options: { max?: number } = {}) {
  const max = options.max ?? DEFAULT_MAX;
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    if (hits.size >= SWEEP_THRESHOLD) sweepExpired(now);
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: max - 1, retryAfter: 0 };
  }

  entry.count += 1;
  return {
    ok: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Best-effort client IP. Forwarded headers are only trustworthy behind a proxy
 * that overwrites them (Vercel does); otherwise a client can set its own.
 */
export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}

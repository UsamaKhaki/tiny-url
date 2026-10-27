/**
 * Fixed-window in-memory limiter. Enough for a single-instance MVP; swap for
 * Upstash Redis (or any shared store) before running more than one instance.
 */
const WINDOW_MS = 60_000;
const DEFAULT_MAX = 20;

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, options: { max?: number } = {}) {
  const max = options.max ?? DEFAULT_MAX;
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
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

export function clientKey(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

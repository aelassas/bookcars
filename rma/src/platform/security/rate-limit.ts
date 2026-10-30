// Dependency-free, in-memory fixed-window rate limiter.
//
// ⚠️  CAVEAT — PER-INSTANCE / BEST-EFFORT ONLY.
// The counters live in a module-level Map, so they are scoped to a single
// process. On serverless/edge (Vercel functions, multiple Node instances)
// each instance keeps its own window, so the effective limit is
// `limit × instanceCount`, and cold starts reset the window entirely. This
// is deliberately a cheap first line of defence against email-spam and
// webhook floods — NOT a hard quota.
//
// TODO(durable-rate-limit): Replace the in-memory store with a shared
// backend (Postgres row-lock/upsert counter or Redis INCR+EXPIRE) so the
// limit holds across all instances. Keep this same `rateLimit()` signature
// and swap the store implementation. Do not add Redis until that work is
// scheduled — see ADR-001 §11 / production-readiness plan.

interface Bucket {
  /** Epoch ms when the current window ends and the count resets. */
  resetAt: number;
  /** Requests seen in the current window. */
  count: number;
}

export interface RateLimitResult {
  /** True when the request is within budget and should proceed. */
  ok: boolean;
  /** Requests remaining in the current window (0 when limited). */
  remaining: number;
  /** Epoch ms when the window resets. */
  resetAt: number;
  /** Seconds until reset — handy for a Retry-After header. */
  retryAfter: number;
}

const store = new Map<string, Bucket>();

// Opportunistic GC: on every call we may prune a handful of expired buckets
// so a long-lived process doesn't grow the Map unbounded under key churn.
function sweep(now: number): void {
  if (store.size < 5_000) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
    if (store.size < 5_000) break;
  }
}

export interface RateLimitOptions {
  /** Unique identifier for the caller (e.g. `magiclink:1.2.3.4:user@x.com`). */
  key: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * Fixed-window counter. Returns `ok:false` once `limit` requests have been
 * seen within `windowMs` for the given `key`. Best-effort, per-instance —
 * see the file header caveat.
 */
export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);

  let bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { resetAt: now + windowMs, count: 0 };
    store.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfter = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    ok: bucket.count <= limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfter,
  };
}

/**
 * Best-effort client IP from proxy headers. Vercel/most proxies set
 * `x-forwarded-for` (comma-separated, client first). Falls back to
 * `x-real-ip`, then a fixed token so callers still get a stable-ish key.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// Dependency-free, in-memory per-account login lockout.
//
// Companion to ./rate-limit.ts (same deliberate trade-offs): a fixed-window
// limiter throttles REQUESTS, this one counts consecutive FAILED logins per
// account key and locks the key after MAX_FAILURES. Used by the name+PIN
// credentials provider (platform/auth/index.ts) so a remote attacker cannot
// brute-force 4-digit PINs: the PIN space is only 10k, so an unthrottled
// door falls in minutes.
//
// ⚠️  CAVEAT — PER-INSTANCE / BEST-EFFORT ONLY.
// Counters live in a module-level Map, scoped to a single process; multiple
// instances each keep their own counters (effective budget is
// MAX_FAILURES × instanceCount) and a restart clears all locks. This is a
// first line of defence, not a hard quota.
//
// TODO(durable-rate-limit): When the shared backend for rate-limit.ts lands
// (Postgres row-lock/upsert or Redis), move this store there too and keep
// these signatures.

/** Consecutive failures that trigger a lock. */
export const LOGIN_LOCK_MAX_FAILURES = 5;
/** How long a key stays locked once triggered. */
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

interface Entry {
  /** Consecutive failed attempts since the last success/lock expiry. */
  failures: number;
  /** Epoch ms until which the key is locked; 0 when not locked. */
  lockedUntil: number;
}

const store = new Map<string, Entry>();

// Opportunistic GC, same pattern as rate-limit.ts: prune stale entries once
// the Map grows so a long-lived process doesn't leak under key churn.
// Entries past their lock are safe to drop — an expired lock restarts the
// failure count from zero anyway.
function sweep(now: number): void {
  if (store.size < 5_000) return;
  for (const [key, entry] of store) {
    if (entry.lockedUntil <= now) store.delete(key);
    if (store.size < 5_000) break;
  }
}

/**
 * Lock check — call BEFORE any credential work (DB lookup, PIN compare) so a
 * locked account refuses every attempt identically and a correct PIN during
 * the lock window is indistinguishable from a wrong one (no timing oracle).
 */
export function isLoginLocked(key: string): { locked: boolean; retryAfter: number } {
  const now = Date.now();
  sweep(now);
  const entry = store.get(key);
  const locked = !!entry && entry.lockedUntil > now;
  return {
    locked,
    retryAfter: locked ? Math.ceil((entry.lockedUntil - now) / 1000) : 0,
  };
}

export interface RecordFailureResult {
  /** True when the key is locked after this failure. */
  locked: boolean;
  /** True only on the failure that ENGAGED the lock — log once on this. */
  justLocked: boolean;
}

/**
 * Count one failed attempt for the key. The failure that reaches
 * LOGIN_LOCK_MAX_FAILURES engages a LOGIN_LOCK_MS lock and resets the
 * counter, so after the lock expires the budget starts fresh.
 */
export function recordLoginFailure(key: string): RecordFailureResult {
  const now = Date.now();
  sweep(now);

  let entry = store.get(key);
  if (!entry || (entry.lockedUntil > 0 && entry.lockedUntil <= now)) {
    entry = { failures: 0, lockedUntil: 0 };
    store.set(key, entry);
  }

  entry.failures += 1;
  if (entry.failures >= LOGIN_LOCK_MAX_FAILURES) {
    entry.lockedUntil = now + LOGIN_LOCK_MS;
    entry.failures = 0;
    return { locked: true, justLocked: true };
  }
  return { locked: false, justLocked: false };
}

/** Successful login — forget the failure streak for the key. */
export function clearLoginFailures(key: string): void {
  store.delete(key);
}

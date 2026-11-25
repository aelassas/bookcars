// Per-account login lockout (security/login-lockout.ts) — the throttle that
// keeps the name+PIN door from being brute-forced. The contract under test:
//   1. fewer than MAX consecutive failures → NOT locked
//   2. the MAX-th consecutive failure engages a 15-min lock (justLocked once)
//   3. while locked, further failures neither extend the lock nor re-report
//      justLocked (the caller logs exactly once)
//   4. the lock expires after LOGIN_LOCK_MS and the budget restarts
//   5. clearLoginFailures() (a successful login) resets the streak
//   6. keys are independent — locking one name never touches another
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  clearLoginFailures,
  isLoginLocked,
  recordLoginFailure,
  LOGIN_LOCK_MAX_FAILURES,
  LOGIN_LOCK_MS,
} from "./login-lockout";

const KEY = "азиз"; // normalized (trim/lower) name, as authorize() keys it

describe("login lockout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T12:00:00Z"));
    clearLoginFailures(KEY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays unlocked below the failure budget", () => {
    for (let i = 0; i < LOGIN_LOCK_MAX_FAILURES - 1; i++) {
      const r = recordLoginFailure(KEY);
      expect(r.locked).toBe(false);
      expect(r.justLocked).toBe(false);
    }
    expect(isLoginLocked(KEY).locked).toBe(false);
  });

  it("locks on the MAX-th consecutive failure and reports justLocked once", () => {
    let last = { locked: false, justLocked: false };
    for (let i = 0; i < LOGIN_LOCK_MAX_FAILURES; i++) {
      last = recordLoginFailure(KEY);
    }
    expect(last).toEqual({ locked: true, justLocked: true });

    const check = isLoginLocked(KEY);
    expect(check.locked).toBe(true);
    expect(check.retryAfter).toBeGreaterThan(0);
    expect(check.retryAfter).toBeLessThanOrEqual(LOGIN_LOCK_MS / 1000);
  });

  it("locked attempts do not extend the lock nor re-report justLocked", () => {
    for (let i = 0; i < LOGIN_LOCK_MAX_FAILURES; i++) recordLoginFailure(KEY);

    vi.advanceTimersByTime(5 * 60 * 1000); // 5 min into the lock
    const before = isLoginLocked(KEY).retryAfter;

    const r = recordLoginFailure(KEY); // attacker keeps hammering
    expect(r.justLocked).toBe(false);
    expect(isLoginLocked(KEY).retryAfter).toBeLessThanOrEqual(before);
  });

  it("expires after LOGIN_LOCK_MS and restarts the budget from zero", () => {
    for (let i = 0; i < LOGIN_LOCK_MAX_FAILURES; i++) recordLoginFailure(KEY);
    expect(isLoginLocked(KEY).locked).toBe(true);

    vi.advanceTimersByTime(LOGIN_LOCK_MS + 1);
    expect(isLoginLocked(KEY).locked).toBe(false);

    // Budget restarted: MAX-1 fresh failures must NOT re-lock.
    for (let i = 0; i < LOGIN_LOCK_MAX_FAILURES - 1; i++) {
      expect(recordLoginFailure(KEY).locked).toBe(false);
    }
  });

  it("a successful login (clearLoginFailures) resets the streak", () => {
    for (let i = 0; i < LOGIN_LOCK_MAX_FAILURES - 1; i++) recordLoginFailure(KEY);
    clearLoginFailures(KEY);
    for (let i = 0; i < LOGIN_LOCK_MAX_FAILURES - 1; i++) {
      expect(recordLoginFailure(KEY).locked).toBe(false);
    }
  });

  it("keys are independent", () => {
    for (let i = 0; i < LOGIN_LOCK_MAX_FAILURES; i++) recordLoginFailure(KEY);
    expect(isLoginLocked(KEY).locked).toBe(true);
    expect(isLoginLocked("ольга").locked).toBe(false);
  });
});

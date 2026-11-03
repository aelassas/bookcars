import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Guards the OTHER boundary action-guards.test.ts does not cover: API route
 * handlers.
 *
 * Verified live on the RMA box 2026-11-03: the middleware login redirect does
 * NOT run for /api/* route handlers — pages 307 to /login, but every route
 * handler answers unauthenticated requests from its own code. So the ONLY
 * thing standing between the internet and a route handler is the handler
 * itself. A new route.ts without an auth check is open by default.
 *
 * Unlike server actions, routes legitimately authenticate in several ways
 * (session, path token, HMAC signature, env-shared token), so the rule is
 * textual: every route.ts must contain at least one known guard marker, or
 * carry an allowlist entry with the reason it is safe without one.
 * Adding an allowlist entry is a security decision — justify it, don't
 * use it to silence the test.
 */

const APP = join(import.meta.dirname, "../../app");

/** Known authentication/authorization markers, any one of which passes. */
const GUARD_MARKERS: RegExp[] = [
  /\bauth\(\)/, // NextAuth session check
  /\brequireAuth\b/,
  /\bgetActiveTenant\b|\brequireActiveTenant\b/,
  /\bcan[A-Z][A-Za-z]+\(/, // canManageLines(), canUseAvailability(), …
  /\bisPlatformAdmin\b|\brequirePlatformAdmin\b|\brequireRoleForTenant\b/,
  /\bassertTenantMember\b|\bverifyAdmin\b/,
  /\btimingSafeEqual\b/, // shared-secret comparison
  /\bverify[A-Z][A-Za-z]+\(/, // verifyMetaSignature(), verifyMediaToken(), …
  /process\.env\.[A-Z0-9_]*TOKEN\b/, // env-gated token webhooks
  /\brateLimit\(/, // deliberate public endpoints still carry a flood guard
];

/**
 * Routes that are safe with no marker, each with its reason. The public lead
 * form is NOT here on purpose: it must carry its own rate limit, which is
 * itself a marker-bearing guard.
 */
const ALLOWLIST = new Map<string, string>([
  // The NextAuth handler IS the authentication provider; nothing to guard.
  ["api/auth/[...nextauth]/route.ts", "NextAuth provider handler itself"],
  // Thin shells: both delegate to handler.ts, which verifies the shared
  // JIVO_WEBHOOK_TOKEN (query or path segment) before touching anything.
  ["api/webhooks/jivo/route.ts", "auth lives in jivo/handler.ts (shared token)"],
  ["api/webhooks/jivo/[token]/route.ts", "auth lives in jivo/handler.ts (shared token)"],
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry === "route.ts" || entry === "route.tsx") out.push(full);
  }
  return out;
}

describe("every API route handler authenticates", () => {
  const offenders: string[] = [];
  const checked: string[] = [];

  for (const file of walk(APP)) {
    const rel = relative(APP, file);
    if (ALLOWLIST.has(rel)) continue;
    checked.push(rel);
    const text = readFileSync(file, "utf8");
    if (!GUARD_MARKERS.some((re) => re.test(text))) offenders.push(rel);
  }

  it("finds the routes it is meant to police", () => {
    expect(checked.length).toBeGreaterThan(15);
  });

  it("has no route handler without an auth guard", () => {
    expect(
      offenders,
      offenders.length
        ? `These route handlers contain no authentication marker, and the ` +
          `middleware redirect does NOT cover /api/* — they are reachable ` +
          `unauthenticated right now:\n  ${offenders.join("\n  ")}\n\n` +
          `Add a session check (getActiveTenant / auth()) or a token/HMAC ` +
          `verification as the first statement of every exported handler.`
        : undefined,
    ).toEqual([]);
  });
});

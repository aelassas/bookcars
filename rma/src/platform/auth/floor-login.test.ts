// The floor-login mint gate. authorizeFloorName() is the single choke point
// that decides whether tapping a name mints a session, so its refusals are
// the security contract:
//   1. flag off  → null (and MUST NOT even touch the DB)
//   2. flag on, request NOT from the office LAN → null (no DB touch either)
//   3. flag on, non-sales-line roles (admin/CEO/…) → null
//   4. flag on, on-LAN, pure sales-line member → the user object
//
// We mock the seams it depends on — the DB row, the env flag and the request
// headers — and run the real gate (incl. the real isSalesLineOnly AND the
// real clientIp/isOfficeLan) so dropping any check fails this test.
// `@/platform/auth/index` is stubbed so importing the gate (via
// authorization.ts → index.ts) doesn't boot the real NextAuth config;
// `server-only` is stubbed because vitest's node env is not a react-server
// condition; `next/headers` is stubbed because there is no request scope.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Controllable single-row result for db.select()...limit(1).
let dbRow: unknown[] = [];
const selectSpy = vi.fn();

// Controllable client IP, delivered through the same header server.cjs
// stamps in production. Empty string → header absent (fail-closed path).
let requestIp = "10.255.254.42"; // on-LAN by default
vi.mock("next/headers", () => ({
  headers: async () => new Headers(requestIp ? { "x-real-ip": requestIp } : {}),
}));

// device.ts guards itself with `server-only`, which throws outside a
// react-server condition; stub the marker so the REAL helpers run.
vi.mock("server-only", () => ({}));

vi.mock("@/platform/db/client", () => {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.innerJoin = () => chain;
  chain.where = () => chain;
  chain.limit = () => Promise.resolve(dbRow);
  return {
    db: {
      select: (...args: unknown[]) => {
        selectSpy(...args);
        return chain;
      },
    },
    pool: {},
  };
});

// Stub the NextAuth barrel so authorization.ts's `import { auth } from
// "./index"` doesn't construct the real Auth.js instance during the test.
vi.mock("@/platform/auth/index", () => ({ auth: vi.fn() }));

import { authorizeFloorName } from "./floor-login";

const SALES_USER = [
  { id: "u-1", email: "sales@example.com", name: "Азиз", image: null, roles: ["sales"] },
];
const MANAGER_USER = [
  { id: "u-2", email: "mgr@example.com", name: "Ольга", image: null, roles: ["sales_manager", "general_manager"] },
];
const ADMIN_USER = [
  { id: "u-3", email: "boss@example.com", name: "CEO", image: null, roles: ["tenant_admin", "sales"] },
];

describe("authorizeFloorName — the floor-login mint gate", () => {
  const OLD_ENV = process.env.FLOOR_LOGIN_ENABLED;

  beforeEach(() => {
    dbRow = [];
    requestIp = "10.255.254.42"; // on-LAN unless a test says otherwise
    selectSpy.mockClear();
  });
  afterEach(() => {
    if (OLD_ENV === undefined) delete process.env.FLOOR_LOGIN_ENABLED;
    else process.env.FLOOR_LOGIN_ENABLED = OLD_ENV;
  });

  it("rejects when the flag is off — without touching the DB", async () => {
    delete process.env.FLOOR_LOGIN_ENABLED;
    dbRow = SALES_USER; // even a valid member must be denied
    const out = await authorizeFloorName({ userId: "u-1", tenantSlug: "take-auto" });
    expect(out).toBeNull();
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it("rejects an off-LAN request — without touching the DB", async () => {
    process.env.FLOOR_LOGIN_ENABLED = "true";
    dbRow = SALES_USER; // even a valid member must be denied
    requestIp = "203.0.113.7"; // public internet
    const out = await authorizeFloorName({ userId: "u-1", tenantSlug: "take-auto" });
    expect(out).toBeNull();
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it("rejects when no client-IP header is present (fail closed)", async () => {
    process.env.FLOOR_LOGIN_ENABLED = "true";
    dbRow = SALES_USER;
    requestIp = ""; // bare `next start`/dev — server.cjs never stamped the IP
    const out = await authorizeFloorName({ userId: "u-1", tenantSlug: "take-auto" });
    expect(out).toBeNull();
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it("rejects a privileged (admin/CEO) member even with the flag on", async () => {
    process.env.FLOOR_LOGIN_ENABLED = "true";
    dbRow = ADMIN_USER;
    const out = await authorizeFloorName({ userId: "u-3", tenantSlug: "take-auto" });
    expect(out).toBeNull();
  });

  it("accepts a pure sales member with the flag on", async () => {
    process.env.FLOOR_LOGIN_ENABLED = "true";
    dbRow = SALES_USER;
    const out = await authorizeFloorName({ userId: "u-1", tenantSlug: "take-auto" });
    expect(out).toEqual({ id: "u-1", email: "sales@example.com", name: "Азиз", image: null });
  });

  it("accepts a sales-line manager (sales_manager/general_manager)", async () => {
    process.env.FLOOR_LOGIN_ENABLED = "true";
    dbRow = MANAGER_USER;
    const out = await authorizeFloorName({ userId: "u-2", tenantSlug: "take-auto" });
    expect(out).toEqual({ id: "u-2", email: "mgr@example.com", name: "Ольга", image: null });
  });

  it("rejects a non-member (no row) with the flag on", async () => {
    process.env.FLOOR_LOGIN_ENABLED = "true";
    dbRow = [];
    const out = await authorizeFloorName({ userId: "u-9", tenantSlug: "take-auto" });
    expect(out).toBeNull();
  });

  it("rejects when required inputs are missing", async () => {
    process.env.FLOOR_LOGIN_ENABLED = "true";
    dbRow = SALES_USER;
    expect(await authorizeFloorName({ userId: "", tenantSlug: "take-auto" })).toBeNull();
    expect(await authorizeFloorName({ userId: "u-1", tenantSlug: "" })).toBeNull();
  });
});

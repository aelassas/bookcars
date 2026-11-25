import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  getLineStatus,
  phoneFromCreds,
  phoneFromRegistry,
  listLines,
  relinkCooldownOk,
  relinkCooldownUntil,
  isKnownLine,
  isRelinkableLine,
  isValidLineName,
  PAIR_PHONE_RE,
  RELINK_COOLDOWN_MS,
} from "./registry";
import { LINE_TENANT } from "@/modules/messaging/lines";

/** All tenants the fixture lines map to — stands in for the DB tenant table
 *  so listLines' deployment filter lets every fixture line through. */
const ALL_TENANTS = new Set(Object.values(LINE_TENANT));

/**
 * Fixture observer dir — mirrors the files wa-observer/bridge.js writes:
 *   session-<slug>/creds.json   the live session (phone source)
 *   status-<slug>.json          connection state snapshot (additive, 2026-09)
 *   observed-<slug>.jsonl       traffic log — mtime = last activity
 *   connect-fails-<slug>.json   2-strike ban-protection counter
 *   qr-<slug>.txt / pair-code-<slug>.txt   pending pairing artifacts
 *   relink-<slug>.stamp         relink cooldown stamp
 */
let dir: string;
const now = Date.now();

function touch(file: string, ageMs = 0) {
  writeFileSync(path.join(dir, file), "x\n");
  const t = new Date(now - ageMs);
  utimesSync(path.join(dir, file), t, t);
}

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "wa-lines-"));

  // babek-rent: healthy, linked, active
  mkdirSync(path.join(dir, "session-babek-rent"), { recursive: true });
  writeFileSync(
    path.join(dir, "session-babek-rent", "creds.json"),
    JSON.stringify({ me: { id: "971529965085:12@s.whatsapp.net" } })
  );
  writeFileSync(
    path.join(dir, "status-babek-rent.json"),
    JSON.stringify({ state: "open", at: new Date(now - 60_000).toISOString(), phone: "971529965085" })
  );
  touch("observed-babek-rent.jsonl", 5 * 60_000);

  // cardiwan: open but silent for 7h — the deaf-line failure mode
  mkdirSync(path.join(dir, "session-cardiwan"));
  writeFileSync(
    path.join(dir, "status-cardiwan.json"),
    JSON.stringify({ state: "open", at: new Date(now - 8 * 3600_000).toISOString() })
  );
  touch("observed-cardiwan.jsonl", 7 * 3600_000);

  // ayham-rent: QR waiting to be scanned (relink archived the session)
  touch("qr-ayham-rent.txt");
  writeFileSync(
    path.join(dir, "status-ayham-rent.json"),
    JSON.stringify({ state: "qr", at: new Date(now - 30_000).toISOString() })
  );

  // mohamed-etm: pairing code waiting to be typed
  touch("pair-code-mohamed-etm.txt");
  writeFileSync(
    path.join(dir, "status-mohamed-etm.json"),
    JSON.stringify({ state: "close", at: new Date(now - 30_000).toISOString(), code: 515 })
  );

  // etm-website: dropped, reconnecting
  mkdirSync(path.join(dir, "session-etm-website"));
  writeFileSync(
    path.join(dir, "status-etm-website.json"),
    JSON.stringify({ state: "close", at: new Date(now - 10_000).toISOString(), code: 428 })
  );

  // babek-rent-2: parked by the 2-strike lockout
  mkdirSync(path.join(dir, "session-babek-rent-2"));
  writeFileSync(
    path.join(dir, "status-babek-rent-2.json"),
    JSON.stringify({ state: "dormant", at: new Date(now - 3600_000).toISOString(), reason: "2 strikes" })
  );
  writeFileSync(path.join(dir, "connect-fails-babek-rent-2.json"), JSON.stringify({ count: 2 }));

  // azat-takeauto: no files at all — never paired on this box
  // firuz-takeauto: relinked 2 min ago (cooldown active)
  touch("relink-firuz-takeauto.stamp", 2 * 60_000);
  // babek-rent-3: relinked 10 min ago (cooldown over)
  touch("relink-babek-rent-3.stamp", 10 * 60_000);

  // mohammed-takeauto: banned number — files say nothing, the badge is banned
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("getLineStatus", () => {
  it("open + recent activity → online", () => {
    const s = getLineStatus("babek-rent", dir, now);
    expect(s.badge).toBe("online");
    expect(s.state).toBe("open");
    expect(s.hasSession).toBe(true);
    expect(s.strikes).toBe(0);
  });

  it("open but no activity > 6h → silent", () => {
    expect(getLineStatus("cardiwan", dir, now).badge).toBe("silent");
  });

  it("qr artifact (or qr state) → qr_pending, even with no session dir", () => {
    const s = getLineStatus("ayham-rent", dir, now);
    expect(s.badge).toBe("qr_pending");
    expect(s.hasSession).toBe(false);
  });

  it("pair-code artifact → pair_code_pending, before the close state", () => {
    expect(getLineStatus("mohamed-etm", dir, now).badge).toBe("pair_code_pending");
  });

  it("close state → reconnecting", () => {
    expect(getLineStatus("etm-website", dir, now).badge).toBe("reconnecting");
  });

  it("dormant state → dormant, strikes reported", () => {
    const s = getLineStatus("babek-rent-2", dir, now);
    expect(s.badge).toBe("dormant");
    expect(s.strikes).toBe(2);
  });

  it("nothing on disk → no_session", () => {
    expect(getLineStatus("azat-takeauto", dir, now).badge).toBe("no_session");
  });

  it("the banned number is always banned", () => {
    expect(getLineStatus("mohammed-takeauto", dir, now).badge).toBe("banned");
  });

  it("a retired slug is always retired — never re-pair it (duplicate session)", () => {
    // babek-rent-4's handset pairs as babek-rent-2 since 2026-08-29; even a
    // live-looking session dir must not make it pairable again.
    expect(getLineStatus("babek-rent-4", dir, now).badge).toBe("retired");
  });

  it("open with no observed file at all → silent (never seen traffic)", () => {
    mkdirSync(path.join(dir, "session-takeauto-leasing-dept"), { recursive: true });
    writeFileSync(
      path.join(dir, "status-takeauto-leasing-dept.json"),
      JSON.stringify({ state: "open", at: new Date(now).toISOString() })
    );
    expect(getLineStatus("takeauto-leasing-dept", dir, now).badge).toBe("silent");
  });
});

describe("phone resolution", () => {
  it("reads digits from the live session creds (me.id)", () => {
    expect(phoneFromCreds("babek-rent", dir)).toBe("971529965085");
  });

  it("returns null for a missing session (mid-relink)", () => {
    expect(phoneFromCreds("ayham-rent", dir)).toBeNull();
  });

  it("registry fallback: documented number for an archived session", () => {
    expect(phoneFromRegistry("ayham-rent")).toBe("971542445836");
  });

  it("registry fallback is null for a slug with no documented number", () => {
    expect(phoneFromRegistry("babek-rent-4")).toBeNull();
  });
});

describe("listLines", () => {
  it("returns one row per LINE_TENANT key EXCEPT retired/banned slugs", async () => {
    const rows = await listLines({ dir, now, nameOverrides: {}, tenantSlugs: ALL_TENANTS });
    // Retired/banned slugs keep their LINE_TENANT mapping (historic rows) but
    // are not listed — dead rows read as live-but-broken lines and invite
    // pairing attempts that can only fail or duplicate a session.
    const hidden = ["babek-rent-4", "mohammed-takeauto"];
    expect(rows.map((r) => r.slug)).toEqual(
      Object.keys(LINE_TENANT).filter((s) => !hidden.includes(s))
    );
    for (const s of hidden) expect(rows.find((r) => r.slug === s)).toBeUndefined();
  });

  it("DB name override wins; no override → owner name", async () => {
    const rows = await listLines({ dir, now, nameOverrides: { "babek-rent": "Babek MAIN" }, tenantSlugs: ALL_TENANTS });
    const babek = rows.find((r) => r.slug === "babek-rent")!;
    expect(babek.displayName).toBe("Babek MAIN");
    const cardiwan = rows.find((r) => r.slug === "cardiwan")!;
    expect(cardiwan.displayName).toBe("Abdullah (Cardiwan)");
  });

  it("phone comes from creds when live, from the registry when archived", async () => {
    const rows = await listLines({ dir, now, nameOverrides: {}, tenantSlugs: ALL_TENANTS });
    expect(rows.find((r) => r.slug === "babek-rent")!.phone).toBe("971529965085");
    expect(rows.find((r) => r.slug === "ayham-rent")!.phone).toBe("971542445836");
  });

  it("tenant and owner ride along from the maps", async () => {
    const rows = await listLines({ dir, now, nameOverrides: {}, tenantSlugs: ALL_TENANTS });
    const ali = rows.find((r) => r.slug === "babek-rent-2")!;
    expect(ali.tenant).toBe("easyrent");
    expect(ali.owner?.key).toBe("ali");
  });

  it("hides lines whose tenant does not exist in THIS deployment (RMA box shows only rma-main)", async () => {
    const rows = await listLines({ dir, now, nameOverrides: {}, tenantSlugs: new Set(["rma"]) });
    expect(rows.map((r) => r.slug)).toEqual(["rma-main"]);
    expect(rows[0].tenant).toBe("rma");
    expect(rows[0].phone).toBe("971581965238");
    expect(rows[0].owner).toEqual({ key: "ruslan", name: "Ruslan (RMA)" });
  });
});

describe("relink cooldown", () => {
  it("fresh stamp → blocked, with the unlock moment", () => {
    expect(relinkCooldownOk("firuz-takeauto", dir, now)).toBe(false);
    const until = relinkCooldownUntil("firuz-takeauto", dir, now);
    expect(until).not.toBeNull();
    // stamped 2 min ago → unlocks 3 min from now (fs mtime ms rounding — allow slack)
    const expected = now - 2 * 60_000 + RELINK_COOLDOWN_MS;
    expect(Math.abs(new Date(until!).getTime() - expected)).toBeLessThan(1000);
  });

  it("old stamp → allowed", () => {
    expect(relinkCooldownOk("babek-rent-3", dir, now)).toBe(true);
    expect(relinkCooldownUntil("babek-rent-3", dir, now)).toBeNull();
  });

  it("no stamp → allowed (never relinked)", () => {
    expect(relinkCooldownOk("cardiwan", dir, now)).toBe(true);
  });
});

describe("validation helpers (API route guards)", () => {
  it("slug allowlist is exactly the LINE_TENANT keys", () => {
    expect(isKnownLine("babek-rent")).toBe(true);
    expect(isKnownLine("mohammed-takeauto")).toBe(true); // banned, but mapped
    expect(isKnownLine("abdullah-takeauto")).toBe(false); // retired, unmapped
    expect(isKnownLine("")).toBe(false);
  });

  it("banned/retired slugs are mapped but NOT relinkable", () => {
    expect(isRelinkableLine("babek-rent")).toBe(true);
    expect(isRelinkableLine("mohammed-takeauto")).toBe(false); // banned number
    expect(isRelinkableLine("babek-rent-4")).toBe(false); // retired, pairs as babek-rent-2
    expect(isRelinkableLine("bogus")).toBe(false);
  });

  it("phone must be 10-15 digits", () => {
    expect(PAIR_PHONE_RE.test("971569808087")).toBe(true);
    expect(PAIR_PHONE_RE.test("123456789")).toBe(false); // too short
    expect(PAIR_PHONE_RE.test("9715698080871234")).toBe(false); // too long
    expect(PAIR_PHONE_RE.test("+971569808087")).toBe(false); // not digits only
  });

  it("display name is 1-60 chars after trim", () => {
    expect(isValidLineName("Babek (EasyRent)")).toBe(true);
    expect(isValidLineName("   ")).toBe(false);
    expect(isValidLineName("")).toBe(false);
    expect(isValidLineName("x".repeat(61))).toBe(false);
    expect(isValidLineName("x".repeat(60))).toBe(true);
  });
});

describe("page-managed overlay lines in the roster", () => {
  const OVERLAY = {
    version: 1 as const,
    lines: {
      // Askhab — added from the page 2026-09-18, no session yet.
      "askhab-easyrent": {
        slug: "askhab-easyrent",
        tenant: "easyrent",
        ownerKey: "askhab",
        ownerName: "Askhab (EasyRent)",
        phone: "971542445834",
      },
      // a page-retired static line
      "firuz-takeauto": { slug: "firuz-takeauto", retired: true },
      // an owner override on a static line
      cardiwan: { slug: "cardiwan", ownerKey: "abdullah-2", ownerName: "Abdullah II" },
    },
  };

  it("a page-added unpaired line is listed, mapped, owned, numbered", async () => {
    const rows = await listLines({ dir, now, nameOverrides: {}, overlay: OVERLAY, tenantSlugs: ALL_TENANTS });
    const askhab = rows.find((r) => r.slug === "askhab-easyrent")!;
    expect(askhab.tenant).toBe("easyrent");
    expect(askhab.owner).toEqual({ key: "askhab", name: "Askhab (EasyRent)" });
    expect(askhab.phone).toBe("971542445834"); // documented number, no session
    expect(askhab.status.badge).toBe("no_session"); // unpaired, pairable from the page
    expect(askhab.managed).toBe(true);
    expect(rows.find((r) => r.slug === "babek-rent")!.managed).toBe(false);
  });

  it("a page-retired line disappears from the roster (like retired/banned)", async () => {
    const rows = await listLines({ dir, now, nameOverrides: {}, overlay: OVERLAY, tenantSlugs: ALL_TENANTS });
    expect(rows.find((r) => r.slug === "firuz-takeauto")).toBeUndefined();
    expect(isRelinkableLine("firuz-takeauto", OVERLAY)).toBe(false);
    // …but it stays KNOWN — its history keeps its tenant.
    expect(isKnownLine("firuz-takeauto", OVERLAY)).toBe(true);
  });

  it("an owner override on a static line wins the roster row", async () => {
    const rows = await listLines({ dir, now, nameOverrides: {}, overlay: OVERLAY, tenantSlugs: ALL_TENANTS });
    expect(rows.find((r) => r.slug === "cardiwan")!.owner).toEqual({ key: "abdullah-2", name: "Abdullah II" });
  });

  it("overlay-aware guards: added slug is known+relinkable, unknown is neither", () => {
    expect(isKnownLine("askhab-easyrent", OVERLAY)).toBe(true);
    expect(isRelinkableLine("askhab-easyrent", OVERLAY)).toBe(true);
    expect(isKnownLine("never-heard-of-it", OVERLAY)).toBe(false);
    expect(isRelinkableLine("never-heard-of-it", OVERLAY)).toBe(false);
  });

  it("phoneFromRegistry falls back to the overlay's documented number", () => {
    expect(phoneFromRegistry("askhab-easyrent", OVERLAY)).toBe("971542445834");
    expect(phoneFromRegistry("babek-rent", OVERLAY)).toBe("971529965085"); // static wins
  });
});

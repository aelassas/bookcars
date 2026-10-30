import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  parseLinesOverlay,
  validateOverlayLine,
  readLinesOverlay,
  writeLinesOverlay,
  resetLinesOverlayCache,
  overlayTenants,
  overlayOwners,
  overlayPhones,
  overlayRetiredSlugs,
  EMPTY_OVERLAY,
} from "./lines-overlay";
import { tenantSlugForLine, isMappedLine, DEFAULT_LINE_TENANT } from "./lines";
import { resolveOwnerForLine, resolveOwnerForPhone } from "../board/owners";
import {
  addOverlayLine,
  updateOverlayLine,
  retireOverlayLine,
  phoneTakenBy,
  isKnownLine,
  isRelinkableLine,
} from "../lines/registry";

/**
 * The overlay registry is a JSON file the /lines page writes; every consumer
 * merges it over the static maps. These tests run against a tmp file via
 * WA_LINES_REGISTRY (read lazily per call, cache reset between tests).
 */
let dir: string;
let reg: string;

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "wa-lines-overlay-"));
  reg = path.join(dir, "lines-registry.json");
  process.env.WA_LINES_REGISTRY = reg;
});

beforeEach(() => {
  resetLinesOverlayCache();
  rmSync(reg, { force: true });
  resetLinesOverlayCache();
});

afterAll(() => {
  delete process.env.WA_LINES_REGISTRY;
  resetLinesOverlayCache();
  rmSync(dir, { recursive: true, force: true });
});

// Deliberately NOT a real line slug: on the production box the DEFAULT
// registry path (wa-observer/lines-registry.json) exists and its entries are
// already merged into the module-load maps before any test can set
// WA_LINES_REGISTRY — a test slug must be one no registry will ever carry.
const TESTLINE = {
  slug: "zz-test-line",
  tenant: "easyrent",
  ownerKey: "zz-test",
  ownerName: "ZZ Test (EasyRent)",
  phone: "971500000034",
  actor: "test",
};

describe("parseLinesOverlay", () => {
  it("keeps valid entries, drops invalid ones loudly but safely", () => {
    const o = parseLinesOverlay({
      version: 1,
      lines: {
        good: { tenant: "easyrent", ownerKey: "a", ownerName: "A" },
        "BAD SLUG": { tenant: "easyrent" },
        "half-owner": { tenant: "easyrent", ownerKey: "a" }, // key without name
        "bad-phone": { tenant: "easyrent", phone: "123" },
      },
    });
    expect(Object.keys(o.lines)).toEqual(["good"]);
  });

  it("missing file → empty overlay (static maps carry the system alone)", () => {
    expect(readLinesOverlay()).toEqual(EMPTY_OVERLAY);
  });
});

describe("validateOverlayLine", () => {
  it("requires tenant for a new line — never born unmapped", () => {
    expect(validateOverlayLine({ slug: "ok-line" }, true)).toMatch(/tenant/);
    expect(validateOverlayLine({ slug: "ok-line", tenant: "easyrent" }, true)).toBeNull();
  });

  it("ownerKey and ownerName come together — a line is never half-owned", () => {
    expect(validateOverlayLine({ slug: "ok-line", ownerKey: "a" }, false)).toMatch(/owner/);
    expect(validateOverlayLine({ slug: "ok-line", ownerName: "A" }, false)).toMatch(/owner/);
  });

  it("phones are 10-15 digits", () => {
    expect(validateOverlayLine({ slug: "ok-line", phone: "971500000034" }, false)).toBeNull();
    expect(validateOverlayLine({ slug: "ok-line", phone: "123" }, false)).toMatch(/phone/);
  });
});

describe("addOverlayLine", () => {
  it("a page-added line is immediately mapped, owned, and relinkable", () => {
    addOverlayLine(TESTLINE);
    expect(tenantSlugForLine("zz-test-line")).toBe("easyrent");
    expect(isMappedLine("zz-test-line")).toBe(true);
    expect(resolveOwnerForLine("zz-test-line")).toMatchObject({ key: "zz-test", name: "ZZ Test (EasyRent)" });
    expect(resolveOwnerForPhone("971500000034")?.key).toBe("zz-test");
    expect(isKnownLine("zz-test-line")).toBe(true);
    expect(isRelinkableLine("zz-test-line")).toBe(true); // unpaired ≠ unpairable
  });

  it("rejects a slug that already exists (static or overlay)", () => {
    expect(() => addOverlayLine({ ...TESTLINE, slug: "babek-rent" })).toThrow(/already exists/);
    addOverlayLine(TESTLINE);
    expect(() => addOverlayLine(TESTLINE)).toThrow(/already exists/);
  });

  it("rejects a phone already owned by another line (duplicate session guard)", () => {
    expect(() => addOverlayLine({ ...TESTLINE, phone: "971569808087" })).toThrow(/cardiwan/);
  });

  it("rejects a malformed tenant slug", () => {
    expect(() => addOverlayLine({ ...TESTLINE, tenant: "EasyRent!" })).toThrow(/tenant/);
  });
});

describe("updateOverlayLine", () => {
  it("edits a managed line's number and owner", () => {
    addOverlayLine(TESTLINE);
    updateOverlayLine("zz-test-line", { phone: "971500000035", ownerKey: "zz-test-2", ownerName: "ZZ Test II", actor: "test" });
    expect(resolveOwnerForLine("zz-test-line")?.key).toBe("zz-test-2");
    expect(overlayPhones()["971500000035"]).toBe("zz-test-line");
    expect(overlayPhones()["971500000034"]).toBeUndefined();
  });

  it("overrides a STATIC line's owner without touching its tenant", () => {
    updateOverlayLine("babek-rent", { ownerKey: "babek-2", ownerName: "Babek II", actor: "test" });
    expect(resolveOwnerForLine("babek-rent")?.name).toBe("Babek II");
    // The tenant is code-only, forever — the overlay never carries one for a
    // static slug, and the static map wins regardless.
    expect(readLinesOverlay().lines["babek-rent"].tenant).toBeUndefined();
    expect(tenantSlugForLine("babek-rent")).toBe("easyrent");
  });

  it("refuses to steal a number from another line", () => {
    addOverlayLine(TESTLINE);
    expect(() => updateOverlayLine("zz-test-line", { phone: "971529965085", actor: "t" })).toThrow(/babek-rent/);
    // …but keeping its OWN number is fine
    expect(() => updateOverlayLine("zz-test-line", { phone: "971500000034", actor: "t" })).not.toThrow();
  });

  it("refuses unknown or retired lines", () => {
    expect(() => updateOverlayLine("no-such-line", { actor: "t" })).toThrow(/unknown/);
    addOverlayLine(TESTLINE);
    retireOverlayLine("zz-test-line", "t");
    expect(() => updateOverlayLine("zz-test-line", { note: "x", actor: "t" })).toThrow(/retired/);
  });
});

describe("retireOverlayLine", () => {
  it("retires safely: unlisted + unrelinkable, mapping KEPT for history", () => {
    addOverlayLine(TESTLINE);
    retireOverlayLine("zz-test-line", "ayham");
    // History still files right — the tenant mapping survives retirement.
    expect(tenantSlugForLine("zz-test-line")).toBe("easyrent");
    expect(isMappedLine("zz-test-line")).toBe(true);
    expect(isKnownLine("zz-test-line")).toBe(true);
    // …but the line can never be re-paired from the page or the shell.
    expect(isRelinkableLine("zz-test-line")).toBe(false);
    expect(overlayRetiredSlugs().has("zz-test-line")).toBe(true);
  });

  it("can retire a STATIC line (override entry) — mapping still kept", () => {
    retireOverlayLine("firuz-takeauto", "ayham");
    expect(isRelinkableLine("firuz-takeauto")).toBe(false);
    expect(tenantSlugForLine("firuz-takeauto")).toBe("take-auto");
  });

  it("double-retire throws; unknown slug throws", () => {
    addOverlayLine(TESTLINE);
    retireOverlayLine("zz-test-line", "t");
    expect(() => retireOverlayLine("zz-test-line", "t")).toThrow(/already retired/);
    expect(() => retireOverlayLine("no-such-line", "t")).toThrow(/unknown/);
  });
});

describe("write/read round-trip", () => {
  it("writeLinesOverlay validates the whole file before touching disk", () => {
    expect(() =>
      writeLinesOverlay({ version: 1, lines: { bad: { slug: "bad", ownerKey: "a" } } })
    ).toThrow(/refusing to write/);
    expect(readLinesOverlay()).toEqual(EMPTY_OVERLAY);
  });

  it("written entries are visible to fresh readers", () => {
    addOverlayLine(TESTLINE);
    resetLinesOverlayCache(); // simulate another process
    const o = readLinesOverlay();
    expect(overlayTenants(o)["zz-test-line"]).toBe("easyrent");
    expect(overlayOwners(o)["zz-test-line"]).toEqual({ key: "zz-test", name: "ZZ Test (EasyRent)" });
  });
});

describe("phoneTakenBy", () => {
  it("knows static phones and overlay phones", () => {
    expect(phoneTakenBy("971529965085")).toBe("babek-rent"); // static
    expect(phoneTakenBy("971500099999")).toBeNull();
    addOverlayLine(TESTLINE);
    expect(phoneTakenBy("971500000034")).toBe("zz-test-line");
  });
});

describe("defaults still hold with an empty overlay", () => {
  it("unknown lines default to take-auto", () => {
    expect(tenantSlugForLine("not-a-line")).toBe(DEFAULT_LINE_TENANT);
    expect(isMappedLine("not-a-line")).toBe(false);
  });
});

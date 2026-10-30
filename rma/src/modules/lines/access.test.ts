import { describe, it, expect } from "vitest";
import { linesAdminNames, nameCanManageLines } from "./access";

/**
 * The /lines guard's pure half: LINES_ADMIN_NAMES parsing + the case-
 * insensitive name match. (The session/platform-admin halves need auth() and
 * the DB; they are one line each around these helpers.)
 */
describe("linesAdminNames", () => {
  it("parses a comma-separated allowlist, trimmed and lowercased", () => {
    expect(linesAdminNames(" Omar, Ayham ")).toEqual(["omar", "ayham"]);
  });

  it("drops empties and tolerates missing env", () => {
    expect(linesAdminNames("Omar,,Ayham,")).toEqual(["omar", "ayham"]);
    expect(linesAdminNames("")).toEqual([]);
    // The box's .env.local SETS LINES_ADMIN_NAMES and the vitest setup loads
    // it — "missing env" must be simulated, not assumed.
    const saved = process.env.LINES_ADMIN_NAMES;
    delete process.env.LINES_ADMIN_NAMES;
    try {
      expect(linesAdminNames(undefined)).toEqual([]);
    } finally {
      if (saved !== undefined) process.env.LINES_ADMIN_NAMES = saved;
    }
  });
});

describe("nameCanManageLines", () => {
  it("matches the session display name case-insensitively", () => {
    expect(nameCanManageLines("Ayham", "Omar,Ayham")).toBe(true);
    expect(nameCanManageLines("AYHAM", "Omar,Ayham")).toBe(true);
    expect(nameCanManageLines(" omar ", "Omar,Ayham")).toBe(true);
  });

  it("denies names not on the list, and everyone when the list is empty", () => {
    expect(nameCanManageLines("Babek", "Omar,Ayham")).toBe(false);
    expect(nameCanManageLines("Omar", "")).toBe(false);
    expect(nameCanManageLines("Omar", undefined)).toBe(false);
  });

  it("a null/empty name never matches", () => {
    expect(nameCanManageLines(null, "Omar")).toBe(false);
    expect(nameCanManageLines(undefined, "Omar")).toBe(false);
    expect(nameCanManageLines("  ", "Omar")).toBe(false);
  });
});

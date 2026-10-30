// access.ts — /availability's PIN-session gate (pure part).
//
// An agent whose PIN-login name IS a roster name toggles exactly their own
// row; a privileged session (platform admin / LINES_ADMIN_NAMES — the manager
// set) toggles anyone's; anything else is denied.
import { describe, expect, it } from "vitest";
import { allowedAvailabilityNames, rotationAgentNames } from "./access";

const ROSTER = ["Ali", "Babek", "Abdullah"];

describe("rotationAgentNames — the page's roster comes from the env config", () => {
  it("merges both brand rotations, deduped, config order", () => {
    const names = rotationAgentNames({
      RENTAL_ROTATION_ETM: "Ali:971542445835,Babek:971529965085",
      RENTAL_ROTATION_CARDIWAN: "Abdullah:971569808087,Ali:971542445835",
    });
    expect(names).toEqual(["Ali", "Babek", "Abdullah"]);
  });

  it("empty config → no roster", () => {
    expect(rotationAgentNames({})).toEqual([]);
  });
});

describe("allowedAvailabilityNames — own row, or all rows when privileged", () => {
  it("a roster agent gets exactly their own row (case-insensitive)", () => {
    expect(allowedAvailabilityNames("ali", ROSTER, false)).toEqual({
      allowedNames: ["Ali"],
      canPickAny: false,
    });
  });

  it("a privileged non-agent (the manager) gets every row", () => {
    expect(allowedAvailabilityNames("Ayham", ROSTER, true)).toEqual({
      allowedNames: ROSTER,
      canPickAny: true,
    });
  });

  it("a privileged roster agent keeps the MANAGER view (Ayham-in-roster, 2026-09-19)", () => {
    expect(allowedAvailabilityNames("Ali", ROSTER, true)).toEqual({
      allowedNames: ROSTER,
      canPickAny: true,
    });
  });

  it("an outsider is denied, privileged or not-by-name", () => {
    expect(allowedAvailabilityNames("Moe", ROSTER, false)).toBeNull();
    expect(allowedAvailabilityNames(null, ROSTER, true)).toEqual({
      allowedNames: ROSTER,
      canPickAny: true,
    });
    expect(allowedAvailabilityNames(null, ROSTER, false)).toBeNull();
  });
});

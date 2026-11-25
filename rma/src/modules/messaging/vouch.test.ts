import { describe, expect, it } from "vitest";
import { mergeVouched, hasVouchable } from "./vouch";
import { extractSignals } from "./extract";

const REF = new Date("2026-07-22T00:00:00Z");
const empty = { car: null, value: null, term: null };

describe("mergeVouched", () => {
  it("takes the freshest non-null fact", () => {
    const sig = extractSignals("mercedes g63 value of 650000 aed for 36 months", { referenceDate: REF });
    expect(mergeVouched(empty, sig)).toEqual({ car: "mercedes g63", value: 650000, term: 36 });
  });

  it("does not wipe an earlier fact when the new line lacks it", () => {
    const prev = { car: "Patrol", value: 2000, term: null };
    const sig = extractSignals("ok send me the location please", { referenceDate: REF });
    // The follow-up carries no car/price/term → previous facts survive.
    expect(mergeVouched(prev, sig)).toEqual(prev);
  });

  it("overwrites only the fields the new line does carry", () => {
    const prev = { car: "Patrol", value: 2000, term: null };
    const sig = extractSignals("actually make it a lamborghini urus", { referenceDate: REF });
    expect(mergeVouched(prev, sig)).toEqual({ car: "lamborghini urus", value: 2000, term: null });
  });
});

describe("hasVouchable", () => {
  it("is true when any deal fact is present", () => {
    expect(hasVouchable(extractSignals("need a patrol", { referenceDate: REF }))).toBe(true);
  });
  it("is false for a chit-chat line", () => {
    expect(hasVouchable(extractSignals("thank you so much", { referenceDate: REF }))).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { resolveStitch } from "./stitch";

const lead = (id: string, hasOpenDeal = false) => ({ id, hasOpenDeal });

describe("resolveStitch", () => {
  it("links the single customer and single lead", () => {
    const d = resolveStitch({ customers: [{ id: "c1" }], leads: [lead("l1")] });
    expect(d).toEqual({ customerId: "c1", relatedEntityType: "lead", relatedEntityId: "l1", ambiguous: false });
  });
  it("links nothing when there are no candidates", () => {
    const d = resolveStitch({ customers: [], leads: [] });
    expect(d).toEqual({ customerId: null, relatedEntityType: null, relatedEntityId: null, ambiguous: false });
  });
  it("two customers, same phone → ambiguous, links neither", () => {
    const d = resolveStitch({ customers: [{ id: "c1" }, { id: "c2" }], leads: [] });
    expect(d.customerId).toBeNull();
    expect(d.ambiguous).toBe(true);
  });
  it("many leads: prefers the one with an open deal", () => {
    const d = resolveStitch({ customers: [], leads: [lead("cold"), lead("hot", true)] });
    expect(d.relatedEntityId).toBe("hot");
    expect(d.ambiguous).toBe(false);
  });
  it("many leads, several open deals → ambiguous, links none", () => {
    const d = resolveStitch({ customers: [], leads: [lead("a", true), lead("b", true)] });
    expect(d.relatedEntityId).toBeNull();
    expect(d.ambiguous).toBe(true);
  });
  it("many leads, none open → newest wins is NOT guessed: ambiguous", () => {
    const d = resolveStitch({ customers: [], leads: [lead("a"), lead("b")] });
    expect(d.relatedEntityId).toBeNull();
    expect(d.ambiguous).toBe(true);
  });
});

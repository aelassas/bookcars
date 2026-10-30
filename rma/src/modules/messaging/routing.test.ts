import { describe, it, expect } from "vitest";
import { routeMessage, detectBrand, type RoutingMember } from "./routing";

// The live sales pool (mirrors take-auto's members; `line` derived as in
// routing-apply.lineFor). Lux desk added to exercise brand→line routing.
const MEMBERS: RoutingMember[] = [
  { userId: "u-azat", name: "Azat Yagdyyev", roles: ["sales", "sales_manager"], line: "rent" },
  { userId: "u-firuz", name: "Firuz Khusainov", roles: ["sales"], line: "rent" },
  { userId: "u-babek", name: "Babek — Rent Manager", roles: ["sales"], line: "rent" },
  { userId: "u-muhammed", name: "Muhammed — Lease Manager", roles: ["sales"], line: "lease" },
  { userId: "u-karim", name: "Karim Lux Desk", roles: ["sales"], line: "lux" },
];

describe("routeMessage — the three real inbound messages", () => {
  it('(a) "Hi Azat…" → name_match, APPLY to Azat', () => {
    const d = routeMessage({ body: "Hi Azat, is the Nissan Patrol available next week?", members: MEMBERS });
    expect(d.rule).toBe("name_match");
    expect(d.action).toBe("apply");
    expect(d.ownerId).toBe("u-azat");
  });

  it('(b) "need lamborghini aventador…" → brand_default, PROPOSE lux desk', () => {
    const d = routeMessage({ body: "hi, i need a lamborghini aventador for the weekend", members: MEMBERS });
    expect(d.rule).toBe("brand_default");
    expect(d.action).toBe("propose"); // never auto-assigns
    expect(d.brand).toBe("Lamborghini");
    expect(d.ownerId).toBeNull();
    expect(d.candidates.map((c) => c.userId)).toEqual(["u-karim"]);
  });

  it('(c) "FJ cruiser question" → brand_default, PROPOSE rent desk', () => {
    const d = routeMessage({ body: "Question about the FJ cruiser, what is the monthly rate?", members: MEMBERS });
    expect(d.rule).toBe("brand_default");
    expect(d.action).toBe("propose");
    expect(d.brand).toBe("Toyota");
    expect(d.candidates.map((c) => c.userId)).toEqual(
      expect.arrayContaining(["u-azat", "u-firuz", "u-babek"])
    );
    expect(d.candidates.map((c) => c.userId)).not.toContain("u-muhammed"); // lease desk excluded
  });
});

describe("routeMessage — precedence + guards", () => {
  it("open_thread continuity APPLIES the existing owner when no name is given", () => {
    const d = routeMessage({
      body: "any update on my booking?",
      members: MEMBERS,
      existingOwner: { userId: "u-firuz", name: "Firuz Khusainov" },
    });
    expect(d.rule).toBe("open_thread");
    expect(d.action).toBe("apply");
    expect(d.ownerId).toBe("u-firuz");
  });

  it("an explicit name OUTRANKS the existing owner (customer asked for someone else)", () => {
    const d = routeMessage({
      body: "Hi Azat, please take over",
      members: MEMBERS,
      existingOwner: { userId: "u-firuz", name: "Firuz Khusainov" },
    });
    expect(d.rule).toBe("name_match");
    expect(d.ownerId).toBe("u-azat");
  });

  it("two named managers → PROPOSE, no auto-write", () => {
    const d = routeMessage({ body: "Azat or Firuz, who can help?", members: MEMBERS });
    expect(d.rule).toBe("name_match");
    expect(d.action).toBe("propose");
    expect(d.ownerId).toBeNull();
    expect(d.candidates).toHaveLength(2);
  });

  it("no signal → rule 'none', proposes coordinator queue", () => {
    const d = routeMessage({ body: "hello, prices?", members: MEMBERS });
    expect(d.rule).toBe("none");
    expect(d.action).toBe("propose");
    expect(d.ownerId).toBeNull();
  });

  it("does not match a name embedded in a larger word", () => {
    // 'firuz' is not a substring here; guards against \b-style false positives.
    const d = routeMessage({ body: "the firuzabad branch address please", members: MEMBERS });
    expect(d.rule).not.toBe("name_match");
  });
});

describe("detectBrand", () => {
  it("finds exotic + everyday brands, case-insensitive", () => {
    expect(detectBrand("AVENTADOR please")?.line).toBe("lux");
    expect(detectBrand("fj cruiser")?.brand).toBe("Toyota");
    expect(detectBrand("no car mentioned")).toBeNull();
  });
});

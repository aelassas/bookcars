import { describe, expect, it } from "vitest";
import { buildChargeStatement, isFineBlockEligible, parseRentalChargeInput } from "./rules";

describe("rental charge rules", () => {
  it("validates operator references, exact AED amounts and real timestamps", () => {
    expect(parseRentalChargeInput({ vehicleId: "v", kind: "parkin", externalId: " P-1 ", occurredAt: new Date("2026-11-18T10:00:00Z"), amount: 20 }).externalId).toBe("P-1");
    expect(parseRentalChargeInput({ vehicleId: "v", kind: "salik", externalId: "S-1", occurredAt: new Date("2026-11-18T10:00:00Z"), amount: 4.2 }).amount).toBe(4.2);
    expect(() => parseRentalChargeInput({ vehicleId: "v", kind: "salik", externalId: "S-1", occurredAt: new Date(), amount: 4.222 })).toThrow("decimal");
    expect(() => parseRentalChargeInput({ vehicleId: "v", kind: "fine", externalId: "", occurredAt: new Date(), amount: 100 })).toThrow("reference");
    expect(() => parseRentalChargeInput({ vehicleId: "v", kind: "fine", externalId: "F-1", occurredAt: new Date(), amount: 0 })).toThrow("positive");
    expect(buildChargeStatement({ customerName: "A", plate: "B 1", final: false, charges: [{ kind: "salik", amount: 4.2, status: "unpaid" }] })).toContain("total 4.2 AED; unpaid 4.2 AED");
  });

  it("blocks only overdue unpaid fines belonging to the current rental", () => {
    const base = { kind: "fine", status: "notification_queued", paymentDueAt: new Date("2026-11-17T00:00:00Z"), chargeRentalId: "old", currentRentalId: "current" };
    const now = new Date("2026-11-18T00:00:00Z");
    expect(isFineBlockEligible(base, now)).toBe(false);
    expect(isFineBlockEligible({ ...base, currentRentalId: "old" }, now)).toBe(true);
    expect(isFineBlockEligible({ ...base, currentRentalId: "old", status: "paid" }, now)).toBe(false);
    expect(isFineBlockEligible({ ...base, currentRentalId: "old", kind: "parkin" }, now)).toBe(false);
    expect(isFineBlockEligible({ ...base, currentRentalId: "old", paymentDueAt: null }, now)).toBe(false);
  });

  it("keeps Salik and parking as separate statement lines", () => {
    const text = buildChargeStatement({ customerName: "A", plate: "B 1", final: false, charges: [
      { kind: "salik", amount: 8, status: "unpaid" },
      { kind: "parkin", amount: 15, status: "paid" },
      { kind: "parkonic", amount: 20, status: "unpaid" },
    ] });
    expect(text).toContain("Salik: 1 charge; total 8 AED; unpaid 8 AED");
    expect(text).toContain("Parkin parking: 1 charge; total 15 AED; unpaid 0 AED");
    expect(text).toContain("Parkonic parking: 1 charge; total 20 AED; unpaid 20 AED");
    expect(text).toContain("Outstanding charges: 28 AED");
  });
});

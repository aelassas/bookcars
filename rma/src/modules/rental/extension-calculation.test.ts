import { describe, expect, it } from "vitest";
import { calculateRentalExtension } from "./extension-calculation";

const base = {
  currentReturnDate: new Date("2026-11-24T14:30:00Z"),
  currentTotalDays: 8,
  dailyRate: 285,
  total: 3780,
  balanceDue: 0,
};

describe("rental extension calculation", () => {
  it("shows the exact charge and new balance before confirmation", () => {
    expect(calculateRentalExtension({ ...base, newReturnDate: new Date("2026-12-02T12:05:00Z") })).toEqual({
      extraDays: 8,
      extraPricedDays: 8,
      extraTotal: 2280,
      newTotalDays: 16,
      newTotal: 6060,
      newBalanceDue: 2280,
    });
  });

  it("does not charge extra calendar days inside the normalized monthly window", () => {
    expect(calculateRentalExtension({
      ...base,
      currentTotalDays: 28,
      total: 10000,
      balanceDue: 1000,
      newReturnDate: new Date("2026-11-27T14:30:00Z"),
    })).toMatchObject({ extraDays: 3, extraPricedDays: 0, extraTotal: 0, newTotalDays: 31, newTotal: 10000, newBalanceDue: 1000 });
  });

  it("rejects a return date that is not later than the current one", () => {
    expect(() => calculateRentalExtension({ ...base, newReturnDate: base.currentReturnDate })).toThrow("later");
  });
});

import { describe, expect, it } from "vitest";
import { assertValidCustomerRating, calculateReturnCharges } from "./return-charges";

describe("return charges", () => {
  it("charges whole days for a late return and preserves manual charges", () => {
    expect(calculateReturnCharges({
      returnDate: new Date("2026-11-10T12:00:00Z"),
      actualReturnDate: new Date("2026-11-12T13:00:00Z"),
      dailyRate: 500,
      extraChargeAmount: 150,
    })).toEqual({ extraDays: 3, lateFee: 1500, extraChargeAmount: 150, totalExtra: 1650 });
  });

  it.each([-1, 1.5, NaN])("rejects invalid extra charge %s", (extraChargeAmount) => {
    expect(() => calculateReturnCharges({
      returnDate: new Date("2026-11-10T12:00:00Z"),
      actualReturnDate: new Date("2026-11-10T12:00:00Z"),
      dailyRate: 500,
      extraChargeAmount,
    })).toThrow("non-negative whole number");
  });

  it("does not charge for an on-time return", () => {
    expect(calculateReturnCharges({
      returnDate: new Date("2026-11-10T12:00:00Z"),
      actualReturnDate: new Date("2026-11-10T11:00:00Z"),
      dailyRate: 500,
    })).toEqual({ extraDays: 0, lateFee: 0, extraChargeAmount: 0, totalExtra: 0 });
  });
});

describe("customer rating", () => {
  it.each([undefined, 1, 3, 5])("accepts %s", (rating) => {
    expect(() => assertValidCustomerRating(rating)).not.toThrow();
  });

  it.each([0, 6, 2.5, NaN])("rejects %s", (rating) => {
    expect(() => assertValidCustomerRating(rating)).toThrow("1 to 5");
  });
});

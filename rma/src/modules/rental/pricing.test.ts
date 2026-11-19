import { describe, expect, it } from "vitest";
import { resolveRentalPricing } from "./pricing";

describe("rental pricing", () => {
  it("uses the matching tier by default", () => {
    expect(resolveRentalPricing({ totalDays: 3, channel: "b2c", tierDailyRate: 500, tierDeposit: 1500 })).toEqual({
      dailyRate: 500, deposit: 1500, pricedFromTier: true,
    });
  });

  it("allows an explicit manual rate and deposit even when a tier exists", () => {
    expect(resolveRentalPricing({
      totalDays: 3, channel: "b2b", tierDailyRate: 500, tierDeposit: 1500, manualDailyRate: 450, manualDeposit: 1000,
    })).toEqual({ dailyRate: 450, deposit: 1000, pricedFromTier: false });
  });

  it("uses the tourist deposit from the tier, or AED 1,500 without one", () => {
    expect(resolveRentalPricing({ totalDays: 2, channel: "b2c", tierDailyRate: 300, tierDeposit: 2000, customerType: "tourist" }).deposit).toBe(2000);
    expect(resolveRentalPricing({ totalDays: 2, channel: "b2c", tierDailyRate: 300, customerType: "tourist" }).deposit).toBe(1500);
  });

  it("defaults a UAE resident to zero deposit but allows a custom deposit", () => {
    expect(resolveRentalPricing({ totalDays: 2, channel: "b2c", tierDailyRate: 300, tierDeposit: 1500, customerType: "resident" }).deposit).toBe(0);
    expect(resolveRentalPricing({ totalDays: 2, channel: "b2c", tierDailyRate: 300, customerType: "resident", manualDeposit: 750 }).deposit).toBe(750);
  });

  it("keeps the custom fallback when no tier exists", () => {
    expect(resolveRentalPricing({ totalDays: 2, channel: "b2c", manualDailyRate: 300, manualDeposit: 0 })).toEqual({
      dailyRate: 300, deposit: 0, pricedFromTier: false,
    });
  });

  it("fails clearly when neither a tier nor a daily rate exists", () => {
    expect(() => resolveRentalPricing({ totalDays: 2, channel: "b2c" })).toThrow("No price tier");
  });

  it.each([0, -1, 1.5, NaN])("rejects invalid manual rate %s", (manualDailyRate) => {
    expect(() => resolveRentalPricing({ totalDays: 2, channel: "b2c", tierDailyRate: 500, manualDailyRate })).toThrow("positive whole number");
  });
});

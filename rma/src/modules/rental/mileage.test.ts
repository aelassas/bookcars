import { describe, expect, it } from "vitest";
import { calculateMileageUsage, mileageAllowanceKm } from "./mileage";

describe("rental mileage allowance", () => {
  it("uses the whole paid term rather than a separate daily cap", () => {
    expect(calculateMileageUsage({
      startOdometer: 10000,
      finalOdometer: 10450,
      dailyMileageLimitKm: 150,
      totalDays: 3,
    })).toEqual({ drivenKm: 450, allowedKm: 450, remainingKm: 0, excessKm: 0 });
  });

  it("allows 4500 km for a paid 30-day month", () => {
    expect(mileageAllowanceKm(30, 150)).toBe(4500);
  });

  it("shows remaining and excess distance from live or final odometer", () => {
    expect(calculateMileageUsage({
      startOdometer: 10000,
      finalOdometer: 10500,
      dailyMileageLimitKm: 150,
      totalDays: 3,
    })).toEqual({ drivenKm: 500, allowedKm: 450, remainingKm: 0, excessKm: 50 });
  });

  it("does not invent an overage when a measurement is missing", () => {
    expect(calculateMileageUsage({
      startOdometer: null,
      finalOdometer: 10750,
      dailyMileageLimitKm: 150,
      totalDays: 3,
    })).toBeNull();
  });
});

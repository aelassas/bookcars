import { describe, expect, it } from "vitest";
import { calculateMileageUsage } from "./mileage";

describe("rental mileage allowance", () => {
  it("calculates the real distance, daily allowance and excess", () => {
    expect(calculateMileageUsage({
      startOdometer: 10000,
      finalOdometer: 10750,
      dailyMileageLimitKm: 300,
      startDate: new Date("2026-11-10T10:00:00Z"),
      actualReturnDate: new Date("2026-11-12T10:00:00Z"),
    })).toEqual({ drivenKm: 750, allowedKm: 600, excessKm: 150 });
  });

  it("does not invent an overage when any required measurement is missing", () => {
    expect(calculateMileageUsage({
      startOdometer: null,
      finalOdometer: 10750,
      dailyMileageLimitKm: 300,
      startDate: new Date(),
      actualReturnDate: new Date(),
    })).toBeNull();
  });
});

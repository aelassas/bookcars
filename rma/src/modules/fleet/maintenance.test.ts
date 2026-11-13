import { describe, expect, it } from "vitest";
import { isServiceDue, nextOilChangeOdometer } from "./maintenance";

describe("vehicle maintenance", () => {
  it("uses an editable 8000 km default for the next oil change", () => {
    expect(nextOilChangeOdometer(42000)).toBe(50000);
    expect(nextOilChangeOdometer(42000, 10000)).toBe(52000);
    expect(() => nextOilChangeOdometer(42000, 0)).toThrow("positive integer");
  });

  it("marks service due by actual mileage or calendar date", () => {
    const now = new Date(2026, 10, 13, 12);
    expect(isServiceDue({ odometer: 50000, nextServiceOdometer: 50000, nextServiceDate: null }, now)).toBe(true);
    expect(isServiceDue({ odometer: 49000, nextServiceOdometer: 50000, nextServiceDate: "2026-11-13" }, now)).toBe(true);
    expect(isServiceDue({ odometer: 49000, nextServiceOdometer: 50000, nextServiceDate: "2026-11-14" }, now)).toBe(false);
  });
});

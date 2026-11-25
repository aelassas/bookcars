import { describe, expect, it } from "vitest";
import { isServiceDue, nextServiceLimitOdometer, serviceState } from "./maintenance";

describe("vehicle maintenance", () => {
  it("warns at 8000 km and sets the service limit at 10000 km", () => {
    expect(nextServiceLimitOdometer(42000)).toBe(52000);
    expect(serviceState({ currentOdometer: 49999, lastServiceOdometer: 42000, nextServiceOdometer: 52000 })).toMatchObject({ status: "ok", remainingKm: 2001 });
    expect(serviceState({ currentOdometer: 50000, lastServiceOdometer: 42000, nextServiceOdometer: 52000 })).toMatchObject({ status: "due_soon", remainingKm: 2000 });
    expect(serviceState({ currentOdometer: 52000, lastServiceOdometer: 42000, nextServiceOdometer: 52000 })).toMatchObject({ status: "due", remainingKm: 0 });
  });

  it("supports an existing planned limit without a recorded last service", () => {
    expect(serviceState({ currentOdometer: 49000, lastServiceOdometer: null, nextServiceOdometer: 50000 })).toMatchObject({ status: "due_soon", remainingKm: 1000 });
  });

  it("marks service due by actual mileage or calendar date", () => {
    const now = new Date(2026, 10, 13, 12);
    expect(isServiceDue({ odometer: 50000, nextServiceOdometer: 50000, nextServiceDate: null }, now)).toBe(true);
    expect(isServiceDue({ odometer: 49000, nextServiceOdometer: 50000, nextServiceDate: "2026-11-13" }, now)).toBe(true);
    expect(isServiceDue({ odometer: 49000, nextServiceOdometer: 50000, nextServiceDate: "2026-11-14" }, now)).toBe(false);
  });
});

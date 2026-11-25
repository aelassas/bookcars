import { describe, expect, it } from "vitest";
import { matchVehicleTelemetry } from "./telemetry";

describe("vehicle telemetry matching", () => {
  const fleet = [
    { imei: "1", vin: "VIN1", plate: "AA-22695 GLE", odometerKm: 14645, lastFixAt: "2026-11-24T12:00:00Z" },
    { imei: "2", vin: "VIN2", plate: "GG-31235 CLA", odometerKm: 8115, lastFixAt: "2026-11-24T12:01:00Z" },
  ];

  it("matches by VIN before plate", () => {
    expect(matchVehicleTelemetry(fleet, { vin: "VIN2", plate: "AA 22695" })?.odometerKm).toBe(8115);
  });

  it("matches normalized plate with a model suffix", () => {
    expect(matchVehicleTelemetry(fleet, { plate: "AA-22695" })?.odometerKm).toBe(14645);
  });

  it("does not match a shorter plate against a different vehicle number", () => {
    expect(matchVehicleTelemetry(fleet, { plate: "AA-2269" })).toBeNull();
  });

  it("returns null without a matching device", () => {
    expect(matchVehicleTelemetry(fleet, { plate: "XX 00000" })).toBeNull();
  });
});

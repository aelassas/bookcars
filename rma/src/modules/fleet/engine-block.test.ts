import { describe, expect, it } from "vitest";
import { assertEngineBlockAllowed, assertEngineBlockConfirmation } from "./engine-block";

const now = new Date("2026-11-18T12:00:00Z");
const base = { vehicleStatus: "on_rent", blocked: false, ignition: false, speed: 0, lastFixAt: "2026-11-18T11:58:00Z" };

describe("engine block safeguards", () => {
  it("requires the exact confirmation word", () => {
    expect(() => assertEngineBlockConfirmation("BLOCK")).not.toThrow();
    for (const value of ["", "block", "BLOCK ", null, undefined]) expect(() => assertEngineBlockConfirmation(value)).toThrow("Type BLOCK to confirm");
  });

  it("allows a stationary vehicle with fresh ignition-off telemetry", () => {
    expect(() => assertEngineBlockAllowed(base, now)).not.toThrow();
  });

  it("refuses moving, running, blocked, sold and stale vehicles", () => {
    expect(() => assertEngineBlockAllowed({ ...base, speed: 1 }, now)).toThrow("parked with ignition off");
    expect(() => assertEngineBlockAllowed({ ...base, ignition: true }, now)).toThrow("parked with ignition off");
    expect(() => assertEngineBlockAllowed({ ...base, blocked: true }, now)).toThrow("already blocked");
    expect(() => assertEngineBlockAllowed({ ...base, vehicleStatus: "sold" }, now)).toThrow("sold vehicle");
    expect(() => assertEngineBlockAllowed({ ...base, lastFixAt: "2026-11-18T11:50:00Z" }, now)).toThrow("Fresh GPS");
    expect(() => assertEngineBlockAllowed({ ...base, lastFixAt: "invalid" }, now)).toThrow("Fresh GPS");
  });
});

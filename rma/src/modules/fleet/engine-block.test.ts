import { describe, expect, it } from "vitest";
import { assertEngineBlockAllowed, assertEngineBlockConfirmation } from "./engine-block";

describe("engine block safeguards", () => {
  it("requires the exact confirmation word", () => {
    expect(() => assertEngineBlockConfirmation("BLOCK")).not.toThrow();
    for (const value of ["", "block", "BLOCK ", null, undefined]) {
      expect(() => assertEngineBlockConfirmation(value)).toThrow("Type BLOCK to confirm");
    }
  });

  it("allows a stationary CRM vehicle with ignition off", () => {
    expect(() => assertEngineBlockAllowed({ vehicleStatus: "on_rent", blocked: false, ignition: false, speed: 0 })).not.toThrow();
  });

  it("refuses moving, running, blocked, and sold vehicles", () => {
    const base = { vehicleStatus: "on_rent", blocked: false, ignition: false, speed: 0 };
    expect(() => assertEngineBlockAllowed({ ...base, speed: 1 })).toThrow("parked with ignition off");
    expect(() => assertEngineBlockAllowed({ ...base, ignition: true })).toThrow("parked with ignition off");
    expect(() => assertEngineBlockAllowed({ ...base, blocked: true })).toThrow("already blocked");
    expect(() => assertEngineBlockAllowed({ ...base, vehicleStatus: "sold" })).toThrow("sold vehicle");
  });
});

import { describe, expect, it } from "vitest";
import { parseTarsClosure, TARS_CLOSURE_VERSION } from "./closure";

const valid = {
  version: TARS_CLOSURE_VERSION,
  rentalId: "36acba19-1bdd-4bc2-a9c5-c287478d74a3",
  documentNumber: "2026-1116-1",
  vehicleVin: "W1K5J4GB3SN518889",
  startAt: "2026-11-16T14:30:00.000Z",
  actualReturnAt: "2026-11-24T12:00:00.000Z",
  startOdometer: 8115,
  finalOdometer: 8200,
  fuelPercent: 80,
  location: "JVC",
};
const now = new Date("2026-11-24T12:05:00.000Z");

describe("TARS closure validation", () => {
  it("normalizes a valid reviewed return package", () => {
    expect(parseTarsClosure(valid, now)).toMatchObject({ documentNumber: "2026-1116-1", finalOdometer: 8200, fuelPercent: 80 });
  });

  it("rejects a return before the rental start or in the future", () => {
    expect(() => parseTarsClosure({ ...valid, actualReturnAt: "2026-11-15T14:30:00.000Z" }, now)).toThrow("before the rental start");
    expect(() => parseTarsClosure({ ...valid, actualReturnAt: "2026-11-24T12:11:00.000Z" }, now)).toThrow("in the future");
  });

  it("rejects an odometer rollback", () => {
    expect(() => parseTarsClosure({ ...valid, finalOdometer: 8114 }, now)).toThrow("lower than the starting odometer");
  });
});

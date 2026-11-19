import { describe, expect, it } from "vitest";
import type { TarsVehicle } from "./client";
import { buildPlan, type ExistingState } from "./sync";

function car(vin: string, model: string): TarsVehicle {
  return {
    did: `did:rta:${vin}`,
    sourceKey: vin,
    vin,
    status: "AVAILABLE",
    vehicleModel: { name: { en: model } },
    plate: { number: "5902", code: { en: "G" } },
  };
}

function state(vehicles: ExistingState["vehicles"]): ExistingState {
  return { vehicles, customers: [], rentals: [] };
}

describe("TARS vehicle identity", () => {
  it("does not merge two VINs sharing a reassigned plate", () => {
    const plan = buildPlan([
      car("4JGFB4FB0TB513273", "GLE 350"),
      car("W1NWM0AB4SX019197", "G 580 EQG"),
    ], [], state([
      { id: "gle-id", plate: "G5902", vin: null, externalId: null, externalSource: null },
    ]));

    expect(plan.vehicles).toHaveLength(2);
    expect(plan.vehicles[0]).toMatchObject({ action: "update", existingId: "gle-id" });
    expect(plan.vehicles[1]).toMatchObject({ action: "insert", existingId: null });
  });

  it("prefers an exact VIN over another row with the same plate", () => {
    const plan = buildPlan([car("4JGFB4FB0TB513273", "GLE 350")], [], state([
      { id: "same-plate", plate: "G 5902", vin: null, externalId: null, externalSource: null },
      { id: "same-vin", plate: "OTHER 1", vin: "4JGFB4FB0TB513273", externalId: null, externalSource: null },
    ]));

    expect(plan.vehicles[0]).toMatchObject({ action: "update", existingId: "same-vin", matchedBy: "vin" });
  });
});

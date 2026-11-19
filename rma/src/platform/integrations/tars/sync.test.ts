import { describe, expect, it } from "vitest";
import type { TarsRental, TarsVehicle } from "./client";
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

  it("adopts an existing rental with the same vehicle and calendar dates", () => {
    const vehicle = car("4JGFB4FB0TB513273", "GLE 350");
    const rental: TarsRental = {
      documentNumber: "2026-1116-1",
      did: "did:rta:rental-1",
      status: "ACTIVE",
      details: [{
        isCurrent: true,
        startDate: "2026-11-16T14:30:00Z",
        expectedReturnDate: "2026-11-24T14:30:00Z",
        vehicle,
        drivers: [{ name: { en: { firstName: "Test", lastName: "Driver" } } }],
      }],
    };
    const existing = state([
      { id: "vehicle-1", plate: "GG 31235", vin: vehicle.vin!, externalId: null, externalSource: null },
    ]);
    existing.rentals.push({
      id: "rental-cancelled",
      vehicleId: "vehicle-1",
      startDate: new Date("2026-11-16T00:00:00Z"),
      returnDate: new Date("2026-11-24T00:00:00Z"),
      status: "cancelled",
      tarsDocumentNumber: null,
    }, {
      id: "rental-1",
      vehicleId: "vehicle-1",
      startDate: new Date("2026-11-16T00:00:00Z"),
      returnDate: new Date("2026-11-24T00:00:00Z"),
      status: "active",
      tarsDocumentNumber: null,
    });

    const plan = buildPlan([], [rental], existing);

    expect(plan.rentals).toHaveLength(1);
    expect(plan.rentals[0]).toMatchObject({ action: "update", existingId: "rental-1" });
  });
});

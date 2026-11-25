import { getPilotClient } from "@/platform/integrations/pilot/client";

export type VehicleTelemetryIdentity = {
  vin?: string | null;
  imei?: string | null;
  plate?: string | null;
};

type PilotVehicle = VehicleTelemetryIdentity & {
  odometerKm?: number | null;
  lastFixAt?: string | null;
};

function normalizedPlate(value: string | null | undefined): string {
  return (value ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function matchVehicleTelemetry<T extends PilotVehicle>(fleet: T[], vehicle: VehicleTelemetryIdentity): T | null {
  if (vehicle.vin) {
    const match = fleet.find((car) => car.vin?.toUpperCase() === vehicle.vin?.toUpperCase());
    if (match) return match;
  }
  if (vehicle.imei) {
    const match = fleet.find((car) => car.imei === vehicle.imei);
    if (match) return match;
  }
  const plate = normalizedPlate(vehicle.plate);
  if (!plate) return null;
  return fleet.find((car) => {
    const candidate = normalizedPlate(car.plate);
    return candidate === plate || (candidate.startsWith(plate) && /[A-Za-z]/.test(candidate.charAt(plate.length)));
  }) ?? null;
}

export async function getLiveVehicleOdometer(vehicle: VehicleTelemetryIdentity): Promise<{ odometerKm: number; lastFixAt: string | null } | null> {
  try {
    const client = getPilotClient();
    if (client.mode !== "live") return null;
    const fleet = await client.getFleet();
    const match = matchVehicleTelemetry(fleet, vehicle);
    if (!match || typeof match.odometerKm !== "number") return null;
    return { odometerKm: Math.round(match.odometerKm), lastFixAt: match.lastFixAt ?? null };
  } catch {
    return null;
  }
}

import { parseTarsDocumentNumber } from "./handoff";

export const TARS_CLOSURE_VERSION = 1 as const;

export interface TarsClosure {
  version: typeof TARS_CLOSURE_VERSION;
  rentalId: string;
  documentNumber: string;
  vehicleVin: string;
  startAt: string;
  actualReturnAt: string;
  startOdometer: number | null;
  finalOdometer: number;
  fuelPercent: number;
  location: string;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

function integer(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${field} must be an integer from ${min} to ${max}`);
  }
  return value;
}

export function parseTarsClosure(value: unknown, now = new Date()): TarsClosure {
  if (!value || typeof value !== "object") throw new Error("TARS closure must be an object");
  const input = value as Record<string, unknown>;
  if (input.version !== TARS_CLOSURE_VERSION) throw new Error("Unsupported TARS closure version");

  const startAt = text(input.startAt, "Rental start");
  const actualReturnAt = text(input.actualReturnAt, "Actual return");
  const startMs = Date.parse(startAt);
  const returnMs = Date.parse(actualReturnAt);
  if (Number.isNaN(startMs) || Number.isNaN(returnMs)) throw new Error("Rental dates must be valid ISO timestamps");
  if (returnMs < startMs) throw new Error("Actual return cannot be before the rental start");
  if (returnMs > now.getTime() + 5 * 60_000) throw new Error("Actual return cannot be in the future");

  const startOdometer = input.startOdometer === null || input.startOdometer === undefined
    ? null
    : integer(input.startOdometer, "Start odometer", 0, 999999);
  const finalOdometer = integer(input.finalOdometer, "Final odometer", 0, 999999);
  if (startOdometer !== null && finalOdometer < startOdometer) throw new Error("Final odometer cannot be lower than the starting odometer");

  return {
    version: TARS_CLOSURE_VERSION,
    rentalId: text(input.rentalId, "Rental ID"),
    documentNumber: parseTarsDocumentNumber(input.documentNumber),
    vehicleVin: text(input.vehicleVin, "Vehicle VIN"),
    startAt: new Date(startMs).toISOString(),
    actualReturnAt: new Date(returnMs).toISOString(),
    startOdometer,
    finalOdometer,
    fuelPercent: integer(input.fuelPercent, "Fuel level", 0, 100),
    location: text(input.location, "Rental location"),
  };
}

export const TARS_HANDOFF_VERSION = 1 as const;

export interface TarsHandoff {
  version: typeof TARS_HANDOFF_VERSION;
  rentalId: string;
  agreementNumber: string;
  signatureConfirmed: true;
  customer: {
    name: string;
    emiratesId: string;
  };
  vehicle: {
    plate: string;
    vin: string;
  };
  rental: {
    startAt: string;
    returnAt: string;
    location: string;
    odometer: number;
    fuelPercent: number;
  };
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

export function parseTarsDocumentNumber(value: unknown): string {
  const documentNumber = text(value, "TARS document number");
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{1,63}$/.test(documentNumber)) {
    throw new Error("Enter the document number shown in TARS");
  }
  return documentNumber;
}

export function parseTarsHandoff(value: unknown): TarsHandoff {
  if (!value || typeof value !== "object") throw new Error("TARS handoff must be an object");
  const input = value as Record<string, unknown>;
  if (input.version !== TARS_HANDOFF_VERSION) throw new Error("Unsupported TARS handoff version");
  if (input.signatureConfirmed !== true) throw new Error("Confirm the required signatures before preparing TARS");

  const customer = input.customer as Record<string, unknown> | undefined;
  const vehicle = input.vehicle as Record<string, unknown> | undefined;
  const rental = input.rental as Record<string, unknown> | undefined;
  if (!customer || !vehicle || !rental) throw new Error("Customer, vehicle, and rental details are required");

  const emiratesId = text(customer.emiratesId, "Emirates ID").replace(/\D/g, "");
  if (!/^784\d{12}$/.test(emiratesId)) throw new Error("Emirates ID must contain 15 digits");

  const startAt = text(rental.startAt, "Rental start");
  const returnAt = text(rental.returnAt, "Expected return");
  const startMs = Date.parse(startAt);
  const returnMs = Date.parse(returnAt);
  if (Number.isNaN(startMs) || Number.isNaN(returnMs)) throw new Error("Rental dates must be valid ISO timestamps");
  if (returnMs <= startMs) throw new Error("Expected return must be after the rental start");

  return {
    version: TARS_HANDOFF_VERSION,
    rentalId: text(input.rentalId, "Rental ID"),
    agreementNumber: text(input.agreementNumber, "Agreement number"),
    signatureConfirmed: true,
    customer: {
      name: text(customer.name, "Customer name"),
      emiratesId,
    },
    vehicle: {
      plate: text(vehicle.plate, "Vehicle plate"),
      vin: text(vehicle.vin, "Vehicle VIN"),
    },
    rental: {
      startAt: new Date(startMs).toISOString(),
      returnAt: new Date(returnMs).toISOString(),
      location: text(rental.location, "Rental location"),
      odometer: integer(rental.odometer, "Odometer", 0, 999999),
      fuelPercent: integer(rental.fuelPercent, "Fuel level", 0, 100),
    },
  };
}

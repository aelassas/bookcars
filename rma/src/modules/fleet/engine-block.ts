export const ENGINE_BLOCK_CONFIRMATION = "BLOCK";
export const MAX_ENGINE_BLOCK_TELEMETRY_AGE_MS = 5 * 60 * 1000;

export function assertEngineBlockConfirmation(value: unknown): void {
  if (value !== ENGINE_BLOCK_CONFIRMATION) throw new Error(`Type ${ENGINE_BLOCK_CONFIRMATION} to confirm`);
}

export function assertEngineBlockAllowed(input: {
  vehicleStatus: string;
  blocked: boolean;
  ignition: boolean;
  speed: number;
  lastFixAt: string;
}, now = new Date()): void {
  if (input.vehicleStatus === "sold") throw new Error("A sold vehicle cannot be blocked");
  if (input.blocked) throw new Error("The engine is already blocked");
  if (input.ignition || input.speed > 0) throw new Error("The vehicle must be parked with ignition off before blocking the engine");
  const fixedAt = Date.parse(input.lastFixAt);
  const age = now.getTime() - fixedAt;
  if (!Number.isFinite(fixedAt) || age < -MAX_ENGINE_BLOCK_TELEMETRY_AGE_MS || age > MAX_ENGINE_BLOCK_TELEMETRY_AGE_MS) {
    throw new Error("Fresh GPS confirmation (less than 5 minutes old) is required before blocking the engine");
  }
}

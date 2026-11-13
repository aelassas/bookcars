export const ENGINE_BLOCK_CONFIRMATION = "BLOCK";

export function assertEngineBlockConfirmation(value: unknown): void {
  if (value !== ENGINE_BLOCK_CONFIRMATION) {
    throw new Error(`Type ${ENGINE_BLOCK_CONFIRMATION} to confirm`);
  }
}

export function assertEngineBlockAllowed(input: {
  vehicleStatus: string;
  blocked: boolean;
  ignition: boolean;
  speed: number;
}): void {
  if (input.vehicleStatus === "sold") throw new Error("A sold vehicle cannot be blocked");
  if (input.blocked) throw new Error("The engine is already blocked");
  if (input.ignition || input.speed > 0) {
    throw new Error("The vehicle must be parked with ignition off before blocking the engine");
  }
}

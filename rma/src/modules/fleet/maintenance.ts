export const DEFAULT_OIL_CHANGE_INTERVAL_KM = 8000;

export function nextOilChangeOdometer(
  odometer: number,
  interval = DEFAULT_OIL_CHANGE_INTERVAL_KM,
): number {
  if (!Number.isInteger(odometer) || odometer < 0) throw new Error("Odometer must be a non-negative integer");
  if (!Number.isInteger(interval) || interval <= 0) throw new Error("Oil change interval must be a positive integer");
  return odometer + interval;
}

export function isServiceDue(input: {
  odometer: number;
  nextServiceOdometer: number | null;
  nextServiceDate: string | null;
}, now = new Date()): boolean {
  if (input.nextServiceOdometer != null && input.odometer >= input.nextServiceOdometer) return true;
  if (!input.nextServiceDate) return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return input.nextServiceDate <= today;
}

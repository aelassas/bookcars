export const DEFAULT_SERVICE_WARNING_KM = 8000;
export const DEFAULT_SERVICE_LIMIT_KM = 10000;

export function nextServiceLimitOdometer(odometer: number, limit = DEFAULT_SERVICE_LIMIT_KM): number {
  if (!Number.isInteger(odometer) || odometer < 0) throw new Error("Odometer must be a non-negative integer");
  if (!Number.isInteger(limit) || limit <= 0) throw new Error("Service limit must be a positive integer");
  return odometer + limit;
}

export function serviceState(input: {
  currentOdometer: number;
  lastServiceOdometer: number | null;
  nextServiceOdometer: number | null;
  warningIntervalKm?: number;
  limitIntervalKm?: number;
}): { status: "unknown" | "ok" | "due_soon" | "due"; warningAtKm: number | null; limitAtKm: number | null; remainingKm: number | null } {
  const warning = input.warningIntervalKm ?? DEFAULT_SERVICE_WARNING_KM;
  const limit = input.limitIntervalKm ?? DEFAULT_SERVICE_LIMIT_KM;
  const limitAtKm = input.lastServiceOdometer != null ? input.lastServiceOdometer + limit : input.nextServiceOdometer;
  if (limitAtKm == null) return { status: "unknown", warningAtKm: null, limitAtKm: null, remainingKm: null };
  const warningAtKm = input.lastServiceOdometer != null ? input.lastServiceOdometer + warning : limitAtKm - Math.max(0, limit - warning);
  const status = input.currentOdometer >= limitAtKm ? "due" : input.currentOdometer >= warningAtKm ? "due_soon" : "ok";
  return { status, warningAtKm, limitAtKm, remainingKm: Math.max(0, limitAtKm - input.currentOdometer) };
}

export function isServiceDue(input: { odometer: number; nextServiceOdometer: number | null; nextServiceDate: string | null }, now = new Date()): boolean {
  if (input.nextServiceOdometer != null && input.odometer >= input.nextServiceOdometer) return true;
  if (!input.nextServiceDate) return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return input.nextServiceDate <= today;
}

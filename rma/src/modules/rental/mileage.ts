export const DEFAULT_DAILY_MILEAGE_ALLOWANCE_KM = 150;

export function mileageAllowanceKm(totalDays: number, dailyMileageLimitKm: number): number {
  if (!Number.isInteger(totalDays) || totalDays <= 0) throw new Error("Paid rental days must be a positive integer");
  if (!Number.isInteger(dailyMileageLimitKm) || dailyMileageLimitKm <= 0) throw new Error("Daily mileage allowance must be a positive integer");
  return totalDays * dailyMileageLimitKm;
}

export function calculateMileageUsage(input: {
  startOdometer: number | null;
  finalOdometer: number | null;
  dailyMileageLimitKm: number | null;
  totalDays: number | null;
}): { drivenKm: number; allowedKm: number; remainingKm: number; excessKm: number } | null {
  const { startOdometer, finalOdometer, dailyMileageLimitKm, totalDays } = input;
  if (startOdometer == null || finalOdometer == null || dailyMileageLimitKm == null || totalDays == null) return null;
  const drivenKm = Math.max(0, finalOdometer - startOdometer);
  const allowedKm = mileageAllowanceKm(totalDays, dailyMileageLimitKm);
  return {
    drivenKm,
    allowedKm,
    remainingKm: Math.max(0, allowedKm - drivenKm),
    excessKm: Math.max(0, drivenKm - allowedKm),
  };
}

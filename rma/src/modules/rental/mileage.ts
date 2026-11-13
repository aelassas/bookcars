export function calculateMileageUsage(input: {
  startOdometer: number | null;
  finalOdometer: number | null;
  dailyMileageLimitKm: number | null;
  startDate: Date | null;
  actualReturnDate: Date | null;
}): { drivenKm: number; allowedKm: number; excessKm: number } | null {
  const { startOdometer, finalOdometer, dailyMileageLimitKm, startDate, actualReturnDate } = input;
  if (startOdometer == null || finalOdometer == null || dailyMileageLimitKm == null || !startDate || !actualReturnDate) {
    return null;
  }
  const days = Math.max(1, Math.ceil((actualReturnDate.getTime() - startDate.getTime()) / 86_400_000));
  const drivenKm = Math.max(0, finalOdometer - startOdometer);
  const allowedKm = dailyMileageLimitKm * days;
  return { drivenKm, allowedKm, excessKm: Math.max(0, drivenKm - allowedKm) };
}

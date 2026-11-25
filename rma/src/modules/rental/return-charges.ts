import { rentalAdditionalPricingDays } from "./pricing";

export function calculateReturnCharges({
  returnDate,
  actualReturnDate,
  dailyRate,
  totalDays,
  extraChargeAmount = 0,
}: {
  returnDate: Date;
  actualReturnDate: Date;
  dailyRate: number;
  totalDays?: number;
  extraChargeAmount?: number;
}) {
  if (!Number.isInteger(extraChargeAmount) || extraChargeAmount < 0) {
    throw new Error("Extra charge must be a non-negative whole number");
  }
  const lateMs = actualReturnDate.getTime() - returnDate.getTime();
  const extraDays = lateMs > 0 ? Math.ceil(lateMs / 86_400_000) : 0;
  const lateFee = totalDays === undefined
    ? extraDays * dailyRate
    : rentalAdditionalPricingDays(totalDays, totalDays + extraDays) * dailyRate;
  return { extraDays, lateFee, extraChargeAmount, totalExtra: lateFee + extraChargeAmount };
}

export function assertValidCustomerRating(value: number | undefined) {
  if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 5)) {
    throw new Error("Customer rating must be a whole number from 1 to 5");
  }
}

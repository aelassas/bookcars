import { rentalAdditionalPricingDays } from "./pricing";

export function calculateRentalExtension(input: {
  currentReturnDate: Date;
  newReturnDate: Date;
  currentTotalDays: number;
  dailyRate: number;
  total: number;
  balanceDue: number;
}) {
  const { currentReturnDate, newReturnDate, currentTotalDays, dailyRate, total, balanceDue } = input;
  if (Number.isNaN(newReturnDate.getTime())) throw new Error("Enter a valid new return date");
  if (newReturnDate <= currentReturnDate) throw new Error("New return must be later than the current return date");
  const extraDays = Math.max(1, Math.ceil((newReturnDate.getTime() - currentReturnDate.getTime()) / 86_400_000));
  const newTotalDays = currentTotalDays + extraDays;
  const extraPricedDays = rentalAdditionalPricingDays(currentTotalDays, newTotalDays);
  const extraTotal = extraPricedDays * dailyRate;
  return {
    extraDays,
    extraPricedDays,
    extraTotal,
    newTotalDays,
    newTotal: total + extraTotal,
    newBalanceDue: balanceDue + extraTotal,
  };
}

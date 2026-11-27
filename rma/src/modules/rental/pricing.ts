import type { Channel } from "@/platform/db/rental-extras";

export type CustomerType = "tourist" | "resident" | "owner";

export function rentalPricingDays(totalDays: number): number {
  return totalDays >= 28 && totalDays <= 31 ? 30 : totalDays;
}

export function rentalAdditionalPricingDays(currentTotalDays: number, nextTotalDays: number): number {
  return rentalPricingDays(nextTotalDays) - rentalPricingDays(currentTotalDays);
}

export function defaultDeposit(customerType: CustomerType, tierDeposit?: number | null) {
  return customerType === "resident" || customerType === "owner" ? 0 : tierDeposit ?? 1500;
}

export function resolveRentalPricing({
  totalDays,
  channel,
  customerType = "tourist",
  tierDailyRate,
  tierDeposit,
  manualDailyRate,
  manualDeposit,
}: {
  totalDays: number;
  channel: Channel;
  customerType?: CustomerType;
  tierDailyRate?: number;
  tierDeposit?: number | null;
  manualDailyRate?: number;
  manualDeposit?: number;
}) {
  if (customerType === "owner") return { dailyRate: 0, deposit: 0, pricedFromTier: false };
  if (manualDailyRate !== undefined && (!Number.isInteger(manualDailyRate) || manualDailyRate <= 0)) {
    throw new Error("Daily rate must be a positive whole number");
  }
  if (manualDeposit !== undefined && (!Number.isInteger(manualDeposit) || manualDeposit < 0)) {
    throw new Error("Deposit must be a non-negative whole number");
  }
  const dailyRate = manualDailyRate ?? tierDailyRate;
  if (dailyRate === undefined) {
    throw new Error(`No price tier for this vehicle (${channel}, ${totalDays} day${totalDays === 1 ? "" : "s"}) — set a daily rate or add tiers.`);
  }
  return {
    dailyRate,
    deposit: manualDeposit ?? defaultDeposit(customerType, tierDeposit),
    pricedFromTier: tierDailyRate !== undefined && dailyRate === tierDailyRate,
  };
}

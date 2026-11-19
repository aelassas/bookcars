import type { Channel } from "@/platform/db/rental-extras";

export type CustomerType = "tourist" | "resident";

export function defaultDeposit(customerType: CustomerType, tierDeposit?: number | null) {
  return customerType === "resident" ? 0 : tierDeposit ?? 1500;
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

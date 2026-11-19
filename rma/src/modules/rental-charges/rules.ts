export const CHARGE_KINDS = ["fine", "salik", "parkin", "parkonic"] as const;
export type ChargeKind = (typeof CHARGE_KINDS)[number];

export interface RentalChargeInput {
  vehicleId: string;
  kind: ChargeKind;
  externalId: string;
  occurredAt: Date;
  amount: number;
  description?: string;
  location?: string;
  source?: string;
}

export function parseRentalChargeInput(input: RentalChargeInput): RentalChargeInput {
  if (!input.vehicleId) throw new Error("Vehicle is required");
  if (!CHARGE_KINDS.includes(input.kind)) throw new Error("Unsupported charge type");
  const externalId = input.externalId?.trim();
  if (!externalId || externalId.length > 160) throw new Error("Operator reference is required");
  if (!(input.occurredAt instanceof Date) || Number.isNaN(input.occurredAt.getTime())) throw new Error("Valid violation or parking time is required");
  if (!Number.isFinite(input.amount) || input.amount <= 0 || Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > 1e-8) {
    throw new Error("Charge amount must be positive with no more than two decimal places");
  }
  return {
    ...input,
    externalId,
    description: input.description?.trim().slice(0, 1000) || undefined,
    location: input.location?.trim().slice(0, 300) || undefined,
    source: input.source?.trim().slice(0, 80) || "manual",
  };
}

export function chargeKindLabel(kind: string): string {
  return ({ fine: "Traffic fine", salik: "Salik", parkin: "Parkin parking", parkonic: "Parkonic parking" } as Record<string, string>)[kind] ?? kind;
}

export function buildChargeNotification(input: {
  kind: string;
  plate: string;
  occurredAt: Date;
  amount: number;
  description?: string | null;
  location?: string | null;
  externalId: string;
}): string {
  const lines = [
    `RMA Car Rental: new ${chargeKindLabel(input.kind)} charge for vehicle ${input.plate}.`,
    `Date/time: ${input.occurredAt.toISOString().slice(0, 16).replace("T", " ")} UTC`,
  ];
  if (input.location) lines.push(`Location: ${input.location}`);
  if (input.description) lines.push(`Details: ${input.description}`);
  lines.push(`Amount: ${input.amount} AED`, `Reference: ${input.externalId}`);
  if (input.kind === "fine") lines.push("Please pay within 24 hours of this notification. Contact the RMA manager if you believe this charge is incorrect.");
  else lines.push("Please contact the RMA manager to arrange payment.");
  return lines.join("\n");
}

export function isFineBlockEligible(input: {
  kind: string;
  status: string;
  paymentDueAt: Date | null;
  chargeRentalId: string;
  currentRentalId: string | null;
}, now: Date): boolean {
  return input.kind === "fine" &&
    ["unpaid", "notification_queued"].includes(input.status) &&
    input.paymentDueAt != null &&
    input.paymentDueAt.getTime() <= now.getTime() &&
    input.currentRentalId != null &&
    input.chargeRentalId === input.currentRentalId;
}

function formatAed(amount: number): string {
  return String(Number(amount.toFixed(2)));
}

export function buildChargeStatement(input: {
  customerName: string;
  plate: string;
  final: boolean;
  charges: Array<{ kind: string; amount: number; status: string }>;
}): string {
  const charges = input.charges.filter((charge) => charge.status !== "void");
  const lines = [
    `RMA Car Rental — ${input.final ? "final rental statement" : "15-day rental statement"}`,
    `Customer: ${input.customerName}`,
    `Vehicle: ${input.plate}`,
  ];
  let outstanding = 0;
  for (const kind of ["salik", "parkin", "parkonic", "fine"]) {
    const rows = charges.filter((charge) => charge.kind === kind);
    if (rows.length === 0) continue;
    const total = rows.reduce((sum, charge) => sum + charge.amount, 0);
    const due = rows.filter((charge) => charge.status !== "paid").reduce((sum, charge) => sum + charge.amount, 0);
    outstanding += due;
    lines.push(`${chargeKindLabel(kind)}: ${rows.length} charge${rows.length === 1 ? "" : "s"}; total ${formatAed(total)} AED; unpaid ${formatAed(due)} AED`);
  }
  if (charges.length === 0) lines.push("No Salik, parking or traffic-fine charges recorded.");
  lines.push(`Outstanding charges: ${formatAed(outstanding)} AED`, input.final ? "Late-arriving charges will remain linked to this rental and your customer record." : "This statement covers charges recorded so far; later operator charges may still arrive.");
  return lines.join("\n");
}

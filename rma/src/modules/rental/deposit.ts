// Deposit-contract resolution (spec: on rental completion the deposit is either
// returned in full, partially returned, or withheld with a reason → a deposit
// notification is raised). Pure logic, no I/O — unit-tested independently of the
// auth/DB layer.

export type DepositOutcome = "returned" | "partial" | "withheld";

export interface DepositResolution {
  depositStatus: "returned" | "partial" | "withheld";
  depositRefunded: number; // amount returned to the renter
  depositWithheldReason: string | null;
}

/**
 * Resolve a Deposit-contract's deposit at end of rental.
 * - returned: full deposit back to the renter, no reason needed.
 * - withheld: nothing back; a reason is mandatory.
 * - partial:  some back (0 < amount < deposit); a reason is mandatory.
 * Throws on invalid input (callers surface the message to the user).
 */
export function computeDepositResolution(
  deposit: number,
  outcome: DepositOutcome,
  refundedAmount?: number,
  reason?: string,
): DepositResolution {
  if (!Number.isFinite(deposit) || deposit <= 0) {
    throw new Error("This contract has no deposit to resolve");
  }
  const trimmedReason = (reason ?? "").trim();

  if (outcome === "returned") {
    return { depositStatus: "returned", depositRefunded: deposit, depositWithheldReason: null };
  }
  if (outcome === "withheld") {
    if (!trimmedReason) throw new Error("A reason is required to withhold the deposit");
    return { depositStatus: "withheld", depositRefunded: 0, depositWithheldReason: trimmedReason };
  }
  if (outcome === "partial") {
    const amt = refundedAmount ?? 0;
    if (!Number.isFinite(amt) || amt <= 0 || amt >= deposit) {
      throw new Error("Partial refund must be greater than 0 and less than the deposit");
    }
    if (!trimmedReason) throw new Error("A reason is required when withholding part of the deposit");
    return { depositStatus: "partial", depositRefunded: Math.round(amt), depositWithheldReason: trimmedReason };
  }
  throw new Error(`Unknown deposit outcome: ${String(outcome)}`);
}

/** Human-readable deposit notification line for the audit log / UI. */
export function depositNotification(r: DepositResolution, deposit: number): string {
  if (r.depositStatus === "returned") return `Deposit returned in full (${deposit} AED)`;
  if (r.depositStatus === "partial") {
    return `Deposit partially returned: ${r.depositRefunded} of ${deposit} AED — withheld: ${r.depositWithheldReason}`;
  }
  return `Deposit withheld (${deposit} AED) — reason: ${r.depositWithheldReason}`;
}

export const PAYMENT_METHODS = ["cash", "card", "bank_transfer", "crypto", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function availablePaymentBalance(balanceDue: number, pendingTotal: number) {
  return Math.max(0, balanceDue - pendingTotal);
}

export function editablePaymentBalance(input: {
  balanceDue: number;
  currentAmount: number;
  currentStatus: string;
  otherPendingTotal: number;
}) {
  const confirmedAmount = input.currentStatus === "confirmed" ? input.currentAmount : 0;
  return availablePaymentBalance(input.balanceDue + confirmedAmount, input.otherPendingTotal);
}

function assertPaymentMethod(method: string) {
  if (!(PAYMENT_METHODS as readonly string[]).includes(method)) throw new Error("Unsupported payment method");
}

export function assertValidPayment(amount: number, availableBalance: number, method: string) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Payment amount must be a positive whole number");
  if (amount > availableBalance) throw new Error(`Payment exceeds the available balance of ${availableBalance} AED`);
  assertPaymentMethod(method);
}

export function assertValidChargePayment(amount: number, method: string) {
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) {
    throw new Error("Charge payment must be positive with no more than two decimal places");
  }
  assertPaymentMethod(method);
}

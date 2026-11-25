import { describe, expect, it } from "vitest";
import { assertValidChargePayment, assertValidPayment, availablePaymentBalance, editablePaymentBalance } from "./payment-rules";

describe("payment validation", () => {
  it("accepts a bank transfer within the outstanding balance", () => {
    expect(() => assertValidPayment(1000, 1000, "bank_transfer")).not.toThrow();
  });

  it.each([0, -1, 1.5, NaN, Infinity])("rejects invalid rental amount %s", (amount) => {
    expect(() => assertValidPayment(amount, 1000, "cash")).toThrow("positive whole number");
  });

  it("accepts exact decimal operator-charge payments without allowing fractional fils", () => {
    expect(() => assertValidChargePayment(4.2, "bank_transfer")).not.toThrow();
    expect(() => assertValidChargePayment(4.222, "bank_transfer")).toThrow("decimal");
  });

  it("rejects overpayment instead of silently losing money at confirmation", () => {
    expect(() => assertValidPayment(1001, 1000, "card")).toThrow("exceeds the available balance");
  });

  it("subtracts pending payments before accepting another payment", () => {
    expect(availablePaymentBalance(3780, 1000)).toBe(2780);
    expect(availablePaymentBalance(3780, 3780)).toBe(0);
    expect(() => assertValidPayment(3780, availablePaymentBalance(3780, 3780), "bank_transfer")).toThrow("available balance of 0");
  });

  it("includes the edited confirmed payment and excludes other pending payments from its available balance", () => {
    expect(editablePaymentBalance({ balanceDue: 2280, currentAmount: 3780, currentStatus: "confirmed", otherPendingTotal: 500 })).toBe(5560);
    expect(editablePaymentBalance({ balanceDue: 2280, currentAmount: 1000, currentStatus: "pending", otherPendingTotal: 500 })).toBe(1780);
  });

  it("accepts crypto as a payment method", () => {
    expect(() => assertValidPayment(100, 1000, "crypto")).not.toThrow();
    expect(() => assertValidChargePayment(4.2, "crypto")).not.toThrow();
  });

  it("rejects an unsupported method", () => {
    expect(() => assertValidPayment(100, 1000, "paypal")).toThrow("Unsupported payment method");
    expect(() => assertValidChargePayment(4.2, "paypal")).toThrow("Unsupported payment method");
  });
});

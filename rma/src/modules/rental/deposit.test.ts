import { describe, it, expect } from "vitest";
import { computeDepositResolution, depositNotification } from "./deposit";

describe("computeDepositResolution", () => {
  it("returns the full deposit on 'returned'", () => {
    const r = computeDepositResolution(5000, "returned");
    expect(r).toEqual({ depositStatus: "returned", depositRefunded: 5000, depositWithheldReason: null });
  });

  it("withholds the whole deposit with a reason", () => {
    const r = computeDepositResolution(5000, "withheld", undefined, "Scratch on rear bumper");
    expect(r).toEqual({ depositStatus: "withheld", depositRefunded: 0, depositWithheldReason: "Scratch on rear bumper" });
  });

  it("requires a reason to withhold", () => {
    expect(() => computeDepositResolution(5000, "withheld")).toThrow(/reason is required/i);
    expect(() => computeDepositResolution(5000, "withheld", undefined, "   ")).toThrow(/reason is required/i);
  });

  it("handles a partial refund with a reason", () => {
    const r = computeDepositResolution(5000, "partial", 3500, "Salik tolls unpaid");
    expect(r).toEqual({ depositStatus: "partial", depositRefunded: 3500, depositWithheldReason: "Salik tolls unpaid" });
  });

  it("rejects a partial refund outside (0, deposit)", () => {
    expect(() => computeDepositResolution(5000, "partial", 0, "x")).toThrow(/greater than 0/i);
    expect(() => computeDepositResolution(5000, "partial", 5000, "x")).toThrow(/less than the deposit/i);
    expect(() => computeDepositResolution(5000, "partial", 6000, "x")).toThrow();
  });

  it("requires a reason for a partial refund", () => {
    expect(() => computeDepositResolution(5000, "partial", 3500)).toThrow(/reason is required/i);
  });

  it("rejects resolving a zero/negative deposit", () => {
    expect(() => computeDepositResolution(0, "returned")).toThrow(/no deposit/i);
    expect(() => computeDepositResolution(-1, "returned")).toThrow(/no deposit/i);
  });
});

describe("depositNotification", () => {
  it("phrases each outcome", () => {
    expect(depositNotification({ depositStatus: "returned", depositRefunded: 5000, depositWithheldReason: null }, 5000)).toMatch(/returned in full/i);
    expect(depositNotification({ depositStatus: "withheld", depositRefunded: 0, depositWithheldReason: "dent" }, 5000)).toMatch(/withheld.*dent/i);
    expect(depositNotification({ depositStatus: "partial", depositRefunded: 3500, depositWithheldReason: "tolls" }, 5000)).toMatch(/partially returned: 3500 of 5000/i);
  });
});

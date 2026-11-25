import { describe, expect, it } from "vitest";
import { recordHref, safeReturnHref } from "./return-navigation";

describe("record return navigation", () => {
  const fallback = "/take-auto/customers";
  it("round-trips search and pagination, including characters in customer names", () => {
    const returnTo = "/take-auto/customers?search=A%26B&page=3";
    const detail = new URL(recordHref("/take-auto/customers/123", returnTo), "https://crm.local");
    expect(safeReturnHref(detail.searchParams.get("returnTo"), fallback)).toBe(returnTo);
  });
  it("supports returning from a contract to its customer or the CRM tab", () => {
    expect(safeReturnHref("/take-auto/crm?tab=deals&dealPage=2", fallback)).toBe("/take-auto/crm?tab=deals&dealPage=2");
    expect(safeReturnHref("/take-auto/customers/123", fallback)).toBe("/take-auto/customers/123");
  });
  it.each([null, "", "https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", "/other/customers", "/take-auto/../other/customers", "/take-auto/%2e%2e/other", "/take-auto\n/customers"])("uses a safe fallback for %s", (url) => {
    expect(safeReturnHref(url, fallback)).toBe(fallback);
  });
});

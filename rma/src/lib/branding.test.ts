import { describe, expect, it } from "vitest";
import { tenantWordmark } from "./branding";

describe("tenantWordmark", () => {
  it("does not duplicate the CRM suffix in a tenant brand", () => {
    expect(tenantWordmark("rma", "RMA Car Rental", "RMA-CRM")).toEqual({
      accent: "RMA",
      rest: "CRM",
    });
  });

  it("preserves a brand without an explicit suffix", () => {
    expect(tenantWordmark("demo", "Demo Rental", "Demo Rental")).toEqual({
      accent: "DemoRental",
      rest: "CRM",
    });
  });
});

import { describe, expect, it } from "vitest";
import { normalizeCustomerInput } from "./customer-input";

describe("customer form data", () => {
  it("trims fields and preserves explicitly cleared optional values", () => {
    expect(normalizeCustomerInput({ name: "  Amina  ", email: "  ", notes: "  Follow up\nMonday  " }))
      .toEqual({ name: "Amina", email: "", notes: "Follow up\nMonday" });
  });
  it("leaves omitted fields untouched on partial edits", () => {
    expect(normalizeCustomerInput({ phone: "+971 50 000 0000" })).toEqual({ phone: "+971 50 000 0000" });
  });
  it.each([{ name: "  " }, { email: "broken@" }, { division: "invalid" }, { name: null }])("rejects invalid fields: %j", (input) => {
    expect(() => normalizeCustomerInput(input as Parameters<typeof normalizeCustomerInput>[0])).toThrow();
  });
  it("does not allow callers to write ownership or tenant fields", () => {
    const input = { name: "Amina", tenantId: "other", companyId: "other", id: "other" };
    expect(normalizeCustomerInput(input)).toEqual({ name: "Amina" });
  });
});

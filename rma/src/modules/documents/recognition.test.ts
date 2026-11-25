import { describe, expect, it } from "vitest";
import { parseRecognizedCustomerData } from "./recognition";

describe("parseRecognizedCustomerData", () => {
  it("keeps readable customer fields and normalizes Emirates ID", () => {
    expect(parseRecognizedCustomerData({
      name: "  Ruslan Anianov ",
      emiratesId: "784-1985-1234567-1",
      dateOfBirth: "1985-02-03",
      driverLicenseExpiry: "2028-12-31",
    })).toEqual({
      name: "Ruslan Anianov",
      emiratesId: "784198512345671",
      dateOfBirth: "1985-02-03",
      driverLicenseExpiry: "2028-12-31",
    });
  });

  it("drops malformed identifiers, dates, emails and non-string values", () => {
    expect(parseRecognizedCustomerData({
      emiratesId: "12345",
      dateOfBirth: "03/02/1985",
      email: "not-an-email",
      name: 42,
    })).toEqual({});
  });

  it("rejects a non-object response", () => {
    expect(() => parseRecognizedCustomerData(null)).toThrow("invalid data");
  });
});

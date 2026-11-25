import { describe, expect, it } from "vitest";
import { parseRecognizedCustomerData, parseRecognizedVehicleData } from "./recognition";

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


describe("parseRecognizedVehicleData", () => {
  it("keeps reviewed Mulkiya fields and normalizes the VIN", () => {
    expect(parseRecognizedVehicleData({
      vin: "w1k5j4gb3sn518889",
      plate: "GG 31235",
      colour: "Black",
      year: "2025",
      registrationExpiry: "2027-11-30",
    })).toEqual({
      vin: "W1K5J4GB3SN518889",
      plate: "GG 31235",
      colour: "Black",
      year: "2025",
      registrationExpiry: "2027-11-30",
    });
  });

  it("drops guessed invalid VINs, years and dates", () => {
    expect(parseRecognizedVehicleData({ vin: "NOT-A-VIN", year: "25", registrationExpiry: "30/11/2027" })).toEqual({});
  });
});

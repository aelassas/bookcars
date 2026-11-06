import { describe, expect, it } from "vitest";
import { parseTarsDocumentNumber, parseTarsHandoff } from "./handoff";

const valid = {
  version: 1,
  rentalId: "6ee540e3-0c13-4f0b-a3f2-e8c5f8c2f750",
  agreementNumber: "6EE540E3",
  signatureConfirmed: true,
  customer: { name: "Test Customer", emiratesId: "784-2001-4218488-4" },
  vehicle: { plate: "B 32214", vin: "5UX13EU01R9S85429" },
  rental: {
    startAt: "2026-11-06T06:00:00.000Z",
    returnAt: "2026-11-09T06:00:00.000Z",
    location: "Dubai",
    odometer: 12000,
    fuelPercent: 75,
  },
};

describe("parseTarsHandoff", () => {
  it("normalizes the Emirates ID and timestamps", () => {
    const result = parseTarsHandoff(valid);
    expect(result.customer.emiratesId).toBe("784200142184884");
    expect(result.rental.startAt).toBe(valid.rental.startAt);
  });

  it.each([
    ["an unsigned contract", { signatureConfirmed: false }, "signatures"],
    ["a malformed Emirates ID", { customer: { emiratesId: "123" } }, "15 digits"],
    ["a return before the start", { rental: { returnAt: "2026-11-05T06:00:00.000Z" } }, "after"],
    ["a missing VIN", { vehicle: { vin: "" } }, "VIN"],
    ["a non-integer fuel level", { rental: { fuelPercent: 50.5 } }, "integer"],
    ["an unsupported version", { version: 2 }, "version"],
  ])("rejects %s", (_label, patch, message) => {
    expect(() => parseTarsHandoff({
      ...valid,
      ...patch,
      customer: { ...valid.customer, ...(patch as { customer?: object }).customer },
      vehicle: { ...valid.vehicle, ...(patch as { vehicle?: object }).vehicle },
      rental: { ...valid.rental, ...(patch as { rental?: object }).rental },
    })).toThrow(message);
  });
});

describe("parseTarsDocumentNumber", () => {
  it("trims a valid TARS reference", () => {
    expect(parseTarsDocumentNumber(" 56235-3382 ")).toBe("56235-3382");
  });

  it.each(["", "has spaces", "-leading-dash", "with/slash", "x".repeat(65)])("rejects %j", (value) => {
    expect(() => parseTarsDocumentNumber(value)).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { httpParkingConnector, normalizeParkingPlate, parkingApiEvents, parseParkingCsv } from "./connectors";

describe("parking feed normalization", () => {
  it("parses quoted CSV and preserves exact decimal amounts and Dubai time", () => {
    const rows = parseParkingCsv('reference,plate,occurredAt,amount,location,description\nP-1,"A 12345",2026-11-21T10:15:00+04:00,4.50,"Zone A, bay 4","Visitor, hourly"\n');
    expect(rows[0]).toMatchObject({ reference: "P-1", amount: 4.5, location: "Zone A, bay 4", description: "Visitor, hourly" });
    expect(rows[0].occurredAt.toISOString()).toBe("2026-11-21T06:15:00.000Z");
    expect(normalizeParkingPlate(rows[0].plate)).toBe("A12345");
  });

  it("rejects ambiguous local timestamps and malformed rows", () => {
    expect(() => parseParkingCsv("reference,plate,occurredAt,amount\nP-1,A1,2026-11-21T10:15:00,4.00")).toThrow("timezone");
    expect(() => parseParkingCsv("reference,plate,occurredAt,amount\nP-1,A1,2026-11-21T10:15:00Z,4.001")).toThrow("two decimal");
  });

  it("accepts only the documented API envelope", () => {
    const event = { reference: "P-2", plate: "B 2", occurredAt: "2026-11-21T06:15:00Z", amount: "4.20" };
    expect(parkingApiEvents({ events: [event] })[0].amount).toBe(4.2);
    expect(() => parkingApiEvents({ transactions: [event] })).toThrow("events");
  });

  it("requires a token for an authenticated connector", async () => {
    expect(httpParkingConnector("parkin", {})).toBeNull();
    const connector = httpParkingConnector("parkin", { PARKIN_API_URL: "https://operator.example/events" });
    await expect(connector!.pull(new Date(), new Date())).rejects.toThrow("PARKIN_API_TOKEN");
  });
});

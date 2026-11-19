import { describe, expect, it } from "vitest";
import { parseTripDate } from "@/platform/integrations/salik/client";
import { salikChargeReference } from "./salik-rules";

describe("Salik charge import", () => {
  it("parses Dubai event time correctly regardless of the server timezone", () => {
    expect(parseTripDate("8/13/2026 1:21:03 PM")?.toISOString()).toBe("2026-08-13T09:21:03.000Z");
    expect(parseTripDate("8/13/2026 12:05:00 AM")?.toISOString()).toBe("2026-08-12T20:05:00.000Z");
  });

  it("deduplicates the same trip but keeps different trips separate", () => {
    const trip = { plateNo: "12345", plateCode: "A", occurredAt: new Date("2026-11-18T10:00:00Z"), amount: 4.2, gate: "Al Barsha" };
    expect(salikChargeReference(trip)).toBe(salikChargeReference({ ...trip }));
    expect(salikChargeReference(trip)).not.toBe(salikChargeReference({ ...trip, occurredAt: new Date("2026-11-18T10:01:00Z") }));
    expect(salikChargeReference(trip).length).toBeLessThanOrEqual(160);
  });
});

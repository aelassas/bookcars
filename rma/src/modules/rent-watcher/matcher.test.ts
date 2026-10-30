import { describe, it, expect } from "vitest";
import { matchDemand, pickTier, requestedDays, structureFromExtraction, type FleetRow, type TierRow, type RentalRow } from "./matcher";
import type { StructuredRequest } from "@/platform/ai/demand-brain";

const req = (o: Partial<StructuredRequest>): StructuredRequest => ({
  make: null, model: null, dateFrom: null, dateTo: null, budgetAed: null, channel: null, intent: null, ...o,
});

const patrolA: FleetRow = { id: "a", make: "Nissan", model: "Patrol", status: "available", plate: "111 A" };
const patrolB: FleetRow = { id: "b", make: "Nissan", model: "Patrol", status: "available", plate: "222 B" };
const ghost: FleetRow = { id: "g", make: "Rolls Royce", model: "Ghost", status: "available", plate: "333 G" };

const tiers: TierRow[] = [
  { vehicleId: "a", channel: "b2c", minDays: 1, maxDays: 3, dailyRate: 380, deposit: 2500, cardoo: 7500 },
  { vehicleId: "a", channel: "b2c", minDays: 7, maxDays: 14, dailyRate: 300, deposit: 2500, cardoo: 7500 },
  { vehicleId: "b", channel: "b2c", minDays: 1, maxDays: 3, dailyRate: 350, deposit: 2500, cardoo: 7500 },
  { vehicleId: "a", channel: "b2b", minDays: 1, maxDays: 3, dailyRate: 325, deposit: 2500, cardoo: 7500 },
];

describe("requestedDays", () => {
  it("counts the window, defaults to 3 with no dates", () => {
    expect(requestedDays(req({ dateFrom: "2026-08-01", dateTo: "2026-08-08" }))).toBe(7);
    expect(requestedDays(req({}))).toBe(3);
  });
});

describe("pickTier", () => {
  it("selects the bracket covering the day count", () => {
    expect(pickTier(tiers, "a", "b2c", 10)?.dailyRate).toBe(300);
    expect(pickTier(tiers, "a", "b2c", 2)?.dailyRate).toBe(380);
  });
  it("falls back to the nearest bracket rather than quoting nothing", () => {
    // 5 days, no 4-6 tier here: nearest minDays is 7 (dist 2) over 1 (dist 4) → 300.
    // Real sheets carry all four brackets, so this fallback rarely fires.
    expect(pickTier(tiers, "a", "b2c", 5)?.dailyRate).toBe(300);
  });
});

describe("structureFromExtraction", () => {
  it("splits car text into make/model and strips the year", () => {
    const r = structureFromExtraction({ carText: "Nissan Patrol 2024", priceAed: null, dateFrom: null, dateTo: null, intent: "rent" });
    expect(r.make).toBe("Nissan");
    expect(r.model).toBe("Patrol");
    expect(r.intent).toBe("rent");
  });
  it("passes budget through and dates as ISO", () => {
    const r = structureFromExtraction({ carText: "BMW 430i", priceAed: 3500, dateFrom: new Date("2026-08-13T00:00:00Z"), dateTo: "2026-08-15", intent: null });
    expect(r.budgetAed).toBe(3500);
    expect(r.dateFrom).toBe("2026-08-13");
    expect(r.dateTo).toBe("2026-08-15");
  });
  it("marks B2B when the sender is a rental company", () => {
    expect(structureFromExtraction({ carText: "Patrol", priceAed: null, dateFrom: null, dateTo: null, intent: null, name: "OX4 CAR RENTAL" }).channel).toBe("b2b");
    expect(structureFromExtraction({ carText: "Patrol", priceAed: null, dateFrom: null, dateTo: null, intent: null, name: "Ahmed" }).channel).toBe("b2c");
  });
});

describe("matchDemand", () => {
  it("have_free: picks the cheapest matching car and its tiered price", () => {
    const r = matchDemand(req({ make: "Nissan", model: "Patrol", dateFrom: "2026-08-01", dateTo: "2026-08-04" }), [patrolA, patrolB], tiers, []);
    expect(r.kind).toBe("have_free");
    if (r.kind === "have_free") {
      expect(r.vehicle.id).toBe("b"); // 350 < 380
      expect(r.dailyRate).toBe(350);
      expect(r.deposit).toBe(2500);
    }
  });

  it("uses the b2b rate when the asker is a rental company", () => {
    const r = matchDemand(req({ make: "Nissan", model: "Patrol", channel: "b2b", dateFrom: "2026-08-01", dateTo: "2026-08-03" }), [patrolA], tiers, []);
    expect(r.kind === "have_free" && r.dailyRate).toBe(325);
  });

  it("have_busy: all matches occupied for the window → soonest return", () => {
    const rentals: RentalRow[] = [
      { vehicleId: "a", startDate: "2026-08-01", returnDate: "2026-08-10", status: "active" },
      { vehicleId: "b", startDate: "2026-08-02", returnDate: "2026-08-05", status: "active" },
    ];
    const r = matchDemand(req({ make: "Nissan", model: "Patrol", dateFrom: "2026-08-03", dateTo: "2026-08-04" }), [patrolA, patrolB], tiers, rentals);
    expect(r.kind).toBe("have_busy");
    if (r.kind === "have_busy") expect(r.nextFreeDate?.toISOString().slice(0, 10)).toBe("2026-08-05");
  });

  it("a non-overlapping rental does not block the window", () => {
    const rentals: RentalRow[] = [{ vehicleId: "a", startDate: "2026-07-01", returnDate: "2026-07-05", status: "active" }];
    const r = matchDemand(req({ make: "Nissan", model: "Patrol", dateFrom: "2026-08-01", dateTo: "2026-08-03" }), [patrolA], tiers, rentals);
    expect(r.kind).toBe("have_free");
  });

  it("gap: car not in the fleet", () => {
    const r = matchDemand(req({ make: "Ferrari", model: "SF90", budgetAed: 5000 }), [patrolA, ghost], tiers, []);
    expect(r.kind).toBe("gap");
    if (r.kind === "gap") expect(r.budgetAed).toBe(5000);
  });

  it("in_service cars are never offered as free", () => {
    const r = matchDemand(req({ make: "Rolls Royce", model: "Ghost", dateFrom: "2026-08-01", dateTo: "2026-08-03" }), [{ ...ghost, status: "in_service" }], tiers, []);
    expect(r.kind).toBe("have_busy"); // matched but not free → busy (no free, no gap)
  });
});

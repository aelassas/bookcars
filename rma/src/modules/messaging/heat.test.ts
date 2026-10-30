import { describe, expect, it } from "vitest";
import { computeHeat, workMinutesBetween } from "./heat";

describe("computeHeat", () => {
  it("burst of inbound = hot", () => {
    expect(computeHeat({ inbound2h: 3, carNamed: false, priceNamed: false, waitingMin: 0 })).toBe("hot");
  });
  it("unanswered >= 120 work-min = hot", () => {
    expect(computeHeat({ inbound2h: 1, carNamed: false, priceNamed: false, waitingMin: 120 })).toBe("hot");
  });
  it("car or price named = warm", () => {
    expect(computeHeat({ inbound2h: 1, carNamed: true, priceNamed: false, waitingMin: 0 })).toBe("warm");
    expect(computeHeat({ inbound2h: 0, carNamed: false, priceNamed: true, waitingMin: null })).toBe("warm");
  });
  it("otherwise normal", () => {
    expect(computeHeat({ inbound2h: 1, carNamed: false, priceNamed: false, waitingMin: 30 })).toBe("normal");
  });
});

describe("workMinutesBetween (Dubai 09:00-21:00, UTC+4)", () => {
  // 08:00 Dubai = 04:00 UTC. Window entirely inside one workday:
  it("counts only in-window minutes", () => {
    const from = new Date("2026-07-22T06:00:00Z"); // 10:00 Dubai
    const to   = new Date("2026-07-22T08:00:00Z"); // 12:00 Dubai
    expect(workMinutesBetween(from, to)).toBe(120);
  });
  it("clock pauses overnight", () => {
    const from = new Date("2026-07-22T16:30:00Z"); // 20:30 Dubai
    const to   = new Date("2026-07-23T05:30:00Z"); // next day 09:30 Dubai
    expect(workMinutesBetween(from, to)).toBe(60); // 30 evening + 30 morning
  });
  it("zero for fully off-hours span", () => {
    const from = new Date("2026-07-22T18:00:00Z"); // 22:00 Dubai
    const to   = new Date("2026-07-23T04:00:00Z"); // 08:00 Dubai
    expect(workMinutesBetween(from, to)).toBe(0);
  });
});

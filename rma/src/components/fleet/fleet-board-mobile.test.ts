import { describe, expect, it } from "vitest";
import { currentEvent, eventOnDay, groupUpcomingEvents, nextDays } from "./fleet-board-mobile";

const event = (id: string, startYmd: string, endYmd: string, status = "reserved") => ({
  id,
  resource: "car-1",
  tags: { startYmd, endYmd, status },
});

describe("fleet board mobile list", () => {
  it("builds a 14-day strip across month boundaries", () => {
    const days = nextDays("2026-11-28");
    expect(days).toHaveLength(14);
    expect(days[0]).toBe("2026-11-28");
    expect(days.at(-1)).toBe("2026-12-11");
  });

  it("keeps overdue and upcoming bookings, drops closed history, and sorts by start", () => {
    const later = event("later", "2026-11-25", "2026-11-27");
    const overdue = event("overdue", "2026-11-10", "2026-11-15", "overdue");
    const closed = event("closed", "2026-11-10", "2026-11-15", "completed");
    const next = event("next", "2026-11-20", "2026-11-22");
    const grouped = groupUpcomingEvents([later, closed, overdue, next], "2026-11-19");
    expect(grouped.get("car-1")?.map((item) => item.id)).toEqual(["overdue", "next", "later"]);
  });

  it("finds the current booking and colours only covered days", () => {
    const booking = event("current", "2026-11-18", "2026-11-21", "active");
    expect(currentEvent([booking], "2026-11-19")?.id).toBe("current");
    expect(eventOnDay([booking], "2026-11-20")?.id).toBe("current");
    expect(eventOnDay([booking], "2026-11-22")).toBeUndefined();
  });
});

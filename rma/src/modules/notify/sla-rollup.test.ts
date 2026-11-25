import { describe, it, expect } from "vitest";
import { formatSlaByOwner, type SlaRollupCard } from "./sla-rollup";

// A manager's digest answers a different question than an escalation nudge.
// The nudge asks one person "your card is late". The roll-up asks the manager
// "who on my team is behind, and by how much" — so it must be grouped by
// PERSON, ordered worst-first, and never silently truncated.
const NOW = new Date("2026-08-05T12:00:00Z").getTime();
const card = (assignedTo: string | null, hoursLate: number, line = "babek-rent-2"): SlaRollupCard => ({
  assignedTo,
  sourceLine: line,
  slaDueAt: new Date(NOW - hoursLate * 3600_000).toISOString(),
});

describe("formatSlaByOwner", () => {
  it("says nothing at all when nobody is breaching", () => {
    // A digest that prints "SLA: 0" every morning trains the reader to skip it.
    expect(formatSlaByOwner([], NOW)).toEqual([]);
  });

  it("groups by person and puts the worst offender first", () => {
    const out = formatSlaByOwner(
      [card("ali", 1), card("babek", 9), card("ali", 3), card("babek", 2), card("babek", 1)],
      NOW,
    ).map((l) => l.toLowerCase());
    expect(out[0]).toContain("sla");
    // Rendered with the human label from BRAND_OWNERS ("Babek (EasyRent)"),
    // not the raw owner key — a manager reads names, not keys.
    // babek: 3 cards, worst 9h — ahead of ali's 2 cards / worst 3h.
    expect(out[1]).toContain("babek");
    expect(out[1]).toContain("3 late");
    expect(out[2]).toContain("ali");
    expect(out.findIndex((l) => l.includes("babek"))).toBeLessThan(
      out.findIndex((l) => l.includes("ali")),
    );
  });

  it("reports the worst overdue age per person, not the average", () => {
    // An average hides the one card that has been rotting for two days.
    const out = formatSlaByOwner([card("ali", 48), card("ali", 1)], NOW).join("\n");
    expect(out).toMatch(/2d|48h/);
  });

  it("names unassigned cards instead of dropping them", () => {
    // A breached card with no owner is the worst kind — nobody is coming.
    const out = formatSlaByOwner([card(null, 5)], NOW).join("\n");
    expect(out.toLowerCase()).toContain("unassigned");
  });

  it("caps the list but SAYS it capped, never truncating in silence", () => {
    const many = Array.from({ length: 12 }, (_, i) => card(`person-${i}`, i + 1));
    const out = formatSlaByOwner(many, NOW, 5);
    expect(out.length).toBeLessThanOrEqual(7); // header + 5 + overflow note
    expect(out[out.length - 1]).toMatch(/\+7|7 more|ещё 7/);
  });
});

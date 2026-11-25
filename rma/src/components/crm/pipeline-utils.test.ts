import { describe, expect, it } from "vitest";
import { cardAttention, initials, rentalWindow, STALE_DAYS } from "./pipeline-utils";

const NOW = new Date("2026-11-06T12:00:00Z").getTime();

describe("cardAttention", () => {
  it("marks open inquiries as waiting for their first reply", () => {
    expect(cardAttention({ stage: "inquiry", status: "open", lastActivityAt: new Date() }, NOW)).toBe("new");
    expect(cardAttention({ stage: "inquiry", status: "won", lastActivityAt: new Date() }, NOW)).toBeNull();
  });

  it("marks later stages stale only after the activity threshold", () => {
    const recent = new Date(NOW - (STALE_DAYS - 1) * 86_400_000).toISOString();
    const old = new Date(NOW - STALE_DAYS * 86_400_000).toISOString();
    expect(cardAttention({ stage: "quote", status: "open", lastActivityAt: recent }, NOW)).toBeNull();
    expect(cardAttention({ stage: "quote", status: "open", lastActivityAt: old }, NOW)).toBe("stale");
    expect(cardAttention({ stage: "quote", status: "open", lastActivityAt: null }, NOW)).toBe("stale");
  });
});

describe("card formatting", () => {
  it("formats partial and complete rental windows", () => {
    expect(rentalWindow("2026-12-01", "2026-12-08")).toBe("Dec 1 – Dec 8");
    expect(rentalWindow("2026-12-01", null)).toBe("From Dec 1");
    expect(rentalWindow(null, null)).toBeNull();
  });

  it("keeps owner initials compact", () => {
    expect(initials("Azat Petrosyan")).toBe("AP");
    expect(initials("Azat")).toBe("A");
    expect(initials(null)).toBe("—");
  });
});

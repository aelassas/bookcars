import { describe, expect, it } from "vitest";
import { normalizeDigits, phoneKey } from "./phone";

describe("normalizeDigits", () => {
  it("strips everything but digits", () => {
    expect(normalizeDigits("+971 50-123 4567")).toBe("971501234567");
    expect(normalizeDigits("971501234567@s.whatsapp.net")).toBe("971501234567");
  });
});

describe("phoneKey", () => {
  it("keys on the last 9 digits across UAE formats", () => {
    // Same subscriber, four real-world spellings → one key
    const key = "501234567";
    expect(phoneKey("+971 50 123 4567")).toBe(key);
    expect(phoneKey("971501234567")).toBe(key);
    expect(phoneKey("0501234567")).toBe(key);
    expect(phoneKey("971501234567@s.whatsapp.net")).toBe(key);
  });
  it("keeps non-UAE numbers distinct by their own tail", () => {
    expect(phoneKey("966533929209")).toBe("533929209");
  });
  it("rejects group JIDs, empties and short strings", () => {
    expect(phoneKey("120363159@g.us")).toBeNull();
    expect(phoneKey("")).toBeNull();
    expect(phoneKey(null)).toBeNull();
    expect(phoneKey(undefined)).toBeNull();
    expect(phoneKey("12345")).toBeNull(); // 5 digits — not a subscriber number
  });
  it("pads 8-digit landline tails as their own key (no crash)", () => {
    expect(phoneKey("97147035636")).toBe("147035636"); // 11 digits → last 9
  });
});

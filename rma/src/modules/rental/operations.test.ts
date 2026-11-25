import { describe, expect, it } from "vitest";
import { buildReturnReminder, classifyExtensionReply, rentalIsLongTerm, returnReminderIsDue } from "./operations";

describe("return and extension operations", () => {
  const now = new Date("2026-11-18T12:00:00Z");
  it("sends once inside the 48-hour window", () => {
    expect(returnReminderIsDue(new Date("2026-11-20T11:00:00Z"), null, now)).toBe(true);
    expect(returnReminderIsDue(new Date("2026-11-21T12:01:00Z"), null, now)).toBe(false);
    expect(returnReminderIsDue(new Date("2026-11-19T12:00:00Z"), now, now)).toBe(false);
  });

  it("recognizes extension and return replies in customer languages", () => {
    expect(classifyExtensionReply("Хочу продлить ещё на день")).toBe("wants_extension");
    expect(classifyExtensionReply("Can I extend until Sunday?")).toBe("wants_extension");
    expect(classifyExtensionReply("Верну машину завтра")).toBe("returning");
    expect(classifyExtensionReply("Thank you")).toBeNull();
  });

  it("includes return time and a manager-confirmation question", () => {
    const text = buildReturnReminder({ customerName: "Ruslan", plate: "B 1", returnDate: new Date("2026-11-20T12:00:00Z") });
    expect(text).toContain("2026-11-20 12:00 UTC");
    expect(text).toContain("manager will confirm");
  });

  it("recognizes long-term only while the rental is active", () => {
    expect(rentalIsLongTerm({ status: "active", extensionStatus: "long_term" })).toBe(true);
    expect(rentalIsLongTerm({ status: "completed", extensionStatus: "long_term" })).toBe(false);
    expect(rentalIsLongTerm({ status: "active", extensionStatus: "extension_confirmed" })).toBe(false);
  });
});

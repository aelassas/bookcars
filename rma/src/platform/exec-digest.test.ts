import { describe, expect, it } from "vitest";
import { criticalLines, formatMorning, formatNight, type DigestFacts } from "./exec-digest";

const base: DigestFacts = {
  unanswered: [],
  todayReturns: [],
  overdue: [],
  leaseStages: { NEW_APPLICATION: 3, CONTRACT: 1 },
  rentStages: { ACTIVE_RENT: 7, BOOKED: 2 },
  stageMoves: [],
};

describe("exec-digest formatting", () => {
  it("night watchman is silent when nothing is on fire", () => {
    expect(formatNight(base)).toBeNull();
  });

  it("night watchman pings on unanswered chats and overdue returns", () => {
    const facts: DigestFacts = {
      ...base,
      unanswered: [
        { tenantSlug: "cardiwan", customerName: "Ahmed", thread: "9715@s.whatsapp.net", body: "need a car friday", lastAt: new Date(Date.now() - 3 * 3600 * 1000) },
      ],
      overdue: [
        { tenantSlug: "etm", plate: "K12345", make: "Nissan", model: "Patrol", customerName: "Omar", balanceDue: 1500, returnDate: new Date() },
      ],
    };
    const text = formatNight(facts);
    expect(text).toContain("Без ответа");
    expect(text).toContain("Ahmed");
    expect(text).toContain("Просрочка");
    expect(text).toContain("1500 AED");
    expect(criticalLines(facts)).toHaveLength(2);
  });

  it("morning digest carries stages, returns and the all-clear line", () => {
    const facts: DigestFacts = {
      ...base,
      todayReturns: [
        { tenantSlug: "cardiwan", plate: "A777", make: "Kia", model: "K5", customerName: "Ivan", balanceDue: 0, returnDate: new Date() },
      ],
      stageMoves: [{ dealType: "RENT", toStage: "BOOKED", changedBy: "Babek", changedAt: new Date() }],
    };
    const text = formatMorning(facts, "Резюме от ИИ.");
    expect(text).toContain("Резюме от ИИ.");
    expect(text).toContain("ПРОБЛЕМЫ: нет");
    expect(text).toContain("NEW_APPLICATION: 3");
    expect(text).toContain("ACTIVE_RENT: 7");
    expect(text).toContain("A777 Kia K5");
    expect(text).toContain("RENT → BOOKED (Babek)");
  });

  it("morning digest works without the AI narrative", () => {
    const text = formatMorning(base, null);
    expect(text).toContain("Утренний дайджест");
    expect(text).not.toContain("undefined");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildNoteBody,
  classifyStage,
  decideDedupe,
  matchOwner,
  NOTE_MAX_CHARS,
  phoneTail9,
  SALES_MEMBERS,
} from "./sales-deal-migration";

describe("matchOwner", () => {
  it("maps each live Bitrix owner name to the right member", () => {
    expect(matchOwner("Bayan Homsi")).toBe("bayan");
    expect(matchOwner("Мария Ибрахим")).toBe("maria");
    expect(matchOwner("Mohammad Imad")).toBe("moe");
    expect(matchOwner("FIRUZ KHUSAINOV")).toBe("firuz");
    expect(matchOwner("Azat")).toBe("azat");
  });

  it("returns null for staff with no Twenty member — never guesses", () => {
    expect(matchOwner("Бот Аркадий")).toBeNull();
    expect(matchOwner("Дастан Курбанов")).toBeNull();
    expect(matchOwner("")).toBeNull();
    expect(matchOwner(null)).toBeNull();
  });

  it("every member key carries a Twenty workspaceMember uuid", () => {
    for (const m of Object.values(SALES_MEMBERS)) {
      expect(m.twentyId).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});

describe("classifyStage", () => {
  it("maps primary-only stage names to primaryStage values", () => {
    expect(classifyStage("Заявки без ответа")).toEqual({
      pipeline: "primary",
      value: "UNANSWERED",
      ambiguous: false,
    });
    expect(classifyStage("Повторное касание 1")).toEqual({
      pipeline: "primary",
      value: "REPEATED_TOUCH_1",
      ambiguous: false,
    });
    expect(classifyStage("Повторное касание 2")).toEqual({
      pipeline: "primary",
      value: "RE_TOUCH_2",
      ambiguous: false,
    });
  });

  it("maps sales-only stage names to salesStage values", () => {
    expect(classifyStage("КП отправлено")).toEqual({ pipeline: "sales", value: "CP_SENT", ambiguous: false });
    expect(classifyStage("Прогрев КП")).toEqual({ pipeline: "sales", value: "GEARBOX_WARM_UP", ambiguous: false });
    expect(classifyStage("Встреча назначена")).toEqual({ pipeline: "sales", value: "MEETING_SCHEDULED", ambiguous: false });
    expect(classifyStage("Встреча проведена")).toEqual({ pipeline: "sales", value: "MEETING_HELD", ambiguous: false });
    expect(classifyStage("Отправил на СБ")).toEqual({ pipeline: "sales", value: "SENT_TO_SB", ambiguous: false });
    expect(classifyStage("Одобрено СБ")).toEqual({ pipeline: "sales", value: "APPROVED", ambiguous: false });
  });

  it("settles ambiguous names by category id when known", () => {
    expect(classifyStage("Новая заявка", { categoryId: "0" })).toEqual({
      pipeline: "primary",
      value: "NEW_APPLICATION",
      ambiguous: false,
    });
    expect(classifyStage("Новая заявка", { categoryId: 6 })).toEqual({
      pipeline: "sales",
      value: "IDENTIFYING_THE_NEED",
      ambiguous: false,
    });
    expect(classifyStage("Выявление потребности", { categoryId: "6" })).toEqual({
      pipeline: "sales",
      value: "IDENTIFYING_THE_NEED",
      ambiguous: false,
    });
    expect(classifyStage("Выявление потребности", { categoryId: "0" })).toEqual({
      pipeline: "primary",
      value: "IDENTIFYING_THE_NEED",
      ambiguous: false,
    });
  });

  it("falls back to the owner's team for ambiguous names and says so", () => {
    expect(classifyStage("Выявление потребности", { ownerTeam: "sales" })).toEqual({
      pipeline: "sales",
      value: "IDENTIFYING_THE_NEED",
      ambiguous: true,
    });
    expect(classifyStage("Выявление потребности", { ownerTeam: "primary" })).toEqual({
      pipeline: "primary",
      value: "IDENTIFYING_THE_NEED",
      ambiguous: true,
    });
    // Unknown owner → primary (top of funnel), still flagged.
    expect(classifyStage("Новая заявка", { ownerTeam: null })).toEqual({
      pipeline: "primary",
      value: "NEW_APPLICATION",
      ambiguous: true,
    });
  });

  it("returns null for stages outside both pipelines", () => {
    expect(classifyStage("Подбор")).toBeNull();
    expect(classifyStage("Сделка успешна")).toBeNull();
    expect(classifyStage("")).toBeNull();
    expect(classifyStage(null)).toBeNull();
  });
});

describe("phoneTail9", () => {
  it("takes the last 9 digits through any formatting", () => {
    expect(phoneTail9("+971 50 664 3058")).toBe("506643058");
    expect(phoneTail9("971585875611")).toBe("585875611");
    expect(phoneTail9("0506643058")).toBe("506643058");
  });

  it("returns null when there aren't 9 digits", () => {
    expect(phoneTail9("12345")).toBeNull();
    expect(phoneTail9(null)).toBeNull();
    expect(phoneTail9(undefined)).toBeNull();
  });
});

describe("decideDedupe", () => {
  const byExternalId = new Set(["bitrix-deal:100"]);
  const byTail9 = new Map([
    ["506643058", [{ externalSource: "whatsapp", stage: "NEW" }]],
    ["585875611", [{ externalSource: "whatsapp", stage: "CUSTOMER" }]],
    ["111222333", [{ externalSource: "bitrix24", stage: "NEW" }]],
    ["444555666", [{ externalSource: null, stage: "NEW" }]],
  ]);

  it("skips a deal whose externalId already exists (idempotent re-run)", () => {
    expect(decideDedupe({ externalId: "bitrix-deal:100", tail9: null }, { byExternalId, byTail9 })).toBe(
      "already-imported"
    );
  });

  it("skips a deal whose phone has an OPEN live-relay card", () => {
    expect(decideDedupe({ externalId: "bitrix-deal:200", tail9: "506643058" }, { byExternalId, byTail9 })).toBe(
      "live-card"
    );
  });

  it("creates when the matching live card is CLOSED (CUSTOMER/LOST)", () => {
    expect(decideDedupe({ externalId: "bitrix-deal:201", tail9: "585875611" }, { byExternalId, byTail9 })).toBe(
      "create"
    );
  });

  it("ignores bitrix24-source cards for the live-card rule (husks never block)", () => {
    expect(decideDedupe({ externalId: "bitrix-deal:202", tail9: "111222333" }, { byExternalId, byTail9 })).toBe(
      "create"
    );
  });

  it("does not treat source-less manual cards as live relay cards", () => {
    expect(decideDedupe({ externalId: "bitrix-deal:203", tail9: "444555666" }, { byExternalId, byTail9 })).toBe(
      "create"
    );
  });

  it("creates when nothing matches", () => {
    expect(decideDedupe({ externalId: "bitrix-deal:204", tail9: "999888777" }, { byExternalId, byTail9 })).toBe(
      "create"
    );
    expect(decideDedupe({ externalId: "bitrix-deal:205", tail9: null }, { byExternalId, byTail9 })).toBe("create");
  });
});

describe("buildNoteBody", () => {
  it("returns null for empty/whitespace comments", () => {
    expect(buildNoteBody(null)).toBeNull();
    expect(buildNoteBody("")).toBeNull();
    expect(buildNoteBody("   \n  ")).toBeNull();
  });

  it("keeps real comments verbatim", () => {
    expect(buildNoteBody("  wants a C63 for Friday ")).toBe("wants a C63 for Friday");
  });

  it("truncates past the cap with an ellipsis marker", () => {
    const body = buildNoteBody("x".repeat(NOTE_MAX_CHARS + 500));
    expect(body).toHaveLength(NOTE_MAX_CHARS + 1);
    expect(body?.endsWith("…")).toBe(true);
  });
});

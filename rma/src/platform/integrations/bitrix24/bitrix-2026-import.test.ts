import { describe, expect, it } from "vitest";
import {
  buildImportNoteBody,
  buildOpportunityBody,
  cardName,
  classifyDealStage,
  classifyLeadStage,
  dealExternalId,
  IMPORT_NOTE_MAX_CHARS,
  leadExternalId,
  resolveOwner,
} from "./bitrix-2026-import";
import { SALES_MEMBERS } from "./sales-deal-migration";

describe("classifyDealStage", () => {
  it("maps primary-only names (RU + EN) to primaryStage values", () => {
    expect(classifyDealStage("New")).toMatchObject({ kind: "primary", value: "NEW_APPLICATION" });
    expect(classifyDealStage("New Leads")).toMatchObject({ kind: "primary", value: "NEW_APPLICATION" });
    expect(classifyDealStage("Заявки без ответа")).toMatchObject({ kind: "primary", value: "UNANSWERED" });
    expect(classifyDealStage("Not responding")).toMatchObject({ kind: "primary", value: "UNANSWERED" });
    expect(classifyDealStage("Повторное касание 1")).toMatchObject({ kind: "primary", value: "REPEATED_TOUCH_1" });
    expect(classifyDealStage("Second touch")).toMatchObject({ kind: "primary", value: "REPEATED_TOUCH_1" });
    expect(classifyDealStage("Повторное касание 2")).toMatchObject({ kind: "primary", value: "RE_TOUCH_2" });
  });

  it("maps sales-only names to salesStage values", () => {
    expect(classifyDealStage("КП отправлено")).toMatchObject({ kind: "sales", value: "CP_SENT" });
    expect(classifyDealStage("Прогрев КП")).toMatchObject({ kind: "sales", value: "GEARBOX_WARM_UP" });
    expect(classifyDealStage("Встреча назначена")).toMatchObject({ kind: "sales", value: "MEETING_SCHEDULED" });
    expect(classifyDealStage("Встреча проведена")).toMatchObject({ kind: "sales", value: "MEETING_HELD" });
    expect(classifyDealStage("Отправил на СБ")).toMatchObject({ kind: "sales", value: "SENT_TO_SB" });
    expect(classifyDealStage("Одобрено СБ")).toMatchObject({ kind: "sales", value: "APPROVED" });
  });

  it("resolves dual-pipeline names by owner team and flags them ambiguous", () => {
    expect(classifyDealStage("Выявление потребности", { ownerTeam: "sales" })).toEqual({
      kind: "sales",
      value: "IDENTIFYING_THE_NEED",
      lossReason: null,
      ambiguous: true,
    });
    expect(classifyDealStage("Выявление потребности", { ownerTeam: "primary" })).toEqual({
      kind: "primary",
      value: "IDENTIFYING_THE_NEED",
      lossReason: null,
      ambiguous: true,
    });
    expect(classifyDealStage("In Progress", { ownerTeam: null })).toMatchObject({
      kind: "primary",
      value: "IDENTIFYING_THE_NEED",
      ambiguous: true,
    });
    expect(classifyDealStage("Новая заявка", { ownerTeam: "sales" })).toMatchObject({ kind: "sales" });
  });

  it("maps dead-end buckets to LOST with a lossReason", () => {
    expect(classifyDealStage("SPAM")).toMatchObject({ kind: "lost", lossReason: "NOT_TARGET" });
    expect(classifyDealStage("Rejection by security")).toMatchObject({ kind: "lost", lossReason: "SECURITY_QUERY" });
    expect(classifyDealStage("Некорректный номер")).toMatchObject({ kind: "lost", lossReason: "WRONG_NUMBER" });
    expect(classifyDealStage("Double")).toMatchObject({ kind: "lost", lossReason: "DUPLICATE" });
  });

  it("returns null only for names nobody mapped (empty included)", () => {
    expect(classifyDealStage("")).toBeNull();
    expect(classifyDealStage(null)).toBeNull();
    expect(classifyDealStage("Качественный лид")).toBeNull(); // lead-table status
  });

  it("keeps rental-brand deal stages visible instead of dropping them", () => {
    expect(classifyDealStage("Rent in progress")).toMatchObject({
      kind: "primary",
      value: "IDENTIFYING_THE_NEED",
    });
  });
});

describe("classifyLeadStage", () => {
  it("maps the whole observed lead-status set", () => {
    const observed = [
      "Качественный лид", "Established Contact", "Not Quality Leads", "", "First Contact",
      "Rent Cars & Colleagues", "🎯 Leasing opportunity!", "🚗 Economy client!",
      "Need Second Touch", "Booked the Car", "Riding the Car", "New Leads", "Hot lead",
    ];
    for (const s of observed) expect(classifyLeadStage(s), `stage "${s}"`).not.toBeNull();
  });

  it("sends junk to LOST and keeps active renters visible", () => {
    expect(classifyLeadStage("Not Quality Leads")).toMatchObject({ kind: "lost", lossReason: "NOT_TARGET" });
    expect(classifyLeadStage("Booked the Car")).toMatchObject({ kind: "primary", value: "IDENTIFYING_THE_NEED" });
    expect(classifyLeadStage("Качественный лид")).toMatchObject({ kind: "primary", value: "IDENTIFYING_THE_NEED" });
    expect(classifyLeadStage("Need Second Touch")).toMatchObject({ kind: "primary", value: "REPEATED_TOUCH_1" });
    expect(classifyLeadStage("")).toMatchObject({ kind: "primary", value: "NEW_APPLICATION" });
  });
});

describe("resolveOwner", () => {
  it("a matched Bitrix owner always wins", () => {
    const { resolution, nextCursor } = resolveOwner("Мария Ибрахим", "primary", 0);
    expect(resolution).toEqual({ memberKey: "maria", twentyId: SALES_MEMBERS.maria.twentyId, via: "bitrix-owner" });
    expect(nextCursor).toBe(0);
  });

  it("unmatched primary cards round-robin over the primary pool", () => {
    const a = resolveOwner("Бот Аркадий", "primary", 0);
    const b = resolveOwner("Бот Аркадий", "primary", a.nextCursor);
    expect(a.resolution.memberKey).toBe("bayan");
    expect(b.resolution.memberKey).toBe("maria");
    expect(b.nextCursor).toBe(2);
  });

  it("unmatched sales/lost cards go to the team lead", () => {
    expect(resolveOwner("Бот Аркадий", "sales", 0).resolution.memberKey).toBe("moe");
    expect(resolveOwner(null, "lost", 0).resolution.memberKey).toBe("moe");
  });
});

describe("cardName", () => {
  it("prefers the deal title, then customer name, then phone tail, then id", () => {
    expect(cardName({ title: "Karan walia - Instagram OLD", externalId: "bitrix-deal:1" })).toBe("Karan walia - Instagram OLD");
    expect(cardName({ customerName: "Hoor", externalId: "bitrix-lead:1" })).toBe("Hoor");
    expect(cardName({ phone: "+971 56-134-4384", externalId: "bitrix-lead:1" })).toBe("+…561344384");
    expect(cardName({ externalId: "bitrix-lead:1" })).toBe("bitrix-lead:1");
  });
});

describe("buildOpportunityBody", () => {
  it("primary card: NEW + primaryStage, never salesStage", () => {
    const body = buildOpportunityBody({
      name: "Hoor",
      externalId: leadExternalId("108734"),
      classification: { kind: "primary", value: "NEW_APPLICATION", lossReason: null, ambiguous: false },
      ownerId: SALES_MEMBERS.bayan.twentyId,
      stageDetail: "New Leads",
      phoneTail9: "561344384",
    });
    expect(body).toMatchObject({
      name: "Hoor",
      stage: "NEW",
      primaryStage: "NEW_APPLICATION",
      externalId: "bitrix-lead:108734",
      externalSource: "bitrix24",
      ownerId: SALES_MEMBERS.bayan.twentyId,
      stageDetail: "New Leads",
      phoneTail9: "561344384",
    });
    expect(body).not.toHaveProperty("salesStage");
    expect(body).not.toHaveProperty("lossReason");
    expect(body).not.toHaveProperty("leadNumber");
  });

  it("lost card: LOST + lossReason, no pipeline stage", () => {
    const body = buildOpportunityBody({
      name: "X",
      externalId: dealExternalId("1"),
      classification: { kind: "lost", value: null, lossReason: "NOT_TARGET", ambiguous: false },
      ownerId: SALES_MEMBERS.moe.twentyId,
      stageDetail: "SPAM",
      phoneTail9: null,
    });
    expect(body).toMatchObject({ stage: "LOST", lossReason: "NOT_TARGET" });
    expect(body).not.toHaveProperty("primaryStage");
    expect(body).not.toHaveProperty("salesStage");
  });

  it("carries amount and carModels only when present", () => {
    const body = buildOpportunityBody({
      name: "D",
      externalId: dealExternalId("2"),
      classification: { kind: "sales", value: "CP_SENT", lossReason: null, ambiguous: false },
      ownerId: SALES_MEMBERS.moe.twentyId,
      stageDetail: null,
      phoneTail9: null,
      valueAed: 12000,
      carModels: "Jetour T2",
    });
    expect(body).toMatchObject({ salesStage: "CP_SENT", amount: { amountMicros: 12000_000_000, currencyCode: "AED" }, carModels: "Jetour T2" });
    expect(body).not.toHaveProperty("stageDetail");
  });
});

describe("buildImportNoteBody", () => {
  it("assembles labeled sections and skips empty ones", () => {
    expect(
      buildImportNoteBody([
        ["Bitrix comments", "called twice"],
        ["Description", ""],
        ["Tenant", "easyrent"],
      ])
    ).toBe("Bitrix comments:\ncalled twice\n\nTenant:\neasyrent");
  });

  it("returns null when nothing carries text", () => {
    expect(buildImportNoteBody([["Notes", null], ["Source", "  "]])).toBeNull();
  });

  it("truncates past the cap", () => {
    const body = buildImportNoteBody([["Notes", "x".repeat(IMPORT_NOTE_MAX_CHARS + 100)]])!;
    expect(body.length).toBe(IMPORT_NOTE_MAX_CHARS + 1);
    expect(body.endsWith("…")).toBe(true);
  });
});

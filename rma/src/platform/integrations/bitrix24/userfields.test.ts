import { describe, expect, it } from "vitest";
import {
  createDealUserFieldCatalog,
  enumLabels,
  firstHttpUrl,
  mapBitrixContactToCustomer,
  mapBitrixDealSemanticFields,
  mapBitrixLeadToLead,
  mirrorSemanticEnglishLabel,
  resolveDealUserFields,
  type BitrixUserFieldRow,
} from "./mappings";
import type { Bitrix24Client } from "./client";

// The SALES portal's deal user fields (takeauto-bx24.com, crm.deal.userfield.list
// as decoded live 2026-08 on deal 188502). The ids are PORTAL-SPECIFIC — the
// whole point of resolveDealUserFields is that nothing keys off them.
const SALES_USERFIELDS: BitrixUserFieldRow[] = [
  {
    ID: 101,
    FIELD_NAME: "UF_CRM_1651487785",
    USER_TYPE_ID: "enumeration",
    LIST: [
      { ID: 282, VALUE: "Не отвечает" },
      { ID: 284, VALUE: "Большая стоимость автомобиля" },
      { ID: 286, VALUE: "Нужен автомобиль старше 2021" },
      { ID: 288, VALUE: "Не хватает денег на первый взнос" },
      { ID: 290, VALUE: "Не хватает на ежемесячный платеж" },
      { ID: 292, VALUE: "Отложил покупку на длительное время" },
    ],
  },
  {
    ID: 102,
    FIELD_NAME: "UF_CRM_1651354448",
    USER_TYPE_ID: "enumeration",
    LIST: [
      { ID: 12, VALUE: "Kia" },
      { ID: 14, VALUE: "Kia Cerato" },
      { ID: 16, VALUE: "Kia K5" },
      { ID: 18, VALUE: "Kia Rio" },
      { ID: 20, VALUE: "Прочее…" },
    ],
  },
  {
    ID: 103,
    FIELD_NAME: "UF_CRM_1655918966221",
    USER_TYPE_ID: "enumeration",
    LIST: [
      { ID: 468, VALUE: "Англоязычные" },
      { ID: 470, VALUE: "Русскоязычные" },
      { ID: 566, VALUE: "Арабы" },
    ],
  },
  { ID: 104, FIELD_NAME: "UF_CRM_UNRELATED_TEXT", USER_TYPE_ID: "string", LIST: null },
];

// A rental-style portal: DIFFERENT ids, an equivalent loss-reason field, and
// no language/car fields at all. Hardcoding the sales ids would find nothing
// here (or worse, the wrong field).
const RENTAL_USERFIELDS: BitrixUserFieldRow[] = [
  {
    ID: 201,
    FIELD_NAME: "UF_CRM_1700000001",
    USER_TYPE_ID: "enumeration",
    LIST: [
      { ID: 5, VALUE: "Не отвечает" },
      { ID: 6, VALUE: "Дорого" },
    ],
  },
];

describe("resolveDealUserFields", () => {
  it("finds the loss/language/car fields BY MEANING on the sales portal", () => {
    const r = resolveDealUserFields(SALES_USERFIELDS);
    expect(r.lossReason?.fieldName).toBe("UF_CRM_1651487785");
    expect(r.language?.fieldName).toBe("UF_CRM_1655918966221");
    expect(r.carModels?.fieldName).toBe("UF_CRM_1651354448");
  });

  it("enumerates ALL options, not a hardcoded subset", () => {
    const r = resolveDealUserFields(SALES_USERFIELDS);
    expect(r.lossReason?.list.size).toBe(6);
    expect(r.language?.list.size).toBe(3);
    expect(r.carModels?.list.get("20")).toBe("Прочее…");
  });

  it("resolves a foreign portal's different ids — and skips fields the portal lacks", () => {
    const r = resolveDealUserFields(RENTAL_USERFIELDS);
    expect(r.lossReason?.fieldName).toBe("UF_CRM_1700000001");
    expect(r.lossReason?.list.get("5")).toBe("Не отвечает");
    expect(r.language).toBeNull();
    expect(r.carModels).toBeNull();
  });

  it("returns all nulls when nothing matches", () => {
    const r = resolveDealUserFields([
      { ID: 1, FIELD_NAME: "UF_CRM_X", USER_TYPE_ID: "enumeration", LIST: [{ ID: 1, VALUE: "Something" }] },
    ]);
    expect(r).toEqual({ lossReason: null, language: null, carModels: null });
  });
});

describe("enumLabels", () => {
  const field = resolveDealUserFields(SALES_USERFIELDS).lossReason;

  it("maps a single enumeration id to its label", () => {
    expect(enumLabels(field, "282")).toEqual(["Не отвечает"]);
  });

  it("maps a multi-enumeration array, in order, deduped", () => {
    const cars = resolveDealUserFields(SALES_USERFIELDS).carModels;
    expect(enumLabels(cars, ["14", "16", "14"])).toEqual(["Kia Cerato", "Kia K5"]);
  });

  it("drops unknown ids rather than storing a meaningless number", () => {
    expect(enumLabels(field, "999")).toEqual([]);
    expect(enumLabels(field, ["282", "999"])).toEqual(["Не отвечает"]);
  });

  it("treats null/false/empty as no value", () => {
    expect(enumLabels(field, null)).toEqual([]);
    expect(enumLabels(field, false)).toEqual([]);
    expect(enumLabels(field, "")).toEqual([]);
    expect(enumLabels(null, "282")).toEqual([]);
  });
});

describe("createDealUserFieldCatalog", () => {
  function fakeClient(pages: { result: BitrixUserFieldRow[]; next?: number }[]): {
    client: Bitrix24Client;
    callCount: () => number;
  } {
    let calls = 0;
    const client = {
      call: () => {
        const page = pages[Math.min(calls++, pages.length - 1)];
        return Promise.resolve({ result: page.result, next: page.next });
      },
      callWrite: () => Promise.reject(new Error("read-only test")),
      listAll: async function* () {},
      countRecords: () => Promise.resolve(0),
    } as unknown as Bitrix24Client;
    return { client, callCount: () => calls };
  }

  it("loads userfield.list once and caches the resolution", async () => {
    const { client, callCount } = fakeClient([{ result: SALES_USERFIELDS }]);
    const catalog = createDealUserFieldCatalog(client);
    const first = await catalog.resolution();
    const second = await catalog.resolution();
    expect(first).toBe(second);
    expect(first.lossReason?.fieldName).toBe("UF_CRM_1651487785");
    expect(callCount()).toBe(1);
  });

  it("degrades to all-null when the call fails — the sync skips, never dies", async () => {
    const { client } = fakeClient([]);
    client.call = () => Promise.reject(new Error("portal down"));
    const r = await createDealUserFieldCatalog(client).resolution();
    expect(r).toEqual({ lossReason: null, language: null, carModels: null });
  });
});

describe("mapBitrixDealSemanticFields", () => {
  const uf = resolveDealUserFields(SALES_USERFIELDS);

  // Shaped like sales deal 188502 as decoded live 2026-08.
  const deal188502 = {
    ID: 188502,
    TITLE: "Новый лид",
    COMMENTS: "Клиент заинтересован в лизинге с выкупом. Модели: Mercedes G63 2022, E450…",
    SOURCE_DESCRIPTION: "https://instagram.com/natchswathi",
    UF_CRM_1651487785: "282",
    UF_CRM_1651354448: ["14", "16"],
    UF_CRM_1655918966221: "470",
    IS_RETURN_CUSTOMER: "Y",
    MOVED_TIME: "2026-07-30T12:00:00+04:00",
    MOVED_BY_ID: 12,
  };

  it("recovers every dropped field from a rich deal", () => {
    const s = mapBitrixDealSemanticFields(deal188502, uf);
    expect(s.sourceComments).toContain("Mercedes G63");
    expect(s.sourceDescription).toBe("https://instagram.com/natchswathi");
    expect(s.lossReason).toBe("Не отвечает");
    expect(s.carModels).toBe("Kia Cerato; Kia K5");
    expect(s.languageSegment).toBe("Русскоязычные");
    expect(s.returnCustomer).toBe(true);
    expect(s.sourceMovedAt).toBeInstanceOf(Date);
    expect(s.sourceMovedById).toBe("12");
  });

  it("emits NO keys for an empty deal — absent, never null", () => {
    expect(mapBitrixDealSemanticFields({ ID: 1 }, uf)).toEqual({});
  });

  it("keeps an explicit 'N' return flag (it is information), falls back to IS_REPEATED_APPROACH", () => {
    expect(mapBitrixDealSemanticFields({ ID: 1, IS_RETURN_CUSTOMER: "N" }, uf).returnCustomer).toBe(false);
    expect(mapBitrixDealSemanticFields({ ID: 1, IS_REPEATED_APPROACH: "Y" }, uf).returnCustomer).toBe(true);
  });

  it("skips the UF values cleanly when the portal lacks the fields", () => {
    const empty = resolveDealUserFields([]);
    const s = mapBitrixDealSemanticFields(deal188502, empty);
    expect(s.lossReason).toBeUndefined();
    expect(s.languageSegment).toBeUndefined();
    expect(s.carModels).toBeUndefined();
    // …but the standard (non-UF) fields still land.
    expect(s.sourceComments).toBeDefined();
    expect(s.returnCustomer).toBe(true);
  });

  it("ignores garbage MOVED_TIME and a zero MOVED_BY_ID", () => {
    const s = mapBitrixDealSemanticFields({ ID: 1, MOVED_TIME: "not-a-date", MOVED_BY_ID: 0 }, uf);
    expect(s.sourceMovedAt).toBeUndefined();
    expect(s.sourceMovedById).toBeUndefined();
  });
});

describe("firstHttpUrl", () => {
  it("takes a bare URL", () => {
    expect(firstHttpUrl("https://instagram.com/natchswathi")).toBe("https://instagram.com/natchswathi");
  });

  it("mines the URL out of prose and strips trailing punctuation", () => {
    expect(firstHttpUrl("came from https://instagram.com/natchswathi, via ads")).toBe(
      "https://instagram.com/natchswathi"
    );
  });

  it("returns null when there is no URL", () => {
    expect(firstHttpUrl(null)).toBeNull();
    expect(firstHttpUrl("")).toBeNull();
    expect(firstHttpUrl("no link here")).toBeNull();
  });
});

describe("contact/lead social mappings", () => {
  it("maps the first http(s) WEB value onto customer.socialUrl", () => {
    const mapped = mapBitrixContactToCustomer({
      ID: 42,
      NAME: "Natch",
      WEB: [{ VALUE: "not a url" }, { VALUE: "https://instagram.com/natchswathi" }],
    });
    expect(mapped.socialUrl).toBe("https://instagram.com/natchswathi");
  });

  it("socialUrl is null when WEB is empty or missing", () => {
    expect(mapBitrixContactToCustomer({ ID: 42, WEB: [] }).socialUrl).toBeNull();
    expect(mapBitrixContactToCustomer({ ID: 42 }).socialUrl).toBeNull();
  });

  it("keeps the lead's raw SOURCE_DESCRIPTION (the mirror mines the URL)", () => {
    expect(
      mapBitrixLeadToLead({ ID: 7, SOURCE_DESCRIPTION: "  https://instagram.com/x  " }).sourceDescription,
    ).toBe("https://instagram.com/x");
    expect(mapBitrixLeadToLead({ ID: 7 }).sourceDescription).toBeNull();
  });
});

describe("mirrorSemanticEnglishLabel", () => {
  it("translates known values, keeps unknown ones raw", () => {
    expect(mirrorSemanticEnglishLabel("Не отвечает")).toBe("No answer");
    expect(mirrorSemanticEnglishLabel("Русскоязычные")).toBe("Russian-speaking");
    expect(mirrorSemanticEnglishLabel("Дорого")).toBe("Дорого");
  });
});

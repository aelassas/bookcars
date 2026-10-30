// The report's TTL gate. Why it exists: the Twenty client rate-limits at
// 100 req/min per workspace, so back-to-back report builds sat in the
// limiter's sleep (1.6s cold vs 7.1s warm, measured 2026-08-30) and spent the
// budget the staff's own Twenty UI needs.
import { describe, expect, it } from "vitest";
import { classifyLeadSource, reportCacheIsFresh } from "./rental";

describe("reportCacheIsFresh", () => {
  it("serves a report built a moment ago", () => {
    expect(reportCacheIsFresh(1_000_000, 1_000_000)).toBe(true);
    expect(reportCacheIsFresh(1_000_000, 1_059_999)).toBe(true);
  });

  it("rebuilds once the minute is up", () => {
    expect(reportCacheIsFresh(1_000_000, 1_060_000)).toBe(false);
    expect(reportCacheIsFresh(1_000_000, 2_000_000)).toBe(false);
  });
});

// Lead sources. Ayham (25.08) asked the report to separate Dubizzle and Yango
// from plain WhatsApp/Telegram: "how many leads came from Dubizzle", "Yango
// leads". The origin is recorded on the card's `callSource` — `externalSource`
// only says which PIPE carried it (whatsapp/callgear/telegram), so classifying
// on that alone buried every marketplace lead inside "WhatsApp".
//
// Real values read off the rental workspace on 2026-08-30.
describe("classifyLeadSource", () => {
  it("marketplace enquiries are their own source, not WhatsApp", () => {
    expect(classifyLeadSource("whatsapp", "Dubizzle · CARDIWAN FOR CAR RENTAL CO. L.L.C")).toBe("dubizzle");
    expect(classifyLeadSource("whatsapp", "Dubizzle · E T M CAR RENTAL CO")).toBe("dubizzle");
  });

  it("Yango wins over the Telegram group that carries it", () => {
    expect(classifyLeadSource("telegram", "Telegram: Yango & ETM Car Rental")).toBe("yango");
  });

  it("a plain Telegram thread stays Telegram", () => {
    expect(classifyLeadSource("telegram", "Telegram: Deliveries")).toBe("telegram");
  });

  it("Yandex.Direct is an ad campaign that produced a CALL — not Yango", () => {
    expect(classifyLeadSource("callgear", "easy-rent.ae · Яндекс.Директ [интегрированная]")).toBe("call");
  });

  it("call-centre sources are calls", () => {
    expect(classifyLeadSource("callgear", "Отдел продаж")).toBe("call");
    expect(classifyLeadSource("callgear", "Основной (рабочее время)")).toBe("call");
  });

  it("walk-ins are walk-ins", () => {
    expect(classifyLeadSource("callgear", "Посетители без рекламной кампании")).toBe("walk_in");
  });

  it("direct WhatsApp stays WhatsApp", () => {
    expect(classifyLeadSource("whatsapp", "WhatsApp direct")).toBe("whatsapp");
  });

  it("nothing recorded is honest about it", () => {
    expect(classifyLeadSource(null, null)).toBe("unknown");
  });
});

// Ali's line is routed to the `easyrent` tenant for import-history reasons but
// is Cardiwan (owner, 2026-08-31: "Ali is CARDIWAN, he is not easyrent"). The
// brand table has to follow the line, exactly as it already does for ETM.
import { brandForLineTest } from "./rental";

describe("brandFor — a line can outrank its tenant", () => {
  it("Ali's line counts as CarDiwan, not EasyRent", () => {
    expect(brandForLineTest("babek-rent-2", "easyrent")).toBe("CARDIWAN");
  });

  it("Babek's own lines stay EasyRent", () => {
    expect(brandForLineTest("babek-rent", "easyrent")).toBe("EASYRENT");
    expect(brandForLineTest("babek-rent-3", "easyrent")).toBe("EASYRENT");
  });

  it("ETM's lines still win over the shared easyrent tenant", () => {
    expect(brandForLineTest("mohamed-etm", "easyrent")).toBe("ETM");
  });

  it("leasing lines are still out of scope", () => {
    expect(brandForLineTest("azat-takeauto", "take-auto")).toBeNull();
    expect(brandForLineTest("firuz-takeauto", "take-auto")).toBeNull();
  });
});

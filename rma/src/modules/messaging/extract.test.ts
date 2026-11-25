import { describe, expect, it } from "vitest";
import {
  extractSignals,
  extractCarText,
  extractPrice,
  extractDates,
  extractTermMonths,
  extractIntent,
  extractManager,
  mergeSignals,
  type ExtractedSignals,
} from "./extract";

// Fixed anchor = "today" on the box when these lines came in, so bare
// day+month dates resolve deterministically (future-leaning).
const REF = new Date("2026-07-22T00:00:00Z");
const MANAGERS = ["Azat", "Babek", "Бабек", "Mohammed", "Mansur"];

function sig(text: string): ExtractedSignals {
  return extractSignals(text, { referenceDate: REF, managerNames: MANAGERS });
}

// ─────────────────────────────────────────────────────────────────────────────
// 10 VERBATIM production inbound lines (pulled from the mycrm `message` table,
// last 10 days). These are the contract: the deterministic pass must parse the
// deal-driving facts a salesperson would act on.
// ─────────────────────────────────────────────────────────────────────────────
describe("extractSignals — real production messages", () => {
  it("1. Azat / GT63 purchase with 36-month finance", () => {
    const s = sig(
      "Hi Azat …this is Ahmed here  I am interested to purchase mercedes gt63 value of 650000 Aed 2025 model Could you help me with finance installment option for 36 months.."
    );
    expect(s.carText?.toLowerCase()).toBe("mercedes gt63");
    expect(s.priceAed).toBe(650000);
    expect(s.intent).toBe("sale");
    expect(s.termMonths).toBe(36);
    expect(s.managerMention).toBe("Azat");
    expect(s.language).toBe("en");
  });

  it("2. Lamborghini Aventador rental, explicit window", () => {
    const s = sig("need lamborghini aventador from july 28 to july 31 send photo and price");
    expect(s.carText?.toLowerCase()).toBe("lamborghini aventador");
    expect(s.dateFrom).toBe("2026-07-28");
    expect(s.dateTo).toBe("2026-07-31");
    expect(s.intent).toBe("rent");
    expect(s.language).toBe("en");
  });

  it("3. Aventador SVJ, single date, pics & price", () => {
    const s = sig("Need Aventador SVJ on 24th  Send pics and price");
    expect(s.carText?.toLowerCase()).toBe("aventador svj");
    // "on 24th" has no month → intentionally NOT resolved to a date.
    expect(s.dateFrom).toBeNull();
    expect(s.language).toBe("en");
  });

  it("4. Escalade 2025 from Aug 1st week", () => {
    const s = sig("Required Escalade 2025 from Aug 1st week Price & pics");
    expect(s.carText?.toLowerCase()).toBe("escalade 2025");
    expect(s.dateFrom).toBe("2026-08-01");
    expect(s.intent).toBe("rent");
  });

  it("5. Monthly long-term, multi-car, from a start date", () => {
    const s = sig(
      "Required Monthly long term from 27th July - 2025 and above Defender  Patrol  Tahoe Price & pics"
    );
    expect(s.carText?.toLowerCase()).toBe("defender patrol tahoe");
    expect(s.intent).toBe("lease");
    expect(s.termMonths).toBe(1); // "monthly"
    expect(s.dateFrom).toBe("2026-07-27");
    expect(s.dateTo).toBeNull(); // "- 2025" is a year, not an end-day
  });

  it("6. Escalade, few days, budget-capped", () => {
    const s = sig("Need Escalade for 2,3 days now black  Less Budget 350 to 400");
    expect(s.carText?.toLowerCase()).toBe("escalade");
    expect(s.priceAed).toBe(350); // stated budget anchor
    expect(s.intent).toBe("rent"); // "days"
  });

  it("7. G63 operational note (existing rental)", () => {
    const s = sig("G63 can you add my boss as additional driver");
    expect(s.carText?.toLowerCase()).toBe("g63");
    expect(s.intent).toBeNull(); // not a demand line — no rent/sale/lease signal
  });

  it("8. Follow-up on a BMW", () => {
    const s = sig("Hi I need update on this bmw please");
    expect(s.carText?.toLowerCase()).toBe("bmw");
    expect(s.language).toBe("en");
  });

  it("9. Russian — Gelik availability, addressed to Babek", () => {
    const s = sig(
      "Бабек, приветствую. Ваш Гелик 2024 будет доступен на этой неделе? Спрашивают от 1 до 3 дней примерно"
    );
    expect(s.carText).toBe("Гелик 2024");
    expect(s.language).toBe("ru");
    expect(s.managerMention).toBe("Бабек");
  });

  it("10. Electric car, monthly (lease, no specific model)", () => {
    const s = sig("Need Electric car monthly");
    expect(s.carText).toBeNull(); // no make/model named
    expect(s.intent).toBe("lease");
    expect(s.termMonths).toBe(1);
    expect(s.language).toBe("en");
  });

  // 2026-08-28 audit additions — every case below was a proven MISS on
  // 30k production messages before the dictionary/quote-strip fix.
  it("11. Bare Jetour T2 (the single biggest miss, ×109)", () => {
    const s = sig("Need T2  One mónth  Price and pictures  Dm please");
    expect(s.carText?.toLowerCase()).toBe("t2");
  });
  it("12. Quoted brand name anchors anyway", () => {
    const s = sig(`I'd like to inquire about "Jetour T2" from your website`);
    expect(s.carText?.toLowerCase()).toBe("jetour t2");
  });
  it("13. Arabic-script Jetour", () => {
    const s = sig("مطلوب جيتور T2 اليوم الساعه 5 يكون موجود لون اسود 2026");
    expect(s.carText).toBe("جيتور T2");
  });
  it("14. Volvo + alphanum model", () => {
    const s = sig("[image] Volvo XC90, light grey interior; approx 2021+");
    expect(s.carText?.toLowerCase()).toBe("volvo xc90");
  });
  it("15. Geely Coolray", () => {
    const s = sig("Need Geely coolray today monthly!!!!  Photo and price pls");
    expect(s.carText?.toLowerCase()).toBe("geely coolray");
  });
  it("16. The fleet's own MG5", () => {
    const s = sig("MG5 black available today?");
    expect(s.carText?.toLowerCase()).toBe("mg5 black");
  });
  it("17. Body-style words alone still do NOT anchor", () => {
    expect(extractCarText("Hoping for any convertible")).toBeNull();
    expect(extractCarText("Need a sedan for a week")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Field-level unit coverage
// ─────────────────────────────────────────────────────────────────────────────
describe("extractCarText", () => {
  it("anchors on a make and extends over trim/year", () => {
    expect(extractCarText("mercedes gt63 2025 black")?.toLowerCase()).toBe("mercedes gt63 2025 black");
  });
  it("handles multi-word makes", () => {
    expect(extractCarText("looking for a range rover vogue")?.toLowerCase()).toBe("range rover vogue");
  });
  it("anchors on a bare well-known model", () => {
    expect(extractCarText("do you have a patrol available")?.toLowerCase()).toBe("patrol");
  });
  it("returns null when no car is named", () => {
    expect(extractCarText("hello can you send me the location")).toBeNull();
  });
});

describe("extractPrice", () => {
  it("reads currency-anchored amounts", () => {
    expect(extractPrice("price is 650000 aed")).toBe(650000);
    expect(extractPrice("aed 1500 per day")).toBe(1500);
  });
  it("expands k-suffix", () => {
    expect(extractPrice("budget around 650k")).toBe(650000);
  });
  it("handles thousands separators", () => {
    expect(extractPrice("value of 650 000 dirham")).toBe(650000);
  });
  it("does not mistake a model year for a price", () => {
    expect(extractPrice("looking for a 2024 model")).toBeNull();
  });
});

describe("extractDates", () => {
  it("parses an explicit EN window", () => {
    expect(extractDates("from july 28 to july 31", REF)).toEqual({
      dateFrom: "2026-07-28",
      dateTo: "2026-07-31",
    });
  });
  it("parses a Russian window", () => {
    expect(extractDates("нужна с 5 августа по 9 августа", REF)).toEqual({
      dateFrom: "2026-08-05",
      dateTo: "2026-08-09",
    });
  });
  it("rolls a past bare date into next year", () => {
    // 3 Jan is >6 months before 22 Jul 2026 → 2027.
    expect(extractDates("from jan 3", REF).dateFrom).toBe("2027-01-03");
  });
  it("parses numeric dd.mm", () => {
    expect(extractDates("28.07 - 31.07", REF)).toEqual({
      dateFrom: "2026-07-28",
      dateTo: "2026-07-31",
    });
  });
});

describe("extractTermMonths", () => {
  it("reads explicit months", () => expect(extractTermMonths("for 36 months")).toBe(36));
  it("reads years as months", () => expect(extractTermMonths("1 year lease")).toBe(12));
  it("maps monthly to 1", () => expect(extractTermMonths("monthly rate please")).toBe(1));
  it("reads Russian months", () => expect(extractTermMonths("на 3 месяца")).toBe(3));
  it("is null with no term", () => expect(extractTermMonths("need it tomorrow")).toBeNull());
});

describe("extractIntent", () => {
  const noCtx = { hasDateRange: false, termMonths: null };
  it("detects sale", () => expect(extractIntent("i want to purchase this", noCtx)).toBe("sale"));
  it("detects lease-to-own over sale", () =>
    expect(extractIntent("lease to own the car", noCtx)).toBe("lease_to_own"));
  it("detects lease", () => expect(extractIntent("long term lease", noCtx)).toBe("lease"));
  it("detects rent from a date range", () =>
    expect(extractIntent("send price", { hasDateRange: true, termMonths: null })).toBe("rent"));
  it("is null with no signal", () => expect(extractIntent("thanks so much", noCtx)).toBeNull());
});

describe("extractManager", () => {
  it("matches a known manager name", () =>
    expect(extractManager("thanks Mansur for the help", MANAGERS)).toBe("Mansur"));
  it("matches a greeting name not in the list", () =>
    expect(extractManager("Hi Kevin, is the car ready?", [])).toBe("Kevin"));
  it("ignores greeting non-names", () =>
    expect(extractManager("Hi there, any update?", [])).toBeNull());
});

describe("mergeSignals — LLM fallback seam", () => {
  it("fills only the gaps the deterministic pass left null", () => {
    const base = extractSignals("Need a Cullinan next week", { referenceDate: REF });
    expect(base.priceAed).toBeNull();
    const merged = mergeSignals(base, { priceAed: 12000, intent: "sale" });
    expect(merged.priceAed).toBe(12000); // filled
    expect(merged.intent).toBe("rent"); // deterministic wins, not overwritten
    expect(merged.engine).toBe("merged");
  });
  it("is a no-op when enrichment adds nothing", () => {
    const base = extractSignals("Need a Cullinan from aug 1 to aug 5", { referenceDate: REF });
    const merged = mergeSignals(base, null);
    expect(merged.engine).toBe("deterministic");
  });
});

// Regression: a phone number swallowed by the price regex must NOT become a
// price (12 digits overflowed int32 extracted_price_aed on prod, 2026-07-23).
describe("extractPrice sanity cap", () => {
  it("rejects phone-like 12-digit 'prices'", () => {
    expect(extractPrice("please pay to 971501234567 aed account")).toBeNull();
  });
  it("keeps real big-ticket prices", () => {
    expect(extractPrice("price 3240000 aed")).toBe(3240000);
  });
});

// The desk is in Dubai: customers write Arabic and Russian, not only English.
// Until 2026-08-31 the extractor found intent in neither, so those threads
// produced NO deterministic signal at all and fell through to the model — and
// anything the model's evidence gate rejected was filed as noise.
//
// Ayham, 2026-08-31: "Abdullah leads not in the system still". One of them had
// asked "كم إيجارها لمدة أسبوع من اليوم" (how much to rent it for a week from
// today), agreed, and sent his Emirates ID and driving licence. No card was
// ever created. The one Arabic thread that DID qualify that day did so by
// accident — the English text OCR'd off a driving licence supplied the signal.
//
// Two separate faults: Arabic had no patterns, and the Russian patterns were
// dead on arrival — `\b` is defined over [A-Za-z0-9_], so `\bаренд\b` can never
// match Cyrillic.
describe("extractIntent — Arabic and Russian, the languages this desk receives", () => {
  const intentOf = (t: string) => extractSignals(t).intent;

  it("Arabic rental questions are rent", () => {
    expect(intentOf("كم إيجارها لمدة أسبوع من اليوم")).toBe("rent"); // how much for a week
    expect(intentOf("أريد استئجار سيارة")).toBe("rent");             // I want to rent a car
    expect(intentOf("تأجير سيارة ليوم واحد")).toBe("rent");          // car hire for one day
  });

  it("Russian rental questions are rent", () => {
    expect(intentOf("Сколько стоит аренда на неделю?")).toBe("rent");
    expect(intentOf("нужен прокат авто на 3 дня")).toBe("rent");
  });

  it("Arabic and Russian purchase intent is still sale, not rent", () => {
    expect(intentOf("أريد شراء سيارة")).toBe("sale");   // I want to buy a car
    expect(intentOf("хочу купить машину")).toBe("sale");
  });

  it("English keeps working exactly as before", () => {
    expect(intentOf("How much to rent it for a week from today?")).toBe("rent");
    expect(intentOf("I want to buy this car")).toBe("sale");
    expect(intentOf("Hello")).toBeNull();
  });

  it("small talk in either language is still nothing", () => {
    expect(intentOf("السلام عليكم")).toBeNull();   // greeting
    expect(intentOf("здравствуйте")).toBeNull();
  });
});

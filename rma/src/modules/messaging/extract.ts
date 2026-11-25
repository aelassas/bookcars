// INTELLIGENCE LAYER — deterministic signal extraction from inbound chat.
//
// Owner directive: "Bitrix sums are BS; truth lives in conversations." Every
// inbound WhatsApp/Telegram line is mined for the six facts that actually move
// a deal — what car, at what price, for which dates or term, and whether the
// customer wants to rent, lease, lease-to-own or buy — plus the language and
// any manager named. These land on the `message` row (migration 0050) and roll
// up to the lead/deal as `vouched_*` (see rollUpVouched in ./vouch.ts).
//
// WHY deterministic-first (not the LLM): the local Qwen box is not guaranteed
// to be configured on every deployment, extraction runs on EVERY inbound line
// (19.5k messages, ~9.8k/week — LLM latency/cost per line is untenable), and a
// regex pass is unit-testable against real production lines with zero flake.
// The local model is a *fallback/enrichment* interface (SignalExtractor) that a
// later pass can layer on for the lines the deterministic pass leaves null —
// never the primary path.
//
// The examples in extract.test.ts are verbatim real inbound lines and are the
// contract: they MUST parse.

export type ExtractIntent = "rent" | "lease" | "lease_to_own" | "sale";

export interface ExtractedSignals {
  /** The car the customer named, verbatim-ish (make + model tokens). */
  carText: string | null;
  /** Quoted amount in AED (deal value or the number they anchored on). */
  priceAed: number | null;
  /** Rental window start, ISO yyyy-mm-dd (year resolved against referenceDate). */
  dateFrom: string | null;
  /** Rental window end, ISO yyyy-mm-dd. */
  dateTo: string | null;
  /** Lease/subscription term in whole months (1 = monthly, 12 = a year). */
  termMonths: number | null;
  /** rent | lease | lease_to_own | sale — null when no signal at all. */
  intent: ExtractIntent | null;
  /** Detected language code: 'ar' (Arabic script) | 'ru' (Cyrillic) | 'en'. */
  language: string;
  /** A manager/salesperson first name the customer addressed (e.g. "Azat"). */
  managerMention: string | null;
  /** Which engine produced this result. */
  engine: "deterministic" | "llm" | "merged";
}

export interface ExtractOptions {
  /**
   * Anchor for resolving bare day+month dates to a full year. Rental dates are
   * future-leaning: a resolved date more than 6 months BEFORE this rolls to the
   * next year. Defaults to `new Date()` at call time (kept out of the pure core
   * so tests are deterministic — pass an explicit date).
   */
  referenceDate?: Date;
  /**
   * Known manager/salesperson first names for this tenant (deal owners). A
   * whole-word case-insensitive match counts as a manager mention. The greeting
   * heuristic ("Hi <Name>") catches the rest.
   */
  managerNames?: string[];
}

// ─── Vocabulary ─────────────────────────────────────────────────────────────

// Car makes seen in the TAKE Auto fleet + the UAE luxury-rental long tail.
// Multi-word makes are matched as a prefix before the single-word pass.
const MULTIWORD_MAKES = [
  "mercedes-benz", "mercedes benz", "range rover", "land rover",
  "rolls-royce", "rolls royce", "aston martin", "alfa romeo",
];
const MAKES = new Set([
  "mercedes", "benz", "bmw", "audi", "porsche", "lamborghini", "ferrari",
  "bentley", "maserati", "mclaren", "jaguar", "lexus", "toyota", "nissan",
  "cadillac", "chevrolet", "chevy", "gmc", "ford", "dodge", "jeep", "kia",
  "hyundai", "tesla", "jetour", "exeed", "chery", "mini", "cooper",
  "volkswagen", "vw", "infiniti", "mitsubishi", "honda", "mazda", "genesis",
  "lincoln", "rivian", "lucid", "byd", "rolls", "range", "land", "aston",
  "mercedes-benz",
  // Chinese + volume brands the fleet actually carries / customers ask for
  // (audit 2026-08-28, 30k prod messages): volvo ×46, zeekr ×29, suzuki ×23,
  // jac ×23, polestar ×20, geely ×17, gac ×14, haval ×9, hongqi ×8,
  // changan ×6 — plus MG (the fleet's own MG5) and the tank 300/500 line.
  "mg", "volvo", "suzuki", "jac", "gac", "geely", "zeekr", "polestar",
  "haval", "hongqi", "changan", "omoda", "jaecoo", "tank", "lotus", "hummer",
  "bwm", // the single most common BMW typo in prod messages
  // Arabic-script brand names customers write (same role as the RU slang).
  "جيتور", "مرسيدس", "تويوتا", "نيسان", "لكزس", "لامبورجيني", "بورش",
  "فيراري", "بنتلي", "رولز",
]);
// Well-known models that customers name WITHOUT the make. Each anchors a car
// mention on its own ("need an aventador", "patrol please").
const MODELS = new Set([
  // RU slang the customers actually use for the top sellers.
  "гелик", "гелендваген", "кайен", "кайенн", "урус", "патрол", "прадо",
  "камри", "ренж", "рэндж",
  "aventador", "huracan", "urus", "revuelto", "gallardo", // lambo
  "cullinan", "phantom", "ghost", "wraith", "spectre", "dawn", // rolls
  "patrol", "xterra", "altima", "kicks", // nissan
  "gt63", "g63", "g500", "g550", "gle", "gls", "glc", "gla", "eqs", "amg", // merc
  "urus", "bentayga", "continental", "flying", // bentley
  "911", "cayenne", "panamera", "macan", "taycan", "718", // porsche
  "720s", "570s", "artura", "765lt", // mclaren
  "x5", "x6", "x7", "m4", "m5", "m8", "i7", "i8", "xm", // bmw
  "q7", "q8", "rs6", "rs7", "e-tron", "etron", // audi
  "cybertruck", "roma", "purosangue", "sf90", "296", "812", // ferrari/tesla
  "land cruiser", "prado", "fortuner", "corolla", "camry", "supra", // toyota
  "escalade", "denali", "yukon", "tahoe", "suburban", "camaro", // gm
  "defender", "velar", "evoque", "vogue", "sport", // land/range rover
  "mustang", "explorer", "raptor", "bronco", // ford
  "jetta", "passat", "golf", "touareg", "tiguan", // vw
  "corolla", "rav4", "highlander", "hilux", // toyota (+ land cruiser/prado above)
  "pegas", "sportage", "sorento", "seltos", "carnival", // kia
  "tucson", "santa", "sonata", "elantra", "palisade", // hyundai
  "c300", "c200", "e300", "e200", "s500", "s580", "cla", "cle", "maybach", // merc
  "a3", "a4", "a5", "a6", "a7", "a8", "q3", "q5", // audi
  "x1", "x2", "x3", "x4", // bmw
  "g80", "g70", "g90", "gv70", "gv80", // genesis
  // Models customers name bare, proven in the 2026-08-28 prod audit:
  "t1", "t2", "dashing", "x70", "x90", "traveller", // jetour (T2 ×109 missed!)
  "coolray", "cityray", "monjaro", "emgrand", "atlas", // geely
  "gs4", "gs7", "gs8", // gac
  "j7", // jac
  "xc40", "xc60", "xc90", "s60", "s90", "v50", "v60", // volvo
  "swift", "jimny", "vitara", // suzuki
  "jolion", "h6", "h9", // haval
  "uni-t", "uni-k", "cs75", "cs55", // changan
  "mg5", "mg4", "mg6", "mg7", // mg (fleet's own car)
]);
// Trim / body-style tokens that legitimately extend a car mention even though
// they carry no digit ("aventador svj", "911 gt3 rs", "c300 amg").
const TRIMS = new Set([
  "svj", "svr", "sv", "gt", "gts", "gt3", "rs", "amg", "sport", "sports", "s",
  "evo", "spyder", "coupe", "sedan", "suv", "performante", "competizione",
  "vogue", "autobiography", "brabus", "maybach", "4matic", "xdrive", "quattro",
]);
// Colors that legitimately extend a car mention ("g63 black").
const COLORS = new Set([
  "black", "white", "grey", "gray", "silver", "blue", "red", "green",
  "brown", "gold", "beige", "orange", "yellow", "matte",
]);
// Tokens that end a car-mention capture (they belong to price/date/verb, not
// the car). Includes RU equivalents.
const CAR_STOPWORDS = new Set([
  "from", "to", "for", "price", "aed", "dhs", "dirham", "dirhams", "send",
  "photo", "photos", "pic", "pics", "picture", "and", "the", "value", "of",
  "need", "want", "rent", "rental", "lease", "buy", "purchase", "with",
  "please", "pls", "is", "are", "available", "per", "day", "days", "month",
  "months", "monthly", "weekly", "week", "cost", "how", "much", "much?",
  "at", "on", "in", "a", "an", "model", "model?", "?",
  // RU
  "с", "по", "на", "за", "цена", "дирхам", "дирхамов", "нужен", "нужна",
  "нужно", "хочу", "аренда", "прокат", "фото", "и", "до", "от", "стоимость",
  "сколько", "цену", "пришлите", "интересует",
]);

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * The LLM/local-model enrichment seam. A later pass can implement this against
 * the tenant's LocalProvider (Qwen) to fill fields the deterministic pass left
 * null — it is deliberately allowed to return only partial results, and the
 * deterministic values always win where both are present.
 */
export interface SignalExtractor {
  extractSignals(text: string, opts?: ExtractOptions): Promise<Partial<ExtractedSignals>>;
}

/**
 * Deterministic extraction of the six deal-driving facts from one message.
 * Pure and synchronous — no I/O, no clock unless referenceDate is omitted.
 */
export function extractSignals(text: string, opts: ExtractOptions = {}): ExtractedSignals {
  const raw = (text ?? "").trim();
  const language = detectLanguage(raw);
  const lower = raw.toLowerCase();

  const carText = extractCarText(raw);
  const priceAed = extractPrice(lower);
  const { dateFrom, dateTo } = extractDates(lower, opts.referenceDate ?? new Date());
  const termMonths = extractTermMonths(lower);
  const intent = extractIntent(lower, { hasDateRange: Boolean(dateFrom), termMonths });
  const managerMention = extractManager(raw, opts.managerNames ?? []);

  return {
    carText,
    priceAed,
    dateFrom,
    dateTo,
    termMonths,
    intent,
    language,
    managerMention,
    engine: "deterministic",
  };
}

/**
 * Merge a deterministic result with an optional LLM/local enrichment. The
 * deterministic (grounded, testable) value wins wherever it is non-null; the
 * LLM only fills gaps. Marks engine "merged" when it contributed anything.
 */
export function mergeSignals(
  base: ExtractedSignals,
  enrich: Partial<ExtractedSignals> | null | undefined
): ExtractedSignals {
  if (!enrich) return base;
  const out: ExtractedSignals = { ...base };
  let touched = false;
  for (const k of ["carText", "priceAed", "dateFrom", "dateTo", "termMonths", "intent"] as const) {
    if (out[k] == null && enrich[k] != null) {
      // @ts-expect-error homogeneous key copy
      out[k] = enrich[k];
      touched = true;
    }
  }
  if (out.managerMention == null && enrich.managerMention != null) {
    out.managerMention = enrich.managerMention;
    touched = true;
  }
  out.engine = touched ? "merged" : base.engine;
  return out;
}

// ─── Field extractors ───────────────────────────────────────────────────────

function detectLanguage(raw: string): string {
  if (/[؀-ۿ]/.test(raw)) return "ar";
  if (/[Ѐ-ӿ]/.test(raw)) return "ru";
  return "en";
}

/** Tokenise on whitespace, keeping original case; drop empties. */
function tokenize(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

function isMakeToken(lc: string): boolean {
  return MAKES.has(lc);
}
function isCarExtensionToken(lc: string): boolean {
  if (MODELS.has(lc)) return true;
  if (TRIMS.has(lc)) return true;
  if (COLORS.has(lc)) return true;
  if (/^(19|20)\d{2}$/.test(lc)) return true; // model year
  // Alphanumeric trim/model codes: gt63, x5, 720s, q7, rs6, 4matic, e63s.
  if (/^[a-z]{0,4}\d{1,4}[a-z]{0,3}$/.test(lc) && /\d/.test(lc)) return true;
  return false;
}

/**
 * Find the car the customer named. Anchor on the first make (or bare well-known
 * model), then extend forward over model/trim/colour/year tokens, stopping at
 * the first stopword. Returns the original-case substring, or null.
 */
export function extractCarText(raw: string): string | null {
  const tokens = tokenize(raw);
  // Strip wrapper punctuation on BOTH sides — quoted brand names
  // ('inquire about "Jetour T2"') used to miss the anchor entirely
  // (prod audit 2026-08-28).
  const lowers = tokens.map((t) => t.toLowerCase().replace(/^[.,!;:"'()\[\]«»“”]+|[.,!;:"'()\[\]«»“”]+$/g, ""));

  // Multi-word make prefix (e.g. "range rover", "mercedes benz").
  const lowerJoined = lowers.join(" ");
  for (const mw of MULTIWORD_MAKES) {
    const idx = lowerJoined.indexOf(mw);
    if (idx === 0 || (idx > 0 && lowerJoined[idx - 1] === " ")) {
      // token index where the multiword make starts
      const before = lowerJoined.slice(0, idx).trim();
      const startTok = before ? before.split(" ").length : 0;
      const mwLen = mw.split(" ").length;
      return captureFrom(tokens, lowers, startTok, mwLen);
    }
  }

  // Single-token make, else bare model.
  let anchor = lowers.findIndex((lc) => isMakeToken(lc));
  if (anchor === -1) anchor = lowers.findIndex((lc) => MODELS.has(lc));
  if (anchor === -1) return null;

  return captureFrom(tokens, lowers, anchor, 1);
}

function captureFrom(
  tokens: string[],
  lowers: string[],
  start: number,
  initialLen: number
): string | null {
  let end = start + initialLen; // exclusive
  while (end < tokens.length) {
    const lc = lowers[end];
    if (CAR_STOPWORDS.has(lc)) break;
    if (isCarExtensionToken(lc) || MAKES.has(lc)) {
      end += 1;
      continue;
    }
    break;
  }
  const slice = tokens.slice(start, end).join(" ").replace(/^[.,!;:"'()\[\]«»“”]+|[.,!;:"'()\[\]«»“”]+$/g, "").trim();
  return slice || null;
}

/**
 * Extract a quoted AED amount. Prefers currency-anchored or "value/price of"
 * numbers; understands k-suffix (650k) and RU/EN thousand separators. Ignores
 * bare 4-digit years unless a currency word sits right beside them.
 */
export function extractPrice(lower: string): number | null {
  const candidates: number[] = [];
  const currency = "(?:aed|dhs|dirhams?|dh|дирхам(?:ов|а)?)";

  // 650k / 650 к
  for (const m of lower.matchAll(/(\d[\d\s.,]*)\s*(k|к)\b/g)) {
    const n = toNumber(m[1]);
    if (n != null) candidates.push(n < 10000 ? n * 1000 : n);
  }
  // currency after: "650000 aed", "650 000 dirham"
  for (const m of lower.matchAll(new RegExp(`(\\d[\\d\\s.,]*\\d|\\d)\\s*${currency}`, "g"))) {
    const n = toNumber(m[1]);
    if (n != null) candidates.push(n);
  }
  // currency before: "aed 650000"
  for (const m of lower.matchAll(new RegExp(`${currency}\\s*(\\d[\\d\\s.,]*\\d|\\d)`, "g"))) {
    const n = toNumber(m[1]);
    if (n != null) candidates.push(n);
  }
  // "value of 650000", "price 650000", "цена 650000", "за 650000"
  for (const m of lower.matchAll(
    /(?:value(?:\s+of)?|price|budget|cost|цена|цену|стоимость|за)\s*[:\-]?\s*(\d[\d\s.,]*\d|\d)/g
  )) {
    const n = toNumber(m[1]);
    if (n != null && !isYearLike(n)) candidates.push(n);
  }

  // Sanity cap: nothing in this business quotes above 50M AED. Anything
  // bigger is a phone number / account number the regexes swallowed — and it
  // also overflows the int32 extracted_price_aed column (prod crash
  // 2026-07-23: pg_strtoint32_safe on a 12-digit "price").
  const sane = candidates.filter((n) => n > 0 && n <= 50_000_000);
  if (sane.length === 0) return null;
  // Deal value dominates: take the largest anchored amount.
  return Math.max(...sane);
}

function isYearLike(n: number): boolean {
  return Number.isInteger(n) && n >= 1990 && n <= 2035;
}

function toNumber(s: string): number | null {
  // Strip spaces/commas used as thousand separators; keep a lone decimal only
  // if it looks like real cents (rare in these lines — we treat "." as sep).
  const cleaned = s.replace(/[\s,.]/g, "");
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

// ─── Dates ──────────────────────────────────────────────────────────────────

const EN_MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9,
  sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};
// RU month stems (match genitive too: "июля", "августа") via start-with.
const RU_MONTH_STEMS: [string, number][] = [
  ["январ", 1], ["феврал", 2], ["март", 3], ["апрел", 4], ["мая", 5],
  ["май", 5], ["июн", 6], ["июл", 7], ["август", 8], ["сентябр", 9],
  ["октябр", 10], ["ноябр", 11], ["декабр", 12],
];

// Month-name alternation (EN abbreviations/full + RU stems with any ending).
const MONTH_RE =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|" +
  "aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|" +
  "январ\\w*|феврал\\w*|март\\w*|апрел\\w*|ма[йя]\\w*|июн\\w*|июл\\w*|" +
  "август\\w*|сентябр\\w*|октябр\\w*|ноябр\\w*|декабр\\w*";

function monthFromWord(w: string): number | null {
  const lc = w.toLowerCase();
  if (EN_MONTHS[lc] != null) return EN_MONTHS[lc];
  for (const [stem, n] of RU_MONTH_STEMS) if (lc.startsWith(stem)) return n;
  return null;
}

interface DayMonth { day: number; month: number; }

/**
 * Extract a rental window. Handles:
 *   "from july 28 to july 31", "july 28 to 31", "28 july - 31 july",
 *   "с 28 июля по 31 июля", "28.07 - 31.07", "28/07/2026".
 * Resolves each to ISO yyyy-mm-dd against referenceDate (future-leaning).
 */
export function extractDates(
  lower: string,
  referenceDate: Date
): { dateFrom: string | null; dateTo: string | null } {
  // Drop ordinal suffixes so "27th july" / "aug 1st" parse like plain numbers.
  lower = lower.replace(/(\d{1,2})(?:st|nd|rd|th)\b/g, "$1");
  const found: DayMonth[] = [];

  // Word-month forms: "<mon> <day>" or "<day> <mon>" (EN + RU), collected in
  // order. The month side is anchored to an ACTUAL month name so a leading verb
  // ("from 27 july") can't consume the day and orphan the month.
  const wordRe = new RegExp(`(?:(${MONTH_RE})\\s+(\\d{1,2})|(\\d{1,2})\\s+(${MONTH_RE}))`, "gi");
  for (const m of lower.matchAll(wordRe)) {
    let month: number | null = null;
    let day: number | null = null;
    if (m[1] && m[2]) { month = monthFromWord(m[1]); day = parseInt(m[2], 10); }
    else if (m[3] && m[4]) { day = parseInt(m[3], 10); month = monthFromWord(m[4]); }
    if (month != null && day != null && day >= 1 && day <= 31) found.push({ day, month });
  }

  // Bare "<mon> <d1> to <d2>" — second day shares the first month.
  if (found.length === 1) {
    // (?!\d): don't let a trailing YEAR ("- 2025") masquerade as an end-day.
    const tail = new RegExp(`\\b\\d{1,2}\\s+[a-zA-Zа-яё]+\\s+(?:to|-|–|по|till|until)\\s+(\\d{1,2})(?!\\d)`);
    const alt = new RegExp(`\\b[a-zA-Zа-яё]+\\s+\\d{1,2}\\s+(?:to|-|–|по|till|until)\\s+(\\d{1,2})(?!\\d)`);
    const m = lower.match(tail) ?? lower.match(alt);
    if (m) {
      const d2 = parseInt(m[1], 10);
      if (d2 >= 1 && d2 <= 31) found.push({ day: d2, month: found[0].month });
    }
  }

  // Numeric dd.mm / dd/mm forms if no word-months found.
  if (found.length === 0) {
    const numRe = /\b(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?\b/g;
    for (const m of lower.matchAll(numRe)) {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) found.push({ day, month });
    }
  }

  if (found.length === 0) return { dateFrom: null, dateTo: null };
  const dateFrom = resolveISO(found[0], referenceDate);
  const dateTo = found.length > 1 ? resolveISO(found[1], referenceDate) : null;
  return { dateFrom, dateTo };
}

/** Resolve day+month to ISO, choosing the year so the date is future-leaning. */
function resolveISO(dm: DayMonth, ref: Date): string {
  const refY = ref.getUTCFullYear();
  let year = refY;
  const cand = Date.UTC(year, dm.month - 1, dm.day);
  const sixMonthsAgo = ref.getTime() - 182 * 24 * 3600 * 1000;
  if (cand < sixMonthsAgo) year += 1;
  const mm = String(dm.month).padStart(2, "0");
  const dd = String(dm.day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// ─── Term / intent / manager ────────────────────────────────────────────────

/** Lease/subscription term in whole months. "monthly"→1, "1 year"→12. */
export function extractTermMonths(lower: string): number | null {
  const yr = lower.match(/(\d{1,2})\s*(?:years?|yrs?|год|года|лет)\b/);
  if (yr) return parseInt(yr[1], 10) * 12;
  // Trailing \b stops "mo" from matching the "mo" in "model" ("2025 model").
  // \b only guards the Latin unit (keeps "mo" out of "model"); the Cyrillic
  // branch can't use ASCII \b (never fires after a Cyrillic letter).
  const mo = lower.match(/(\d{1,3})\s*(?:(?:months?|mos?)\b|месяц(?:ев|а)?)/);
  if (mo) return parseInt(mo[1], 10);
  if (/\b(monthly|per month|в месяц|ежемесячн)\b/.test(lower)) return 1;
  if (/\b(annual(?:ly)?|per year|в год)\b/.test(lower)) return 12;
  return null;
}

/** rent | lease | lease_to_own | sale, by keyword priority. */
export function extractIntent(
  lower: string,
  ctx: { hasDateRange: boolean; termMonths: number | null }
): ExtractIntent | null {
  // Ownership-path phrases FIRST (owner's ask 2026-07-29: «long lease for some
  // minimum time and then buying» is lease-to-own, not a plain sale) — the
  // generic "buy" branch below would otherwise steal them.
  // ── A NOTE ON WORD BOUNDARIES ──────────────────────────────────────────────
  // `\b` is defined over [A-Za-z0-9_], so it can never sit beside a Cyrillic or
  // Arabic letter: `/\bаренд\b/` matches nothing, ever. The Russian terms below
  // were in this function for months and were dead the whole time, and Arabic
  // was never here at all — which is why an Arabic customer asking
  // "كم إيجارها لمدة أسبوع" produced NO signal and fell through to the model
  // (Ayham, 2026-08-31: "Abdullah leads not in the system still"). Latin terms
  // keep their boundaries; non-Latin ones are matched as plain substrings,
  // which is what a bare stem needs anyway given Arabic prefixes (ال-, و-, بـ-)
  // and Russian case endings.
  const latin = (re: RegExp) => re.test(lower);
  const other = (re: RegExp) => re.test(lower);

  if (
    latin(/\b(lease[\s-]?to[\s-]?own|rent[\s-]?to[\s-]?own|then\s+buy|later\s+buy)\b/) ||
    other(/(с\s+выкупом|выкуп|рассрочк|помесячн|تملك|تمليك)/)
  ) {
    return "lease_to_own";
  }
  if (
    latin(/\b(buy|buying|purchase|purchasing|for sale|to sell|selling)\b/) ||
    other(/(купить|покупк|продаж|продать|приобрест|شراء|أشتري|اشتري|للبيع|بيع)/)
  ) {
    return "sale";
  }
  const leaseSignal =
    latin(/\b(lease|leasing|long[\s-]?lease|long[\s-]?term|subscription)\b/) ||
    other(/(лизинг|долгосрочн|عقد\s*طويل|طويل\s*الأمد)/) ||
    (ctx.termMonths != null && ctx.termMonths >= 1 && !ctx.hasDateRange);
  if (leaseSignal) return "lease";
  if (
    ctx.hasDateRange ||
    latin(/\b(rent|rental|hire|daily|per day|days?|weekly|weeks?)\b/) ||
    // IG ice-breakers + price questions (2026-10-02): the business's own FAQ
    // button sends "What cars are available now?" and customers ask "How much
    // is the cost of the car ?" — both are real leads that scored intent:null
    // and were filed NOISE on day one of the ig-observer. Arabic had متوفر and
    // بكم for exactly these; English had neither.
    latin(/\bhow much\b/) ||
    latin(/\b(cars?|vehicles?)\s+(are\s+)?available\b|\bavailable\s+(now|today)\b|\bis\s+it\s+available\b/) ||
    // Russian: rent / hire / per-day, plus the day-and-week words a request
    // carries ("на неделю", "на 3 дня").
    other(/(аренд|прокат|в\s*сутки|посуточн|дней|дня|сутки|недел)/) ||
    // Arabic: إيجار / استئجار / تأجير are the rent stems; متوفر ("available")
    // and كم/بكم ("how much") are how the question is actually asked; يوم /
    // أسبوع / شهر are day / week / month.
    other(/(إيجار|ايجار|استئجار|استاجر|تأجير|تاجير|أجار|اجار|متوفر|متوفره|بكم|كم\s*سعر|يوم|أسبوع|اسبوع|شهر)/)
  ) {
    return "rent";
  }
  return null;
}

const NON_NAMES = new Set([
  "there", "team", "sir", "madam", "all", "guys", "everyone", "bro", "brother",
  "friend", "boss", "dear", "good", "sales",
]);

/** A manager first name the customer addressed. */
export function extractManager(raw: string, managerNames: string[]): string | null {
  for (const name of managerNames) {
    // Unicode-aware boundary: JS \b is ASCII-only and never fires next to a
    // Cyrillic letter, so match on non-letter (or string edge) delimiters.
    const re = new RegExp(`(?:^|[^\\p{L}])${escapeRe(name)}(?:[^\\p{L}]|$)`, "iu");
    if (re.test(raw)) return titleCase(name);
  }
  const greet = raw.match(
    /^\s*(?:hi|hello|hey|dear|good morning|good evening|здравствуйте|привет|salam|assalam[u]?\s*alaikum)[\s,]+([A-ZА-ЯЁ][a-zа-яё]+)/i
  );
  if (greet) {
    const cand = greet[1];
    if (!NON_NAMES.has(cand.toLowerCase())) return titleCase(cand);
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

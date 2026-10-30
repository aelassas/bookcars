// INTELLIGENCE LAYER — competitor broadcast detection + parsing.
//
// Rental shops blast a daily "available cars" list into the very same WhatsApp
// chats the customers use (TOP CAR RENT A CAR, ZORWAH, ZORWAH...). Each is a
// free, real-time read on what the market is pushing and at what price. This
// module recognises those broadcasts and shreds them into rows so a later
// one-screen market view can show "who is offering what, and where we're
// undpercut". Rows land in the `competitor_offer` table (migration 0050).
//
// Pure + synchronous (uses extractCarText/extractPrice from ./extract). The
// persistence layer decides tenant/postedAt; this only parses text.

import { extractCarText, extractPrice } from "./extract";

export interface CompetitorRow {
  /** The verbatim source line the row came from (trimmed). */
  sourceLine: string;
  /** Best-effort car mention (make + model + year), make-header carried down. */
  carText: string;
  /** Price in AED if the line quoted one (these lists usually don't). */
  priceAed: number | null;
  /** Model year if present. */
  year: number | null;
}

export interface CompetitorPost {
  /** The broadcasting shop, lifted from the header ("TOP CAR RENT A CAR"). */
  source: string | null;
  rows: CompetitorRow[];
}

// Phrases that mark a fleet-list broadcast rather than a 1:1 customer message.
const BROADCAST_MARKERS =
  /\b(available\s+(?:cars?|vehicles?|now)|car\s+list|price\s+list|fleet\s+(?:list|available)|for\s+rent\s+today|наличие|доступн\w*\s+(?:авто|машин))\b/i;

// Emoji / bullets / list numbering we strip before reading a line as a car.
const NOISE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}]/gu;

/**
 * Is this message a competitor fleet broadcast (as opposed to a customer's own
 * message)? True when it names a broadcast marker, or when several distinct
 * lines each look like a car listing (a make/model + a 20xx year).
 */
export function isBroadcast(text: string): boolean {
  const t = text ?? "";
  if (BROADCAST_MARKERS.test(t)) return true;
  const carLines = splitLines(t).filter((l) => looksLikeCarLine(l));
  return carLines.length >= 3;
}

/**
 * Parse a broadcast into competitor rows. Carries a bare make-header line
 * ("1. MERCEDES 🚘") down onto the model rows beneath it ("🛞 G63 2026") so the
 * row reads "MERCEDES G63 2026".
 */
export function parseCompetitorPost(text: string): CompetitorPost {
  const source = detectSource(text);
  const rows: CompetitorRow[] = [];
  let currentMake: string | null = null;

  for (const rawLine of splitLines(text)) {
    const line = cleanLine(rawLine);
    if (!line) continue;

    // Skip obvious non-car chrome (headers, phones, CTAs).
    if (isChrome(line)) {
      const mk = bareMake(line);
      if (mk) currentMake = mk;
      continue;
    }

    const car = extractCarText(line);
    const year = readYear(line);

    // A lone make on its own line is a header for the rows that follow.
    const mk = bareMake(line);
    if (mk && !year && (!car || car.toLowerCase() === mk.toLowerCase())) {
      currentMake = mk;
      continue;
    }

    if (!car && year == null) continue; // not a car line

    let carText = car ?? line;
    // If the line named a model but no make, prepend the carried header.
    if (currentMake && !startsWithMake(carText)) {
      carText = `${currentMake} ${carText}`;
    }

    rows.push({
      sourceLine: line,
      carText: tidy(carText),
      priceAed: extractPrice(line.toLowerCase()),
      year,
    });
  }

  return { source, rows };
}

// ─── helpers ────────────────────────────────────────────────────────────────

function splitLines(text: string): string[] {
  // Real posts separate rows by newlines OR long runs of spaces (ZORWAH pads
  // with hundreds of spaces). Treat 3+ spaces as a soft line break.
  return (text ?? "")
    .split(/[\r\n]+|\s{3,}/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function cleanLine(line: string): string {
  return line
    .replace(NOISE, " ")
    .replace(/^\s*\d+[.)]\s*/, "") // leading "1." / "2)"
    .replace(/^[\s.\-–*•·]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readYear(line: string): number | null {
  const m = line.match(/\b(20\d{2})\b/);
  return m ? parseInt(m[1], 10) : null;
}

const MAKE_WORDS = [
  "mercedes", "mercedes-benz", "bmw", "audi", "porsche", "lamborghini",
  "ferrari", "bentley", "rolls", "rolls-royce", "maserati", "mclaren",
  "range rover", "land rover", "rang rover", "nissan", "toyota", "lexus",
  "cadillac", "chevrolet", "gmc", "ford", "dodge", "jeep", "kia", "hyundai",
  "tesla", "volkswagen", "mazda", "mini", "genesis", "infiniti", "jaguar",
];

/** If the whole (cleaned) line is essentially just a make name, return it. */
function bareMake(line: string): string | null {
  const low = line.toLowerCase().replace(/[^a-zа-яё\s-]/gi, "").trim();
  for (const m of MAKE_WORDS) {
    if (low === m || low === `${m} `.trim()) return titleCaseWords(m);
  }
  // "MERCEDES" alone (single all-caps token that is a make)
  const oneWord = low.split(/\s+/);
  if (oneWord.length === 1 && MAKE_WORDS.includes(oneWord[0])) return titleCaseWords(oneWord[0]);
  return null;
}

function startsWithMake(car: string): boolean {
  const low = car.toLowerCase();
  return MAKE_WORDS.some((m) => low.startsWith(m));
}

function looksLikeCarLine(rawLine: string): boolean {
  const line = cleanLine(rawLine);
  if (!line) return false;
  if (readYear(line) != null) return true;
  return extractCarText(line) != null;
}

// Header / contact / call-to-action chrome that isn't a car row.
function isChrome(line: string): boolean {
  return /(rent a car|car rental|available|best price|delivery|book now|whatsapp|\+?\d[\d\s\-]{7,}|call us|contact|drive your|dream car|price\s*&|pics)/i.test(
    line
  ) && readYear(line) == null && extractCarText(line) == null;
}

function detectSource(text: string): string | null {
  for (const line of splitLines(text)) {
    const clean = cleanLine(line);
    const m = clean.match(/([A-Z][A-Za-z' ]{2,30}?(?:RENT A CAR|CAR RENTAL|RENTALS?|MOTORS))/i);
    if (m) return tidy(m[1]);
  }
  return null;
}

function titleCaseWords(s: string): string {
  return s
    .split(/[\s-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
function tidy(s: string): string {
  return s.replace(/[\s,]+$/g, "").replace(/\s+/g, " ").trim();
}

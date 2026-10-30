import type { KaitenFile } from "./client";

// Kaiten column → TAKE Auto vehicle.status mapping

export const KAITEN_DOC_COLUMNS = new Set([
  "Важная информация",
  "Договоры",
  "Договор",
  "График оплат",
  "Скрипт обработки возражений",
  "Скрипт продаж",
]);

export function isDocumentCard(columnTitle: string, cardTitle: string): boolean {
  const lowerCol = columnTitle.toLowerCase();
  const lowerCard = cardTitle.toLowerCase();

  // Column-based heuristics
  if (lowerCol.includes("информация") || lowerCol.includes("договор")) return true;

  // Title-based heuristics
  if (
    lowerCard.includes("договор") ||
    lowerCard.includes("график оплат") ||
    lowerCard.includes("скрипт") ||
    lowerCard.includes("информация")
  ) {
    return true;
  }

  return false;
}

export function mapColumnToStatus(columnTitle: string): string {
  const lower = columnTitle.toLowerCase();

  if (lower.includes("stock") || lower.includes("for sale")) return "available";
  if (lower.includes("booked")) return "on_rent";
  if (lower.includes("easyrent") || lower.includes("cardivan")) return "reserved";

  return "available"; // fallback
}

// Cap on stored photos per car. Cards run up to ~19 files; a handful is all
// the finder and profile need, and it keeps the jsonb payload small.
const MAX_PHOTOS = 12;

// Image mime/extension test — the API sometimes leaves mime_type null, so fall
// back to the filename extension.
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|avif)$/i;

/**
 * The showroom photos to keep off a Kaiten card, in board order (cover first).
 *
 * Kaiten files carry `type: 1` for images and a public `files.kaiten.ru` URL
 * that loads without the API key, so the UI can point an <img> straight at it.
 * Deleted files and non-images (the occasional PDF) are dropped, the card cover
 * is floated to the front, and the list is capped at MAX_PHOTOS.
 */
export function extractCardPhotos(
  files: KaitenFile[] | undefined | null
): { url: string; name: string }[] {
  if (!files?.length) return [];
  const images = files.filter((f) => {
    if (f.deleted || !f.url) return false;
    if (f.type === 1) return true;
    if (f.mime_type?.startsWith("image/")) return true;
    return IMAGE_EXT.test(f.name ?? f.url);
  });
  images.sort((a, b) => {
    // Card cover first, then the board's own sort order.
    if (!!a.card_cover !== !!b.card_cover) return a.card_cover ? -1 : 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  return images.slice(0, MAX_PHOTOS).map((f) => ({
    url: f.url,
    name: (f.name ?? "").trim() || "photo",
  }));
}

export function mapColumnToDivision(columnTitle: string): string {
  const lower = columnTitle.toLowerCase();
  if (lower.includes("lux")) return "rent"; // could tag as luxury later
  return "rent";
}

/**
 * Normalise a plate for comparison: strip everything that is not a letter or a
 * digit and upper-case the rest. "46423 EE" and "46423-ee" are the same car.
 */
export function normalizePlate(plate: string): string {
  return plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

// A plate must be *labelled* to count. The label is the whole guarantee: it is
// a human saying "this is the plate", which is the only evidence a Kaiten card
// ever offers. The value itself is then constrained to the UAE shape the fleet
// stores — an optional emirate/category prefix, 1–5 digits, a 1–2 letter code
// ("46423 EE", "DXB 46423 EE", "A 14465 Y").
const PLATE_LABEL =
  /(?:plate|number\s*plate|plate\s*(?:no|number)|номер|госномер)\s*[:#–-]?\s*([A-Z]{0,3}\s*-?\s*\d{1,5}\s*-?\s*[A-Z]{1,2})\b/i;

/**
 * Pull a real plate out of a Kaiten card, or return null.
 *
 * Deliberately strict, and deliberately expected to return null for nearly
 * every card. Kaiten cards are board items titled "Tesla Model Y 2023" — they
 * carry no plate, and the plate is the one thing that makes a `vehicle` row a
 * car rather than a sticky note. A guessed plate is strictly worse than no
 * vehicle at all, because it silently forks a real car into two fleet rows.
 *
 * An unlabelled "<digits> <letters>" token is NOT accepted, and that is not
 * timidity — it was measured. Run against all 163 live Kaiten cards, that
 * heuristic produced 18 matches and every single one was a trim code, not a
 * plate: "BMW 520i 2024" → "520 I", "McLaren 720S 2022" → "720 S",
 * "Mercedes GLC 300E 2021" → "GLC 300 E". Zero true positives. So the bar is an
 * explicit label; a card that wants to name its car can say "plate: 46423 EE".
 */
export function parseCardPlate(...fields: (string | null | undefined)[]): string | null {
  for (const text of fields) {
    if (!text?.trim()) continue;
    const labelled = text.match(PLATE_LABEL);
    if (labelled) return labelled[1].replace(/\s+/g, " ").trim().toUpperCase();
  }
  return null;
}

/**
 * Parse a Kaiten card title like:
 *   "Mercedes-Benz GLS580 2021"
 *   "Mercedes ~ Benz GLC 300"
 *   "Porsche 911 Carrera 4GTS 2025"
 *   "Jetour T2 2026 (Green interior)"
 *   "Lamborghini Urus 2024 Perfomante"
 *   "NIssan XTerra 2023"
 */
export function parseVehicleTitle(title: string): {
  make: string;
  model: string;
  year: number | null;
  raw: string;
} {
  // Normalize separators
  let cleaned = title
    .replace(/\s+/g, " ")
    .replace(/~/g, "-")
    .trim();

  // Remove parenthetical extras
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, " ").trim();

  // Try to extract any 4-digit year (19xx or 20xx)
  const yearMatch = cleaned.match(/\b((?:19|20)\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
  if (yearMatch && yearMatch.index !== undefined) {
    cleaned = (cleaned.slice(0, yearMatch.index) + " " + cleaned.slice(yearMatch.index + yearMatch[0].length)).trim();
  }

  // Split by first space to separate make from model
  // But handle multi-word makes (Mercedes-Benz, Land Rover, etc.)
  const knownMultiWordMakes = [
    "mercedes-benz",
    "mercedes benz",
    "land rover",
    "range rover",
    "rolls-royce",
    "aston martin",
    "alfa romeo",
  ];

  const lowerCleaned = cleaned.toLowerCase();
  let make = "";
  let model = "";

  for (const multi of knownMultiWordMakes) {
    if (lowerCleaned.startsWith(multi)) {
      make = cleaned.slice(0, multi.length).trim();
      model = cleaned.slice(multi.length).trim();
      break;
    }
  }

  if (!make) {
    // Single-word make fallback
    const firstSpace = cleaned.indexOf(" ");
    if (firstSpace > 0) {
      make = cleaned.slice(0, firstSpace).trim();
      model = cleaned.slice(firstSpace + 1).trim();
    } else {
      make = cleaned;
      model = "";
    }
  }

  // Title-case make
  make = make
    .split(/[-\s]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("-");

  // Title-case model
  model = model
    .split(/[-\s]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return { make, model, year, raw: title };
}

// Decompose a free-text fleet plate string into RTA's four structured fields.
//
// The fleet stores a plate as ONE string (vehicle.plate), written however the
// car was entered — "M 50154", "50154 M", "MM5015", "Dubai M 50154", etc. RTA's
// payable-fines call needs {sourceCode, plateCategory, plateCode, plateNo}.
//
// Owner's rule (2026-08-10): the fleet is Dubai private plates, so
//   - sourceCode   defaults to "DXB" (Dubai)
//   - plateCategory defaults to "PRIVATE"
//   - plateCode    = 1-2 letters
//   - plateNo      = 1-5 digits
// We extract the letter group and the digit group regardless of their order or
// spacing, and drop a leading "Dubai" if someone typed it. A plate that has no
// digits (nothing to look up) yields null.

import type { PlateQuery } from "./client";

const DEFAULT_SOURCE = "DXB";
const DEFAULT_CATEGORY = "PRIVATE";

// Words that sometimes prefix a plate string but are not the code/number.
const NOISE = /\b(dubai|dxb|private|plate|no\.?)\b/gi;

export interface DecodeResult {
  query: PlateQuery;
  /** True if we had to guess (e.g. >2 letters, or ambiguous) — worth logging. */
  uncertain: boolean;
}

/**
 * Parse a plate string into an RTA PlateQuery. Returns null when there is no
 * usable number (nothing to look up). Never throws.
 */
export function decodePlate(raw: string | null | undefined): DecodeResult | null {
  if (!raw) return null;

  const cleaned = raw.replace(NOISE, " ").toUpperCase();

  // Digit run of 1-5 (the plate number). Take the longest run to be safe.
  const digitRuns = cleaned.match(/\d{1,5}/g);
  if (!digitRuns || digitRuns.length === 0) return null;
  const plateNo = digitRuns.sort((a, b) => b.length - a.length)[0];

  // Letter run of 1-2 (the plate code). Latin letters only; ignore stray
  // single letters that are actually noise by preferring the run adjacent to
  // the number, then any 1-2 letter run.
  const letterRuns = cleaned.match(/[A-Z]{1,2}/g) ?? [];
  const plateCode = letterRuns[0] ?? "";

  const uncertain =
    plateNo.length > 5 ||
    /[A-Z]{3,}/.test(cleaned) || // 3+ consecutive letters — not a normal code
    digitRuns.length > 1; // more than one number group — ambiguous source

  return {
    query: {
      sourceCode: DEFAULT_SOURCE,
      plateCategory: DEFAULT_CATEGORY,
      plateCode,
      plateNo,
    },
    uncertain,
  };
}

// Name normalization for the Bitrix24 → Twenty migration.
//
// Two hard rules inherited from the incident history:
//   1. NEVER substitute a placeholder ("Unknown") for a missing name — the old
//      mapping did exactly that and produced thousands of indistinguishable
//      "Unknown" customers. This module reports `empty: true` and returns
//      `display: null`; the CALLER decides what an empty name means.
//   2. Case is only fixed for Latin. Cyrillic and Arabic names are left in
//      their original case — Russian surnames carry legitimate internal
//      capitals (particles, transliterated prefixes) and Arabic has no case at
//      all; lowercasing them destroys information to no benefit.
//
// Owner/manager names are a different problem from contact names: the SAME
// salesperson exists under many spellings across the three portals ("Babek" /
// "Бабек Садыгов"). That collapse is owned by modules/monitor/people.ts
// (canonicalName) — normalizeOwnerName() delegates to it instead of inventing
// a second variant table.

import { canonicalName } from "../../modules/monitor/people";

export type NameScript = "latin" | "cyrillic" | "arabic" | "mixed" | "none";

export interface NormalizedName {
  /** Cleaned display name, or null when empty/junk. */
  display: string | null;
  /** Case-folded key for sorting / name-based dedupe. "" when empty. */
  sortKey: string;
  script: NameScript;
  empty: boolean;
}

// Values that are not names. "Test Test" is the CallGear catch-all owner;
// dashes/dots are what salespeople type to skip a required field.
const JUNK_NAME = /^(?:[-—–_.•·*#]+|test(?:\s+test)?|n\/?a|unknown|noname|none|без\s+имени|нет)$/i;

const RE_LATIN = /[A-Za-z]/;
const RE_CYRILLIC = /[\u0400-\u04FF]/;
// Arabic: base block + supplement + extended-A + presentation forms A/B.
const RE_ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function emptyName(): NormalizedName {
  return { display: null, sortKey: "", script: "none", empty: true };
}

/** Title Case for Latin words, respecting hyphen/apostrophe boundaries. */
function titleCaseLatin(s: string): string {
  // Short whole-word acronyms (DXB, UAE, HH) stay uppercase — lowercasing them
  // was mangling real client names into "Dxb"/"Uae" (data audit). Longer
  // all-caps tokens are almost always shouting data entry ("JOHN SMITH"), not
  // acronyms, so they get title-cased. 3 letters is the practical cutoff.
  return s
    .split(/(\s+)/)
    .map((tok) =>
      /^[A-Z0-9]{2,3}$/.test(tok)
        ? tok
        : tok.toLowerCase().replace(/(^|[\-'’])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase())
    )
    .join("");
}

export function detectScript(s: string): NameScript {
  const latin = RE_LATIN.test(s);
  const cyrillic = RE_CYRILLIC.test(s);
  const arabic = RE_ARABIC.test(s);
  const count = [latin, cyrillic, arabic].filter(Boolean).length;
  if (count === 0) return "none";
  if (count > 1) return "mixed";
  return latin ? "latin" : cyrillic ? "cyrillic" : "arabic";
}

export function normalizeName(raw: string | null | undefined): NormalizedName {
  // Collapse ALL whitespace runs (incl. non-breaking/zero-width spaces from
  // Bitrix copy-paste) before any test — "  Test   Test " must read as junk.
  const collapsed = (raw ?? "").replace(/[\s\u00A0\u200B\u202F]+/g, " ").trim();
  if (!collapsed || JUNK_NAME.test(collapsed)) return emptyName();

  const script = detectScript(collapsed);
  // No letters at all (a phone number typed into the name field, "!!!") is
  // not a name — report empty rather than migrating garbage into Twenty.
  if (script === "none") return emptyName();

  const display = script === "latin" ? titleCaseLatin(collapsed) : collapsed;
  return { display, sortKey: display.toLowerCase(), script, empty: false };
}

/**
 * Normalize an OWNER/manager name (Bitrix ASSIGNED_BY display, import account
 * names). Delegates the variant collapse to canonicalName() — its null means
 * "system catch-all / unassigned", which surfaces here as empty: true.
 */
export function normalizeOwnerName(raw: string | null | undefined): NormalizedName {
  return normalizeName(canonicalName(raw));
}

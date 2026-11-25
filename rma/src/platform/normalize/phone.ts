// Phone normalization for the Bitrix24 → Twenty migration.
//
// This module WRAPS platform/messaging/phone.ts — it does not re-implement
// digit-stripping or re-define the tail-match length. messaging/phone.ts owns
// the "reduce to digits, compare the last MIN_PHONE_MATCH_DIGITS" contract
// (the same tail9 the CRM uses to link WhatsApp messages to leads), so a phone
// that matches there must match here. What this module ADDS on top is what the
// migration needs and the messaging layer deliberately does not do:
//   - country-code resolution (Bitrix stores "+971…", "00971…", "0971…",
//     "971…" and bare "05x …" for the SAME number across three portals),
//   - an E.164 rendering for Twenty,
//   - validity with a REASON instead of a throw — a migration must classify
//     junk, not crash on it.
//
// Clients are international (UAE base, plus Saudi/Oman/Kuwait), so the Gulf
// codes are resolved explicitly; anything else with an explicit "+" is kept
// as-is, and anything unrecognizable is marked invalid with a reason — never
// guessed.

// The `core` entry point takes metadata as an EXPLICIT argument, and that is
// the whole point: the convenience entry points bind it implicitly, and under
// tsx — the runtime every migration script actually runs on — that binding
// arrives as `{ default: … }` and the library throws "metadata argument was
// passed but it's not a valid metadata" on EVERY call. Vitest and plain node
// resolve it fine, so the failure only appears in production runs. Do not
// "simplify" this back to `from "libphonenumber-js"`.
import { parsePhoneNumberFromString, type MetadataJson } from "libphonenumber-js/core";
import rawPhoneMetadata from "libphonenumber-js/metadata.min.json";
import { normalizePhone as digitsOnly, MIN_PHONE_MATCH_DIGITS } from "../messaging/phone";

export interface NormalizedPhone {
  /** E.164 ("+971501234567") when valid, null otherwise. */
  e164: string | null;
  /**
   * Last MIN_PHONE_MATCH_DIGITS (9) digits of the E.164 number — the dedupe /
   * cross-portal match key, identical to what phonesMatch() compares in the
   * messaging layer. Null when invalid.
   */
  tail9: string | null;
  valid: boolean;
  /** Machine-readable reason when valid=false; null when valid. */
  reason: PhoneInvalidReason | null;
}

export type PhoneInvalidReason =
  | "empty"
  | "group_jid" // WhatsApp group id (@g.us) — a chat room, not a person
  | "opaque_lid" // WhatsApp @lid — opaque device id, NOT a phone number
  | "too_short" // fewer than 8 digits — cannot be a real number
  | "too_long" // more than 15 digits — exceeds E.164, usually two numbers glued
  | "bad_national" // known country code, implausible national part
  | "unrecognized_format"; // no country code, no "+", not a UAE local number

/** Gulf country codes seen in the three portals → allowed national lengths. */
const GULF_COUNTRIES: Record<string, number[]> = {
  "971": [9, 8], // UAE — 9 mobile (50x…), 8 landline (4…)
  "966": [9], // Saudi Arabia
  "968": [8], // Oman
  "965": [8], // Kuwait
};

/** Other country codes common in the portals' expat clients, WITHOUT a "+"
 * (data audit: 3.56% of phones were rejected as "unrecognized_format" while
 * being perfectly real numbers). Format: code → allowed national lengths
 * (digits INCLUDING the country code). */
const INTL_COUNTRIES: Record<string, number[]> = {
  "7": [11], // Russia / Kazakhstan
  "91": [12], // India
  "92": [12], // Pakistan
  "998": [12], // Uzbekistan
  "20": [11, 12], // Egypt
  "974": [11], // Qatar
  "44": [12], // UK
  "880": [11, 13], // Bangladesh
  "86": [12, 13], // China
  "49": [11, 12, 13], // Germany
};

function matchIntl(digits: string): NormalizedPhone | null {
  for (const [cc, totalLens] of Object.entries(INTL_COUNTRIES)) {
    if (digits.startsWith(cc) && totalLens.includes(digits.length)) return ok(digits);
  }
  return null;
}

// Same unwrap: bundlers and tsx disagree about whether a JSON import lands
// under `.default`, and the library validates the shape it is handed.
const PHONE_METADATA = (
  (rawPhoneMetadata as { default?: unknown }).default ?? rawPhoneMetadata
) as MetadataJson;

export interface SplitPhone {
  /** "+971" — the country calling code, with its plus. */
  callingCode: string;
  /** National part, country code stripped ("501234567"). */
  nationalNumber: string;
  /** ISO-3166 alpha-2, or null when the calling code maps to several. */
  regionCode: string | null;
}

/**
 * Split a valid E.164 number into calling code + national part.
 *
 * Twenty stores phones as a composite (number, callingCode, countryCode) and
 * validates the NUMBER field with libphonenumber. Handing it full
 * international digits with no calling code makes it read them as a national
 * number: 2,209 contacts were rejected outright on the 2026-08-01 import
 * ("Provided phone number is invalid 201060622228" — an Egyptian mobile) and
 * another 18,372 landed with the country code buried inside the national field.
 *
 * The split is delegated to libphonenumber-js ON PURPOSE — it is the same
 * library Twenty validates with, so what we can split is exactly what Twenty
 * accepts. The hand-maintained calling-code table this replaced covered only
 * the countries we had already been bitten by, and the 2026-08-02 leads run
 * proved the point: 793 perfectly real numbers (Turkey, Ukraine, Kyrgyzstan,
 * France, Iran, Italy, Belarus, the US…) could not be split and were failing
 * the same way. Do NOT reintroduce a local table here.
 *
 * Country resolution is left to the library, which knows that +7 spans Russia
 * and Kazakhstan and picks by national prefix rather than guessing. Null means
 * the number is not parseable at all, and the caller must not invent a split.
 */
export function splitE164(e164: string | null | undefined): SplitPhone | null {
  if (!e164) return null;
  const digits = e164.startsWith("+") ? e164.slice(1) : e164;
  if (!/^\d+$/.test(digits)) return null;
  // Deliberately NOT wrapped in try/catch. An earlier version swallowed the
  // metadata-binding error above and turned it into "no number can be split",
  // which looks exactly like ordinary unparseable input — 59,377 of 59,377
  // silently unsplittable. A broken parser must crash the run, not quietly
  // downgrade every record.
  const parsed = parsePhoneNumberFromString(`+${digits}`, PHONE_METADATA);
  if (!parsed?.countryCallingCode || !parsed.nationalNumber) return null;
  return {
    callingCode: `+${parsed.countryCallingCode}`,
    nationalNumber: String(parsed.nationalNumber),
    regionCode: parsed.country ?? null,
  };
}

const MIN_DIGITS = 8; // shortest plausible national number (Oman/Kuwait local)
const MAX_DIGITS = 15; // E.164 hard limit

function invalid(reason: PhoneInvalidReason): NormalizedPhone {
  return { e164: null, tail9: null, valid: false, reason };
}

function ok(e164Digits: string): NormalizedPhone {
  return {
    e164: `+${e164Digits}`,
    tail9: e164Digits.slice(-MIN_PHONE_MATCH_DIGITS),
    valid: true,
    reason: null,
  };
}

/**
 * Try to read `digits` as country-code + national part for a known Gulf
 * country. Tolerates a trunk "0" glued after the country code
 * ("9710501234567" — a real Bitrix artifact). Returns null when no Gulf code
 * matches, a NormalizedPhone otherwise.
 */
/**
 * UAE national part sanity check: 9-digit numbers are mobiles (5x…),
 * 8-digit numbers are landlines (area codes 2/3/4/6/7/9). Anything else
 * ("123456789") is a local-looking string that is not a UAE number — better
 * classified invalid than guessed into a wrong +971 record.
 */
function validAeNational(national: string): boolean {
  if (national.length === 9) return national.startsWith("5");
  if (national.length === 8) return /^[234679]/.test(national);
  return false;
}

function matchGulf(digits: string): NormalizedPhone | null {
  for (const [cc, nationalLens] of Object.entries(GULF_COUNTRIES)) {
    if (!digits.startsWith(cc)) continue;
    let national = digits.slice(cc.length);
    // Trunk zero inside an international-format number.
    const maxLen = Math.max(...nationalLens);
    if (national.length === maxLen + 1 && national.startsWith("0")) {
      national = national.slice(1);
    }
    if (!nationalLens.includes(national.length)) return invalid("bad_national");
    if (cc === "971" && !validAeNational(national)) return invalid("bad_national");
    return ok(cc + national);
  }
  return null;
}

/**
 * Normalize a raw phone/JID from Bitrix or WhatsApp to E.164 + tail9.
 *
 * `defaultRegion` is the country assumed for numbers with no country code —
 * only "AE" is supported because that is the only local format the portals
 * actually contain; guessing any other region would corrupt data silently.
 */
export function normalizePhone(
  raw: string | null | undefined,
  defaultRegion: "AE" = "AE",
): NormalizedPhone {
  if (!raw || !String(raw).trim()) return invalid("empty");

  const text = String(raw);
  // WhatsApp artifacts are checked on the RAW string: after digit-stripping a
  // group id and a phone number look identical, and an @lid looks like a
  // plausible number — both must be rejected before they pollute a dedupe key.
  if (/@g\.us\b/i.test(text)) return invalid("group_jid");
  if (/@lid\b/i.test(text)) return invalid("opaque_lid");

  let digits = digitsOnly(text); // shared stripper from messaging/phone.ts
  // Placeholder junk: "+7 (777) 777 7777", "+971 55-555-5555" and friends
  // were becoming valid dedupe keys and gluing strangers together (data audit).
  if (/(\d)\1{6,}/.test(digits)) return invalid("bad_national");
  if (digits.length < MIN_DIGITS) return invalid("too_short");
  if (digits.length > MAX_DIGITS) return invalid("too_long");

  // "00" is the international dial prefix ("0097150…") — strip it once.
  if (digits.startsWith("00")) digits = digits.slice(2);

  const gulf = matchGulf(digits);
  if (gulf) return gulf;

  if (digits.startsWith("0")) {
    // A single trunk zero may hide a country code ("0971501234567")…
    const withoutTrunk = digits.slice(1);
    const gulfAfterTrunk = matchGulf(withoutTrunk);
    if (gulfAfterTrunk) return gulfAfterTrunk;
    // …or mark a UAE local number ("0501234567" → "501234567").
    if (defaultRegion === "AE" && validAeNational(withoutTrunk)) {
      return ok("971" + withoutTrunk);
    }
  }

  // Bare UAE local number ("501234567" mobile / "41234567" landline), no
  // trunk, no country code.
  if (defaultRegion === "AE" && validAeNational(digits) && !digits.startsWith("0")) {
    return ok("971" + digits);
  }

  // Explicit "+" on a non-Gulf number (e.g. "+44…", "+7…"): trust the caller's
  // country code, keep the digits verbatim.
  if (text.trim().startsWith("+") && digits.length >= 10) return ok(digits);

  // Known expat country codes WITHOUT "+" (whitelist — never a blind guess).
  const intl = matchIntl(digits);
  if (intl) return intl;

  return invalid("unrecognized_format");
}

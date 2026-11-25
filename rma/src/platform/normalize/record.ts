// Bitrix24 CRM record → clean Twenty-ready record.
//
// This is the migration-facing counterpart to integrations/bitrix24/mappings.ts.
// The mappings there serve the LIVE sync into the platform's own schema and
// deliberately drop data (first phone only, "Unknown" names). These functions
// serve the ONE-SHOT migration into Twenty CRM, where dropping data is
// unforgivable and junk must be classified, not papered over:
//   - ALL phones and emails are kept (first valid one = primary, the rest =
//     additional — Twenty's person form supports both);
//   - DELETED='Y' rows are refused (null), not migrated — the old ingest
//     imported the recycle bin;
//   - an optional `cutoff` drops rows not modified since that date (the
//     portals carry years of dead leads nobody will call);
//   - UF_* user fields — requested in every select but mapped nowhere — are
//     carried through into customFields so the migration doesn't silently
//     lose the very fields salespeople actually filled in;
//   - empty names stay empty (`empty: true`), the caller decides — never
//     "Unknown".

import { normalizeSource, type BitrixCrmRecord, type BitrixMultiField } from "../integrations/bitrix24/mappings";
import { normalizePhone, type NormalizedPhone } from "./phone";
import { normalizeName, type NormalizedName, type NameScript } from "./name";
import type { DedupeRecord } from "./dedupe";

export interface NormalizeOptions {
  /** Rows whose last Bitrix activity is older than this are refused (null). */
  cutoff?: Date | string | null;
  /** Brand / portal line, used for the name+brand dedupe key. */
  brandLine?: string | null;
}

/** Twenty CRM person form (plus migration metadata alongside). */
export interface TwentyPerson {
  name: { firstName: string | null; lastName: string | null };
  emails: { primaryEmail: string | null; additionalEmails: string[] };
  phones: { primaryPhoneNumber: string | null; additionalPhones: string[] };
}

interface NormalizedBase {
  externalId: string;
  externalIds: string[];
  /** Every extracted e-mail, in Bitrix order (nothing dropped). */
  allEmails: string[];
  /** Every phone entry WITH its validity verdict — junk stays visible. */
  allPhones: NormalizedPhone[];
  brandLine: string | null;
  customFields: Record<string, unknown>;
  sourceModifiedAt: Date | null;
  createdAt: Date | null;
}

export interface NormalizedContactRecord extends NormalizedBase {
  kind: "contact";
  person: TwentyPerson;
  nameInfo: NormalizedName;
  source: string;
  comments: string | null;
}

export interface NormalizedLeadRecord extends NormalizedBase {
  kind: "lead";
  person: TwentyPerson;
  nameInfo: NormalizedName;
  title: string | null;
  /** Raw Bitrix STATUS_ID — funnel codes differ per portal; mapping is the
   *  caller's job (see createLeadStatusCatalog in mappings.ts). */
  statusId: string | null;
  source: string;
  comments: string | null;
}

/** Twenty CRM opportunity form (plus migration metadata). */
export interface NormalizedDealRecord extends NormalizedBase {
  kind: "deal";
  /** Opportunity name (Bitrix TITLE). */
  name: string | null;
  /** Raw STAGE_ID (e.g. "C6:UC_FLL5Y2") — stage mapping is funnel-specific and
   *  owned by the sync layer; the migration keeps the honest raw value. */
  stageId: string | null;
  categoryId: string | null;
}

// ─── shared helpers ─────────────────────────────────────────────────────────

/**
 * Addresses that belong to a system, not a person: bounce handlers, listing
 * portals, newsletter senders. Matching is on the LOCAL PART only — the domain
 * says nothing (a real client can use gmail, and oneclickdrive also sends from
 * real staff addresses).
 */
const ROLE_LOCAL_PARTS =
  /^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounce|notifications?|newsletter|support|info|admin|webmaster|abuse)(\+|$)/i;

export function isRoleAddress(email: string | null | undefined): boolean {
  if (!email) return false;
  const local = String(email).split("@")[0]?.trim() ?? "";
  return ROLE_LOCAL_PARTS.test(local);
}

function isDeleted(bx: BitrixCrmRecord): boolean {
  // Bitrix marks recycle-bin rows with the string "Y" — compare strictly,
  // a truthiness check would also eat the number 1 / boolean true.
  return (bx.DELETED as string | undefined) === "Y";
}

function beforeCutoff(bx: BitrixCrmRecord, cutoff: Date | string | null | undefined): boolean {
  if (!cutoff) return false;
  // DATE_MODIFY is the honest "last human activity" stamp; DATE_CREATE is the
  // fallback for rows Bitrix never touched after creation. A row with NO date
  // is kept — refusing it would be guessing.
  const stamp = (bx.DATE_MODIFY as string | undefined) ?? (bx.DATE_CREATE as string | undefined);
  if (!stamp) return false;
  const t = Date.parse(stamp);
  if (Number.isNaN(t)) return false;
  const c = cutoff instanceof Date ? cutoff.getTime() : Date.parse(cutoff);
  return t < c;
}

/** null = refuse this record (deleted or stale). Shared gate for all three. */
function admissionGate(bx: BitrixCrmRecord, opts: NormalizeOptions): boolean {
  return !isDeleted(bx) && !beforeCutoff(bx, opts.cutoff);
}

function extractValues(arr: BitrixMultiField[] | undefined): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((e) => (typeof e?.VALUE === "string" ? e.VALUE.trim() : ""))
    .filter((v) => v.length > 0);
}

function normalizeEmails(bx: BitrixCrmRecord): string[] {
  // Case-insensitive dedupe keeping first-seen order — the same mailbox
  // appears as "A@x.com" on one portal and "a@x.com" on another.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of extractValues(bx.EMAIL)) {
    const k = e.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

function normalizePhones(bx: BitrixCrmRecord): NormalizedPhone[] {
  // One verdict per raw entry, duplicates included — a repeated number is a
  // signal about the source data, not something to silently drop here; the
  // dedupe layer collapses by tail9 when merging.
  return extractValues(bx.PHONE).map((raw) => normalizePhone(raw));
}

/** UF_* user fields → customFields, null/empty values skipped. */
function extractCustomFields(bx: BitrixCrmRecord): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(bx)) {
    if (!k.startsWith("UF_")) continue;
    if (v === null || v === undefined || v === "") continue;
    out[k] = v;
  }
  return out;
}

function toDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t);
}

function baseFields(bx: BitrixCrmRecord, opts: NormalizeOptions): NormalizedBase {
  return {
    externalId: String(bx.ID),
    externalIds: [String(bx.ID)],
    allEmails: normalizeEmails(bx),
    allPhones: normalizePhones(bx),
    brandLine: opts.brandLine ?? null,
    customFields: extractCustomFields(bx),
    sourceModifiedAt: toDate(bx.DATE_MODIFY),
    createdAt: toDate(bx.DATE_CREATE),
  };
}

function personForm(
  bx: BitrixCrmRecord,
  base: NormalizedBase,
  nameInfo: NormalizedName,
): TwentyPerson {
  // Twenty keeps first/last separately; normalize each part on its own so a
  // junk FIRST name doesn't poison a good LAST name (and vice versa).
  const first = normalizeName(bx.NAME);
  const last = normalizeName([bx.SECOND_NAME, bx.LAST_NAME].filter(Boolean).join(" "));

  const validPhones = base.allPhones.filter((p) => p.valid && p.e164) as (NormalizedPhone & {
    e164: string;
  })[];
  const [primaryPhone, ...restPhones] = validPhones.map((p) => p.e164);
  // A role address identifies a robot or a marketplace, not the client. The
  // rental portals are full of them — noreply@oneclickdrive.com sits on 41
  // EasyRent leads, mailer-daemon@… on 31 — and Twenty enforces a UNIQUE index
  // on the primary email, so writing them both fabricates the client's contact
  // details AND costs every record after the first (850 rejected on the
  // 2026-08-03 rental run). Kept out of the primary slot; a genuinely personal
  // address further down the list takes its place.
  const personalEmails = base.allEmails.filter((e) => !isRoleAddress(e));
  const [primaryEmail, ...restEmails] = personalEmails.length ? personalEmails : [];

  return {
    // Fall back to the joint display name when the split parts are empty but
    // the combined name isn't (single-field names like "Madonna").
    name: {
      firstName: first.display ?? (last.empty ? nameInfo.display : null),
      lastName: last.display ?? null,
    },
    emails: { primaryEmail: primaryEmail ?? null, additionalEmails: restEmails },
    phones: { primaryPhoneNumber: primaryPhone ?? null, additionalPhones: restPhones },
  };
}

function fullNameInfo(bx: BitrixCrmRecord): NormalizedName {
  return normalizeName([bx.NAME, bx.SECOND_NAME, bx.LAST_NAME].filter(Boolean).join(" "));
}

// ─── public normalizers ─────────────────────────────────────────────────────

export function normalizeBitrixContact(
  bx: BitrixCrmRecord,
  opts: NormalizeOptions = {},
): NormalizedContactRecord | null {
  if (!admissionGate(bx, opts)) return null;
  const base = baseFields(bx, opts);
  const nameInfo = fullNameInfo(bx);
  return {
    kind: "contact",
    ...base,
    person: personForm(bx, base, nameInfo),
    nameInfo,
    source: normalizeSource(bx.SOURCE_ID),
    comments: typeof bx.COMMENTS === "string" && bx.COMMENTS.trim() ? bx.COMMENTS : null,
  };
}

export function normalizeBitrixLead(
  bx: BitrixCrmRecord,
  opts: NormalizeOptions = {},
): NormalizedLeadRecord | null {
  if (!admissionGate(bx, opts)) return null;
  const base = baseFields(bx, opts);
  // A lead without a personal name still has its TITLE ("Website enquiry") —
  // that is a real label, not a placeholder, so it may fill the person name.
  const title = typeof bx.TITLE === "string" && bx.TITLE.trim() ? bx.TITLE.trim() : null;
  const personal = fullNameInfo(bx);
  const nameInfo = personal.empty ? normalizeName(title) : personal;
  return {
    kind: "lead",
    ...base,
    person: personForm(bx, base, nameInfo),
    nameInfo,
    title,
    statusId: typeof bx.STATUS_ID === "string" && bx.STATUS_ID ? bx.STATUS_ID : null,
    source: normalizeSource(bx.SOURCE_ID),
    comments: typeof bx.COMMENTS === "string" && bx.COMMENTS.trim() ? bx.COMMENTS : null,
  };
}

export function normalizeBitrixDeal(
  bx: BitrixCrmRecord,
  opts: NormalizeOptions = {},
): NormalizedDealRecord | null {
  if (!admissionGate(bx, opts)) return null;
  const base = baseFields(bx, opts);
  return {
    kind: "deal",
    ...base,
    name: typeof bx.TITLE === "string" && bx.TITLE.trim() ? bx.TITLE.trim() : null,
    stageId: typeof bx.STAGE_ID === "string" && bx.STAGE_ID ? bx.STAGE_ID : null,
    categoryId: typeof bx.CATEGORY_ID === "string" && bx.CATEGORY_ID ? bx.CATEGORY_ID : null,
  };
}

// ─── dedupe bridge ──────────────────────────────────────────────────────────

export type { NameScript };

/**
 * Flatten a normalized record into the shape dedupe.ts matches on: tail-9
 * phone keys come from VALID numbers only (an invalid "phone" must never
 * become a match key), the name key is the sortKey scoped by brandLine, and
 * the freshness signal is Bitrix's own DATE_MODIFY.
 */
export function toDedupeInput(
  rec: NormalizedContactRecord | NormalizedLeadRecord | NormalizedDealRecord,
): DedupeRecord {
  const name =
    rec.kind === "deal"
      ? (rec.name ?? "").toLowerCase() || null
      : rec.nameInfo.empty
        ? null
        : rec.nameInfo.sortKey;
  return {
    externalId: rec.externalId,
    externalIds: rec.externalIds,
    phones: rec.allPhones.filter((p) => p.valid && p.e164).map((p) => p.e164 as string),
    emails: rec.allEmails,
    name,
    brandLine: rec.brandLine,
    updatedAt: rec.sourceModifiedAt,
    customFields: rec.customFields,
  };
}

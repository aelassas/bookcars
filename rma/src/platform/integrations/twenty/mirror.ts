// Bitrix24 → Twenty CRM mirror pipeline (Task C).
//
// SOURCE OF TRUTH DECISION (agreed): the mirror reads OUR OWN platform DB
// (customer / lead / deal tables), NOT the Bitrix REST API. Those tables are
// already a fresh mirror of Bitrix — the incremental bitrix24 sync touches
// them every minute — so re-crawling three portals would only re-buy rate
// limits and webhook fragility to obtain the same rows slower. The normalize
// layer (platform/normalize/record.ts) still sees every record in
// BitrixCrmRecord shape, so all normalization verdicts (phone validity, junk
// names, cutoff) are produced by the same code a direct-Bitrix mirror would
// have used.
//
// IDEMPOTENCY: a record is upserted by its Twenty `externalId` (= our
// external_id, the Bitrix id). At run start we index the Twenty target object
// once (externalId → id, phoneTail9 → id); a hit becomes a PATCH, a miss a
// batched create (≤60 per call, sliced by TwentyClient). phoneTail9 is the
// fallback match so a lead and a contact that are the SAME PERSON (different
// Bitrix ids, same phone) converge on one Twenty person instead of
// duplicating. Two consecutive runs create zero new records — this is the
// acceptance criterion and is covered by mirror.test.ts.
//
// RESUMABILITY: after every source page the mirror checkpoints
// (entity, cursor = last external id, counts, status) into
// twenty_mirror_state. A crashed run resumes from the cursor with its counts
// intact; a COMPLETED entity (status "done") is re-run fresh — the upsert
// makes full passes idempotent, which is how scheduled re-mirrors pick up
// changes.

import { and, eq, gt, inArray, isNotNull, max, sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { customer, deal, lead, message, tenant, twentyMirrorState, user } from "@/platform/db/schema";
import { firstHttpUrl, mirrorSemanticValueCode, type BitrixCrmRecord } from "../bitrix24/mappings";
import {
  normalizeBitrixContact,
  normalizeBitrixDeal,
  normalizeBitrixLead,
} from "../../normalize/record";
import { normalizePhone, splitE164 } from "../../normalize/phone";
import { getTwentyClientForTenantSlug, type TwentyClient } from "./client";
import { phoneFromDealTitle, socialLinksField, waLinksField } from "./deal-link";
import { twentyInstanceForTenantSlug, type TwentyInstanceKey } from "./instance";
import { isManualStage, toInstanceStage } from "./stages";
import { WA_LEAD_SOURCE } from "@/modules/crm/lead-from-whatsapp";

// ─── Public types ───────────────────────────────────────────────────────────

export type MirrorEntity = "contacts" | "leads" | "deals";

export const MIRROR_ENTITIES: readonly MirrorEntity[] = ["contacts", "leads", "deals"];

/**
 * Default migration cutoff: records whose last Bitrix activity predates
 * 2024-01-01 are refused by the normalizer (before_cutoff). The portals carry
 * ~93k deals going back to 2017; the cutover contract is that Twenty starts
 * with the LIVE book, not the archive. The archive stays queryable in the
 * platform DB — it is deliberately not deleted, just not mirrored.
 *
 * The date is a business decision, measured on the take-auto portal
 * 2026-08-02 against honest Bitrix stamps (owner's call — 2.5 years of book):
 *   cutoff       leads    deals
 *   2026-01-01    5,243    9,071
 *   2025-01-01   22,009   38,787
 *   2024-01-01   40,719   68,318   ← chosen (~74% of the book)
 *   all          59,648   92,927
 */
export const DEFAULT_MIRROR_CUTOFF = new Date("2024-01-01T00:00:00.000Z");

/**
 * "No evidence this record was ever alive." Used where our schema has no
 * honest activity date at all (contacts, see createDrizzleSource) — the epoch
 * makes the ordinary cutoff gate refuse the row, whereas a null date would
 * ADMIT it (record.ts deliberately keeps dateless rows rather than guessing).
 */
const NO_ACTIVITY_STAMP = new Date(0);

/**
 * The dedupe/link key shared with the messaging layer and with Postgres'
 * `lead_phone_key_idx` — the last 9 digits of a phone. Junk (group JIDs,
 * @lid, repeated-digit placeholders) is refused by normalizePhone, so it can
 * never glue two strangers together.
 */
function phoneTail9(raw: string | null | undefined): string | null {
  return normalizePhone(raw).tail9;
}


/**
 * Tenant slug → business line written into Twenty's `brandLine`.
 *
 * The line boundary IS the Bitrix portal boundary — sales and rental were
 * always separate portals, so no second classification is invented here. The
 * map is explicit and closed: an unknown tenant returns null and its records
 * mirror WITHOUT a brand rather than guessing one, which fails closed (only
 * Executive sees them) instead of leaking a rental client into the sales list.
 */
const TENANT_BRAND_LINE: Record<string, string> = {
  "take-auto": "takeauto",
  cardiwan: "cardiwan",
  easyrent: "easyrent",
  // ETM is NOT a third rental company — it is the legal entity whose brand is
  // EasyRent (owner, 2026-08-04). The `etm` tenant is an empty shell (0
  // customers / leads / deals / messages) and the real book lives under
  // `easyrent`. Mapped to the same brand so that if anything is ever filed
  // under the legal name it joins its own company instead of forming a
  // permanently empty third one.
  etm: "easyrent",
};

export function brandLineForTenantSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return TENANT_BRAND_LINE[slug] ?? null;
}

/**
 * Lines whose BRAND differs from the tenant they are routed to.
 *
 * Owner, 2026-08-31: "Ali is CARDIWAN, he is not easyrent". His line carries
 * the slug `babek-rent-2` and sits on the `easyrent` tenant — both are
 * accidents of which handset was paired when (it was 971564048816 "Easy Rent
 * car rental" until that session died, then re-paired onto Ali's 971542445835
 * on 2026-08-29, keeping the old slug so history stayed attached).
 *
 * Why not simply move the tenant: the importer re-reads every observer file
 * each minute and dedupes on (tenant_id, external_message_id), so changing the
 * tenant would make all 8063 archived messages on that line look new and
 * DUPLICATE them into Cardiwan instead of moving them. Routing stays; the
 * brand is corrected here, which is what the card and the report actually read.
 */
const LINE_BRAND_OVERRIDE: Record<string, string> = {
  "babek-rent-2": "cardiwan", // Ali
};

/** The brand a card should carry: the line's own, else its tenant's. */
export function brandLineForLine(
  line: string | null | undefined,
  tenantSlug: string | null | undefined
): string | null {
  if (line && LINE_BRAND_OVERRIDE[line]) return LINE_BRAND_OVERRIDE[line];
  return brandLineForTenantSlug(tenantSlug);
}

/** node-postgres returns QueryResult; drizzle's typing hides the rows field. */
function sqlRows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

/** One source row, flattened identically for all three entities. */
export interface MirrorSourceRow {
  /** Bitrix id (our external_id column) — the upsert key in Twenty. */
  externalId: string;
  /** customer.name / lead.customer_name / deal.ref. */
  name: string | null;
  phone?: string | null;
  email?: string | null;
  /** Channel (whatsapp | instagram | …) — Bitrix SOURCE_ID vocabulary. */
  source?: string | null;
  notes?: string | null;
  /** Coarse status: lead.status / deal.status. */
  status?: string | null;
  /** Coarse kanban stage (deals only): inquiry | quote | contract | … */
  stage?: string | null;
  /** Bitrix lead id backing a deal (deals only) — drives pointOfContactId. */
  leadExternalId?: string | null;
  /** Deal owner email (platform user), used to resolve the Twenty
   *  workspaceMember for ownerId — the card shows WHO, not "mycrm-platform". */
  ownerEmail?: string | null;
  /** Exact Bitrix stage/status name (lead.stage_detail / deal.stage_detail). */
  stageDetail?: string | null;
  /** Deal value, AED (deals only). */
  value?: number | null;
  /**
   * Pre-extracted social profile URL (contacts only — mined from the Bitrix
   * WEB multi-field at sync time). Projected as the person's socialProfile
   * LINKS field.
   */
  socialUrl?: string | null;
  /**
   * Raw Bitrix SOURCE_DESCRIPTION (leads/deals) — on social-sourced records
   * often the profile URL. The mirror mines the URL out (firstHttpUrl): onto
   * the person for leads, onto the MATCHED person for deals.
   */
  sourceDescription?: string | null;
  /**
   * Deal COMMENTS verbatim (deals only) — the BitrixGPT summary of client
   * needs. Projected as a NOTE on the opportunity (see the deals side-effect
   * pass in runMirror), never into a field.
   */
  sourceComments?: string | null;
  /** Loss-reason enumeration LABEL (deals only), Russian — the SELECT match key. */
  lossReason?: string | null;
  /** Interested car model(s), "; "-joined labels (deals only) — TEXT field. */
  carModels?: string | null;
  /** Language-segment label (deals only) — propagated onto the matched person. */
  languageSegment?: string | null;
  /** IS_RETURN_CUSTOMER (deals only) — propagated onto the matched person. */
  returnCustomer?: boolean | null;
  /** MOVED_TIME (deals only) — with stageDetail/previousStageDetail, one stageEvent. */
  sourceMovedAt?: Date | null;
  /** MOVED_BY_ID, raw Bitrix user id (the platform keeps no Bitrix-user name table). */
  sourceMovedById?: string | null;
  /** Resolved NAME of PREVIOUS_STAGE_ID (deals only) — stageEvent.fromStage. */
  previousStageDetail?: string | null;
  /**
   * Business line the record belongs to ("takeauto" / "cardiwan" /
   * "easyrent"). Every role's row-level predicate in Twenty reads this, so a
   * record without it is invisible to everyone except Executive. Null when the
   * tenant maps to no brand — see brandLineForTenantSlug.
   */
  brandLine?: string | null;
  /**
   * Best available HONEST "last real activity" stamp — drives the cutoff.
   * Per entity the source picks the most honest signal our schema carries
   * (deals: Bitrix's own DATE_MODIFY; contacts: last message activity, else
   * created_at; leads: last deal activity, else Bitrix DATE_CREATE) — never
   * updated_at, which the incremental sync bumps every minute and which made
   * all 52,530 contacts look fresh in the first import.
   */
  modifiedAt: Date | null;
}

/** Narrow DB surface — the drizzle adapter below, an in-memory fake in tests. */
export interface MirrorSource {
  list(
    entity: MirrorEntity,
    q: { afterExternalId: string | null; limit: number }
  ): Promise<MirrorSourceRow[]>;
}

export interface MirrorStateRow {
  entity: MirrorEntity;
  cursor: string | null;
  status: "running" | "done";
  counts: MirrorCounts;
}

/** Narrow state surface — twenty_mirror_state in prod, a Map in tests. */
export interface MirrorStateStore {
  load(entity: MirrorEntity): Promise<MirrorStateRow | null>;
  save(row: MirrorStateRow): Promise<void>;
  /** Run `fn` under a session-scoped advisory lock; false if already held. */
  withLock?(fn: () => Promise<boolean>): Promise<boolean>;
}

export interface MirrorCounts {
  /** Source rows read (after resume cursor). */
  read: number;
  /** Rows the normalizer admitted. */
  admitted: number;
  /** Twenty records created (or that WOULD be created in dryRun). */
  created: number;
  /** Records Twenty rejected (validation etc.) — isolated per record so one
   * poisoned row can't stop the migration (audit H4); the first error is kept
   * in firstError for the report. */
  failed: number;
  firstError?: string;
  /**
   * Rejection reasons, tallied by KIND rather than kept as one sample.
   * `firstError` alone is a trap: it is set once and survives a resume, so a
   * run can collect hundreds of new failures while still displaying the very
   * first message from hours earlier — which is exactly how the 2026-08-02
   * leads run hid whatever was rejecting 222 records behind a stale phone
   * error. Record ids are stripped so the same fault collapses into one line.
   */
  failedReasons?: Record<string, number>;
  /** Twenty records patched (or that WOULD be patched in dryRun). */
  updated: number;
  /**
   * BitrixGPT summary notes projected onto opportunities (deals only).
   * Idempotent by note title (`BitrixGPT · <scopedExternalId>`) — a second run
   * creates none.
   */
  notes?: number;
  /** stageEvent rows written from MOVED_* (deals only), idempotent by externalId. */
  stageEvents?: number;
  /**
   * People patched with deal-carried traits (languageSegment / returnCustomer /
   * socialProfile) during the deals pass.
   */
  personEnriched?: number;
  /** Admission refusals, by reason (currently: before_cutoff). */
  dropped: Record<string, number>;
  /** Normalize verdicts on ADMITTED rows: phone:<reason>, empty_name. */
  verdicts: Record<string, number>;
}

export interface MirrorReport {
  skipped?: string;
  since: string;
  dryRun: boolean;
  suppressNotify: boolean;
  entities: Partial<Record<MirrorEntity, MirrorCounts>>;
}

export interface MirrorOptions {
  /** Cutoff for the normalizer. Default DEFAULT_MIRROR_CUTOFF. */
  since?: Date;
  /** Subset of entities to mirror. Default all three. */
  entities?: MirrorEntity[];
  /** Global cap on source rows READ — used for trial runs and tests. */
  maxRecords?: number;
  /** Compute everything, write nothing (no Twenty writes, no state writes). */
  dryRun?: boolean;
  /**
   * Brand this run belongs to. Scopes phone matching so a lead from one portal
   * cannot patch — and re-brand — a person belonging to another. Resolved from
   * the tenant by mirrorBitrixToTwenty; leave undefined only in tests that do
   * not care about brands.
   */
  brandLine?: string | null;
  /**
   * Notification contract — default TRUE, and the mirror itself never
   * notifies anyone. It exists as an explicit flag because the FIRST run
   * pushes ~84k historical records: any "a record was created" hook wired to
   * Telegram (the platform's usual alerting channel) would flood the team
   * with years of dead leads. onRecord below fires ONLY when a caller passes
   * suppressNotify: false — opting into notifications must be deliberate.
   */
  suppressNotify?: boolean;
  /** Per-record hook — invoked only when suppressNotify === false. */
  onRecord?: (e: {
    entity: MirrorEntity;
    externalId: string;
    action: "created" | "updated";
  }) => void | Promise<void>;
  /** Twenty client override (tests, scripts). Default: env singleton. */
  client?: TwentyClient;
  /**
   * Which deployment this run writes to. Decides the opportunity stage
   * vocabulary — the rental board runs Babek's funnel, the sales board runs
   * Twenty's stock one, and writing one instance's values into the other is
   * rejected by Postgres on every single deal. Resolved from the tenant slug
   * by mirrorBitrixToTwenty; defaults to the sales instance.
   */
  instance?: TwentyInstanceKey;
}

type PlatformDb = typeof platformDb;

// Upsert key namespace (audit C1): contacts/leads/deals use INDEPENDENT Bitrix
// id sequences — a bare externalId collides (51k overlaps live) and makes a
// lead overwrite the contact's person. The namespaced key is what lands in
// Twenty and what the per-run index matches on; the raw id stays for cursors.
//
// The BRAND is part of the key for the same reason, one level up: each portal
// numbers its records from scratch, so contact 12345 exists in all three and
// means three different people. Measured 2026-08-03 against the take-auto ids
// already in Twenty: 1,264 of Cardiwan's 1,783 contacts collide (71%) and
// 20,368 of EasyRent's 21,994 (93%). Without the brand in the key, mirroring
// the rental portals would have hijacked and re-branded 21,632 sales
// contacts — reported as "updated", with nothing in the counts to show it.
//
// takeauto keys were written before this and stay unprefixed by their brand
// being backfilled in (see scripts/backfill-brand-external-id.sql); a null
// brand also stays unprefixed, which is safe because a record with no brand is
// not mirrored from any portal we run.
function scopedExternalId(entity: MirrorEntity, raw: string, brandLine?: string | null): string {
  const kind = entity === "deals" ? "deal" : entity === "leads" ? "lead" : "contact";
  return brandLine ? `${brandLine}/${kind}:${raw}` : `${kind}:${raw}`;
}

// ─── Entity config ──────────────────────────────────────────────────────────

const ENTITY_CONFIG: Record<
  MirrorEntity,
  { objectPath: "people" | "opportunities"; externalSource: string }
> = {
  // Our `customer` table = Bitrix contacts → Twenty people.
  contacts: { objectPath: "people", externalSource: "bitrix24" },
  // Bitrix leads also become Twenty people (Twenty has no lead object); the
  // "lead:bitrix24" source tag is what tells them apart from contacts — and
  // lets reconcileCounts report each side separately.
  leads: { objectPath: "people", externalSource: "lead:bitrix24" },
  deals: { objectPath: "opportunities", externalSource: "bitrix24" },
};

/** Source rows per checkpoint — small enough that a crash re-does little. */
const SOURCE_PAGE = 200;

// ─── Record planning (pure) ─────────────────────────────────────────────────

export interface PlannedRecord {
  externalId: string;
  objectPath: "people" | "opportunities";
  payload: Record<string, unknown>;
  /** Bitrix lead id backing the deal (for pointOfContactId resolution). */
  leadExternalId?: string | null;
  /** Pre-computed tail9 match key, null when the record has no valid phone. */
  phoneTail9: string | null;
  admitted: boolean;
  /** Set when admitted=false. */
  dropReason: string | null;
  /** Verdict keys for admitted rows ("phone:too_short", "empty_name"). */
  verdictKeys: string[];
}

/**
 * Rebuild a BitrixCrmRecord from our flattened mirror row so the normalize
 * layer can do its job unchanged. The platform tables store ONE phone/email
 * string and ONE full-name string — they are re-wrapped into Bitrix's
 * multi-field arrays here rather than duplicating normalization logic.
 */
function toBitrixRecord(entity: MirrorEntity, row: MirrorSourceRow): BitrixCrmRecord {
  // Twenty keeps first/last name apart while our tables keep one blob.
  // Splitting on the first space gives personForm() real parts to normalize;
  // single-word names stay whole via record.ts's display-name fallback.
  const parts = (row.name ?? "").trim().split(/\s+/).filter(Boolean);
  const [first, ...rest] = parts;
  const bx: BitrixCrmRecord = {
    ID: row.externalId,
    NAME: first,
    LAST_NAME: rest.length ? rest.join(" ") : undefined,
    PHONE: row.phone ? [{ VALUE: row.phone }] : [],
    EMAIL: row.email ? [{ VALUE: row.email }] : [],
    SOURCE_ID: row.source ?? undefined,
    DATE_MODIFY: row.modifiedAt ? row.modifiedAt.toISOString() : undefined,
  };
  if (entity !== "deals") {
    bx.COMMENTS = row.notes ?? undefined;
  }
  if (entity === "leads") {
    bx.STATUS_ID = row.status ?? undefined;
    bx.TITLE = row.name ?? undefined;
  }
  if (entity === "deals") {
    bx.TITLE = row.name ?? undefined;
    bx.STAGE_ID = row.stageDetail ?? row.stage ?? undefined;
  }
  return bx;
}

/**
 * Twenty's PHONES composite: national digits + calling code (+ ISO country
 * when the calling code identifies one). Twenty validates the NUMBER field
 * with libphonenumber, so the country code must be handed over SEPARATELY —
 * sending full international digits as the number is what rejected 2,209
 * contacts on 2026-08-01 and buried the country code inside the national
 * field of 18,372 more. An unrecognised calling code falls back to bare
 * digits: still imperfect, but never a guessed country.
 */
export function twentyPhoneFields(e164: string | null): Record<string, unknown> {
  if (!e164) return {};
  const split = splitE164(e164);
  if (!split) return { primaryPhoneNumber: e164.replace(/^\+/, "") };
  return {
    primaryPhoneNumber: split.nationalNumber,
    primaryPhoneCallingCode: split.callingCode,
    ...(split.regionCode ? { primaryPhoneCountryCode: split.regionCode } : {}),
  };
}

/**
 * Twenty default opportunity stages on the live workspace (verified
 * 2026-08-01): NEW, SCREENING, MEETING, PROPOSAL, CUSTOMER. There is NO lost
 * stage — the first import's `LOST`/`WON` values were rejected wholesale
 * ("Invalid value \"LOST\" for field \"stage\"", 2,031 of 2,375 deals).
 * null = omit the stage field from the payload and leave Twenty's default.
 */
const OPEN_STAGE_MAP: Record<string, string> = {
  inquiry: "NEW",
  quote: "SCREENING",
  contract: "MEETING",
  handover: "PROPOSAL",
};

function mapOpportunityStage(row: MirrorSourceRow): string | null {
  // Terminal status wins over everything — a won deal in an early funnel
  // column is still won.
  if (row.status === "won") return "CUSTOMER";
  // A lost deal is NOT a CUSTOMER. The workspace had no lost column until
  // 2026-08-03, so these used to be omitted — and Twenty's default put 58,259
  // long-dead deals in front of the team as "New". The column exists now.
  if (row.status === "lost") return "LOST";
  // Prefer the fine-grained Bitrix stage NAME when it is informative; our
  // coarse `stage` column was imported with weak fidelity (the Bitrix import
  // left `type` uniformly 'rent', stage mapping was best-effort).
  const detail = (row.stageDetail ?? "").toLowerCase();
  if (/согласован|договор|контракт|contract|оплат/.test(detail)) return "PROPOSAL";
  if (/кп|предлож|просч|quote|proposal/.test(detail)) return "PROPOSAL";
  // Closed without a terminal status: still not a CUSTOMER (that would
  // fabricate revenue), but "closed" means the work stopped, so it belongs in
  // the lost column rather than back at the top of the funnel.
  if (row.stage === "closed") return "LOST";
  return OPEN_STAGE_MAP[row.stage ?? ""] ?? "NEW";
}

/**
 * Normalize one source row and plan the Twenty payload. Pure — shared by the
 * mirror (which writes) and reconcile (which only counts).
 */
export function planMirrorRecord(
  entity: MirrorEntity,
  row: MirrorSourceRow,
  since: Date,
  /**
   * Which deployment this payload is bound for — it decides the stage
   * vocabulary. Defaults to the sales instance so the existing callers
   * (reconcile, tests) keep the stock funnel they were written against.
   */
  instance: TwentyInstanceKey = "default",
  /** Twenty workspaceMember id for this row's owner (per-instance lookup done
   *  by the caller). Omitted when unknown — never blanked over a set owner. */
  ownerMemberId?: string | null
): PlannedRecord {
  const cfg = ENTITY_CONFIG[entity];
  const bx = toBitrixRecord(entity, row);
  const base = {
    externalId: scopedExternalId(entity, row.externalId, row.brandLine),
    objectPath: cfg.objectPath,
    phoneTail9: null as string | null,
  };
  const dropped = (reason: string): PlannedRecord => ({
    ...base,
    payload: {},
    admitted: false,
    dropReason: reason,
    verdictKeys: [],
  });

  if (entity === "deals") {
    const rec = normalizeBitrixDeal(bx, { cutoff: since });
    if (!rec) return dropped("before_cutoff");
    // The decision tree speaks the stock vocabulary; the instance decides what
    // that means on ITS board. A stage with no equivalent is omitted, never
    // guessed — the same contract as an unmappable row.
    const stage = toInstanceStage(instance, mapOpportunityStage(row));
    // The deal's contact number. `deal.lead_id` is NULL for all 96,137 mirrored
    // deals (measured 2026-08-07) — the Bitrix import never linked the two ID
    // spaces — so the only phone a deal actually carries is the one Bitrix put
    // in its TITLE ("Новый лид по звонку с 971502222073 из Callgear",
    // "Гость - 971566997218 Insta Easy Rent"). That title is what fills
    // phoneTail9 here, which is in turn the ONLY key by which a WhatsApp
    // conversation can find its deal. row.phone is preferred and stays first
    // so that the day lead_id is populated, this needs no second thought.
    const tail = phoneTail9(row.phone) ?? phoneTail9(phoneFromDealTitle(row.name));
    const payload: Record<string, unknown> = {
      name: rec.name ?? `BX-${row.externalId}`,
      // null = no honest stage exists (lost deals, status-less closures) —
      // the field is OMITTED, leaving Twenty's default, rather than guessed.
      ...(stage ? { stage } : {}),
      externalId: scopedExternalId(entity, row.externalId, row.brandLine),
      externalSource: cfg.externalSource,
      stageDetail: row.stageDetail ?? row.stage ?? null,
      ...(tail ? { phoneTail9: tail } : {}),
      // The clickable WhatsApp deep link on the card itself. Built from the FULL
      // number, not the 9-digit tail: the link needs the country code to dial.
      ...waLinksField(row.phone ?? phoneFromDealTitle(row.name)),
      // See the contacts/leads payload below — same rule, same reason.
      ...(row.brandLine ? { brandLine: row.brandLine } : {}),
      // The Bitrix semantic fields the original import dropped, as ASCII
      // option codes (Twenty rejects Cyrillic option values — verified live);
      // the Russian text lives in the field's option labels. carModels is
      // TEXT and keeps the raw Russian. Omitted when absent, never blanked
      // over a hand-set value.
      ...(row.lossReason ? { lossReason: mirrorSemanticValueCode(row.lossReason) } : {}),
      ...(row.carModels ? { carModels: row.carModels } : {}),
      // The responsible person on the card — without this every card reads
      // "mycrm-platform" and the desk can't see whose deal it is.
      ...(ownerMemberId ? { ownerId: ownerMemberId } : {}),
    };
    // Twenty CURRENCY composite; our deal.value is integer AED.
    if (row.value !== null && row.value !== undefined && row.value > 0) {
      payload.amount = { amountMicros: row.value * 1_000_000, currencyCode: "AED" };
    }
    // NOTE: `phoneTail9` is deliberately NOT copied onto the PlannedRecord's
    // match key. That key drives the upsert index, and a deal is identified by
    // its Bitrix id alone — matching deals by phone would collapse every deal
    // a repeat customer ever had into one record.
    return { ...base, payload, admitted: true, dropReason: null, verdictKeys: [], leadExternalId: row.leadExternalId ?? null };
  }

  const rec =
    entity === "contacts"
      ? normalizeBitrixContact(bx, { cutoff: since })
      : normalizeBitrixLead(bx, { cutoff: since });
  if (!rec) return dropped("before_cutoff");

  // Admission refusal: a record with NEITHER a name NOR a usable phone can
  // never be reached or even recognised — 6,883 of these landed in the first
  // run as pure junk. A name OR a valid phone is enough to pass (the
  // phone-fallback name below still covers nameless-but-reachable people).
  const primary = rec.allPhones.find((p) => p.valid && p.e164);
  if (rec.nameInfo.empty && !primary) return dropped("no_identity");

  const verdictKeys: string[] = [];
  for (const p of rec.allPhones) {
    if (!p.valid && p.reason) verdictKeys.push(`phone:${p.reason}`);
  }
  if (rec.nameInfo.empty) verdictKeys.push("empty_name");

  // NOT named phoneTail9: that is the module-level helper, and a local of the
  // same name shadows it across this whole function — which is what put the
  // deals branch above in a temporal dead zone.
  const personTail9 = primary?.tail9 ?? null;
  // A record with NO usable name still migrates (it may carry the only phone
  // number of a real client) — but it is labelled by its phone/id, NEVER
  // "Unknown" (that placeholder cost a manual dedupe of thousands once).
  const fallbackName = personTail9 ? `+…${personTail9}` : `BX-${rec.externalId}`;

  const payload: Record<string, unknown> = {
    name: {
      firstName: rec.person.name.firstName ?? fallbackName,
      lastName: rec.person.name.lastName,
    },
    emails: {
      primaryEmail: rec.person.emails.primaryEmail,
      additionalEmails: rec.person.emails.additionalEmails,
    },
    phones: {
      ...twentyPhoneFields(primary?.e164 ?? null),
      additionalPhones: rec.allPhones
        .filter((p) => p.valid && p.e164)
        .slice(1)
        .map((p) => p.e164 as string),
    },
    externalId: scopedExternalId(entity, row.externalId, row.brandLine),
    externalSource: cfg.externalSource,
    // The exact Bitrix status/funnel name survives verbatim — Twenty's coarse
    // stage SELECT cannot hold "Качественный лид", and reconciliation reads
    // this column to prove the funnel made it across.
    stageDetail: entity === "leads" ? (row.stageDetail ?? row.status ?? null) : null,
    // The LOCAL, not the module-level phoneTail9() helper — a `phoneTail9,`
    // shorthand here bound the FUNCTION, which JSON.stringify silently dropped,
    // so Twenty people never received the field (the stitch key deal-link.ts
    // and the relays filter on).
    phoneTail9: personTail9,
    // Which business line this record belongs to — the key every role's
    // row-level predicate reads. Omitted rather than blanked when unknown:
    // an empty string would match no predicate AND overwrite a value someone
    // set by hand.
    ...(row.brandLine ? { brandLine: row.brandLine } : {}),
    // The social profile link — pre-mined from WEB[] on contacts, mined from
    // raw SOURCE_DESCRIPTION on leads. LINKS composite so it renders clickable;
    // absent when there is no URL (never clears a value someone set by hand).
    ...socialLinksField(row.socialUrl ?? firstHttpUrl(row.sourceDescription)),
  };
  return { ...base, payload, phoneTail9: personTail9, admitted: true, dropReason: null, verdictKeys };
}

// ─── Twenty-side index (idempotent upsert) ──────────────────────────────────

export interface TwentyRecordIndex {
  byExternalId: Map<string, string>;
  byPhoneTail9: Map<string, string>;
  /**
   * Twenty id → the stage it is in RIGHT NOW. Only populated for
   * opportunities, and only so a patch can tell "the mirror put it there"
   * from "a human dragged it there" — see the manual-stage guard below.
   */
  stageById: Map<string, string>;
}

/**
 * One pass over the Twenty target object building the upsert index. Indexing
 * ONCE per run (instead of a REST filter lookup per record) keeps an 84k-row
 * migration at ~1 request per 60 records read + 1 per 60 created, far under
 * the 100 rpm budget — per-record lookups would double the request count.
 */
export async function buildTwentyIndex(
  client: TwentyClient,
  objectPath: "people" | "opportunities",
  brandLine?: string | null
): Promise<TwentyRecordIndex> {
  const byExternalId = new Map<string, string>();
  const byPhoneTail9 = new Map<string, string>();
  const stageById = new Map<string, string>();
  for await (const rec of client.listAll<Record<string, unknown>>(objectPath)) {
    // Soft-deleted Twenty records (deletedAt set) stay readable through the
    // API — indexing them turns a cleanup-and-reimport into patches against
    // the trash instead of fresh creates.
    if (rec.deletedAt) continue;
    const id = typeof rec.id === "string" ? rec.id : null;
    if (!id) continue;
    if (typeof rec.externalId === "string" && rec.externalId) {
      byExternalId.set(rec.externalId, id);
    }
    if (typeof rec.stage === "string" && rec.stage) stageById.set(id, rec.stage);
    // Phone matching is scoped to ONE brand. The three portals share 1,346
    // phone numbers (measured 2026-08-03), so a workspace-wide tail index
    // would make a Cardiwan lead patch the take-auto person of the same
    // number — re-branding it to cardiwan and deleting it from the sales
    // team's world. The same human being a client of two brands is two
    // records here, which is the only shape the visibility model can hold.
    //
    // externalId matching is NOT scoped: it is already namespaced per entity
    // and carries the Bitrix id, so it cannot collide across portals.
    if (brandLine !== undefined && rec.brandLine !== brandLine) continue;
    // First writer wins on tail collisions — two Twenty records sharing a
    // phone are a pre-existing duplicate, and silently re-keying both to one
    // source row would hide it.
    if (typeof rec.phoneTail9 === "string" && rec.phoneTail9 && !byPhoneTail9.has(rec.phoneTail9)) {
      byPhoneTail9.set(rec.phoneTail9, id);
    }
  }
  return { byExternalId, byPhoneTail9, stageById };
}

// ─── Deal side effects: summary note, stageEvent audit, person traits ───────
// Part of the Bitrix deal content is not an opportunity FIELD: the BitrixGPT
// summary belongs on a Twenty NOTE, the MOVED_* audit on a stageEvent row,
// and the language/return-customer/social traits on the PERSON. All three are
// produced by the deals pass of runMirror and are idempotent by their own
// keys, so a full re-run adds nothing the second time — the same acceptance
// criterion as the record upsert.

/** Note title = the note's idempotency key (notes have no externalId field). */
export function aiSummaryNoteTitle(scopedExternalId: string): string {
  return `BitrixGPT · ${scopedExternalId}`;
}

/** stageEvent externalId — `deal:<id>:<MOVED_TIME>` per the audit spec (brand-scoped). */
export function stageEventExternalId(scopedExternalId: string, movedAt: Date): string {
  return `${scopedExternalId}:${movedAt.toISOString()}`;
}

/** Titles of all live notes — the mirror creates a summary note only when its title is absent. */
export async function buildNoteTitleIndex(client: TwentyClient): Promise<Set<string>> {
  const titles = new Set<string>();
  for await (const rec of client.listAll<Record<string, unknown>>("notes")) {
    // Soft-deleted rows stay readable through the API — indexing them would
    // pin the title forever and block the re-creation of a trashed note.
    if (rec.deletedAt) continue;
    if (typeof rec.title === "string" && rec.title) titles.add(rec.title);
  }
  return titles;
}

/** externalIds of all live stageEvent rows — one row per observed transition, ever. */
export async function buildStageEventIndex(client: TwentyClient): Promise<Set<string>> {
  const keys = new Set<string>();
  for await (const rec of client.listAll<Record<string, unknown>>("stageEvents")) {
    if (rec.deletedAt) continue;
    if (typeof rec.externalId === "string" && rec.externalId) keys.add(rec.externalId);
  }
  return keys;
}

/** Workspace member id by lowercase email — resolves a platform user's deal ownership. */
export async function buildOwnerIndex(client: TwentyClient): Promise<Map<string, string>> {
  const byEmail = new Map<string, string>();
  for await (const rec of client.listAll<Record<string, unknown>>("workspaceMembers")) {
    if (rec.deletedAt) continue;
    const email = typeof rec.userEmail === "string" ? rec.userEmail.toLowerCase() : null;
    const id = typeof rec.id === "string" ? rec.id : null;
    if (email && id) byEmail.set(email, id);
  }
  return byEmail;
}

// ─── Counts helpers ─────────────────────────────────────────────────────────

function emptyCounts(): MirrorCounts {
  return { read: 0, admitted: 0, created: 0, updated: 0, failed: 0, dropped: {}, verdicts: {} };
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

/** Tolerate counts JSON written by an older/partial run. */
function reviveCounts(raw: unknown): MirrorCounts {
  const c = (raw ?? {}) as Partial<MirrorCounts>;
  return {
    read: c.read ?? 0,
    admitted: c.admitted ?? 0,
    created: c.created ?? 0,
    updated: c.updated ?? 0,
    failed: c.failed ?? 0,
    firstError: c.firstError,
    failedReasons: { ...(c.failedReasons ?? {}) },
    dropped: { ...(c.dropped ?? {}) },
    verdicts: { ...(c.verdicts ?? {}) },
    notes: c.notes,
    stageEvents: c.stageEvents,
    personEnriched: c.personEnriched,
  };
}

/**
 * Collapse a Twenty rejection into a stable KIND so the tally stays readable.
 * Ids, phone numbers and other per-record values are stripped — otherwise
 * every failure is its own unique "reason" and the tally is just a log.
 */
/** Twenty's rejection when a UNIQUE index (primary email) is already taken. */
function isDuplicateEntry(e: unknown): boolean {
  return /duplicate entry/i.test((e as Error)?.message ?? "");
}

/**
 * Remove the emails from a planned payload, in place. Returns false when
 * there was nothing to remove — in which case the duplicate was about some
 * other column and retrying would just fail again.
 */
function stripEmails(payload: Record<string, unknown>): boolean {
  const emails = payload.emails as { primaryEmail?: string | null } | undefined;
  if (!emails?.primaryEmail) return false;
  payload.emails = { primaryEmail: null, additionalEmails: [] };
  return true;
}

function failureKind(message: string): string {
  const m = message
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>")
    .replace(/\b\d{6,}\b/g, "<number>");
  const code = m.match(/"code"\s*:\s*"([A-Z_]+)"/)?.[1];
  const msg = m.match(/"messages"\s*:\s*\["([^"]+)"/)?.[1];
  if (code && msg) return `${code}: ${msg}`;
  if (code) return code;
  return m.slice(0, 120);
}

// ─── Core pipeline (DB-agnostic, fully testable) ────────────────────────────

export async function runMirror(
  source: MirrorSource,
  state: MirrorStateStore,
  client: TwentyClient,
  opts: MirrorOptions = {}
): Promise<MirrorReport> {
  const since = opts.since ?? DEFAULT_MIRROR_CUTOFF;
  const entities = opts.entities ?? [...MIRROR_ENTITIES];
  const dryRun = opts.dryRun ?? false;
  const instance = opts.instance ?? "default";
  const suppressNotify = opts.suppressNotify ?? true;
  const maxRecords = opts.maxRecords ?? Number.POSITIVE_INFINITY;

  const report: MirrorReport = { since: since.toISOString(), dryRun, suppressNotify, entities: {} };

  // Concurrency guard (audit H3): pg-boss can re-queue while the first run
  // is still alive, and a manual run overlaps the worker — with no unique
  // constraint on externalId in Twenty that means silent duplicates. A
  // session-level advisory lock per tenant makes the second runner skip.
  if (!dryRun && state.withLock) {
    const locked = await state.withLock(async () => true);
    if (!locked) {
      for (const entity of entities) report.entities[entity] = emptyCounts();
      report.skipped = "another mirror run holds the lock for this tenant";
      return report;
    }
  }

  // Both contacts and leads upsert into Twenty `people`, so the index is
  // built once and SHARED — and updated as we create, so a person created by
  // the contacts pass is matched (not duplicated) by the leads pass. The
  // deals pass needs it too: deal-carried person traits (languageSegment /
  // returnCustomer / socialProfile) and the summary note's person target all
  // resolve through it, so it is built for deals-only runs as well.
  const needsPeople = entities.some((e) => e !== "deals") || entities.includes("deals");
  const peopleIndex = needsPeople
    ? await buildTwentyIndex(client, "people", opts.brandLine)
    : null;
  const opportunityIndex = entities.includes("deals")
    ? await buildTwentyIndex(client, "opportunities", opts.brandLine)
    : null;

  // Side-effect key sets for the deals pass. The summary note and the
  // stageEvent are SEPARATE Twenty objects, not opportunity fields, so their
  // idempotency needs its own index each — crawled once per run, like the
  // record indexes above.
  const noteTitles = entities.includes("deals") ? await buildNoteTitleIndex(client) : null;
  const stageEventKeys = entities.includes("deals") ? await buildStageEventIndex(client) : null;

  // Owner resolution: platform user email → this instance's workspaceMember id.
  // Cards without an owner read "mycrm-platform" — the desk needs WHOSE it is.
  const ownerIndex = entities.includes("deals") ? await buildOwnerIndex(client) : null;

  let totalRead = 0;

  for (const entity of entities) {
    const cfg = ENTITY_CONFIG[entity];
    const index = entity === "deals" ? opportunityIndex : peopleIndex;
    if (!index) continue;

    // Resume semantics: a "running" row means the last pass died mid-entity —
    // continue from its cursor WITH its counts. A "done" row means the entity
    // completed; scheduled re-runs start fresh and rely on upsert idempotency.
    const prior = dryRun ? null : await state.load(entity);
    let cursor = prior?.status === "running" ? prior.cursor : null;
    const counts = prior?.status === "running" ? reviveCounts(prior.counts) : emptyCounts();
    report.entities[entity] = counts;

    let hitCap = false;
    for (;;) {
      const rows = await source.list(entity, { afterExternalId: cursor, limit: SOURCE_PAGE });
      if (rows.length === 0) break;

      const creates: { planned: PlannedRecord }[] = [];
      const patches: { id: string; planned: PlannedRecord }[] = [];
      // Admitted deal rows of this page, kept for the side-effect pass that
      // runs after the upsert flush (notes / stageEvents / person traits).
      const admittedDeals: { row: MirrorSourceRow; planned: PlannedRecord }[] = [];

      for (const row of rows) {
        if (totalRead >= maxRecords) {
          hitCap = true;
          break;
        }
        totalRead++;
        counts.read++;
        cursor = row.externalId;

        const planned = planMirrorRecord(
          entity,
          row,
          since,
          instance,
          entity === "deals" && row.ownerEmail
            ? ownerIndex?.get(row.ownerEmail.toLowerCase()) ?? null
            : null
        );
        if (!planned.admitted) {
          bump(counts.dropped, planned.dropReason ?? "rejected");
          continue;
        }
        counts.admitted++;
        for (const key of planned.verdictKeys) bump(counts.verdicts, key);
        if (entity === "deals") admittedDeals.push({ row, planned });

        // Deals get their person link from the SHARED people index (audit:
        // opportunities were dangling without pointOfContactId).
        if (entity === "deals" && planned.leadExternalId && peopleIndex) {
          const contactId =
            peopleIndex.byExternalId.get(`lead:${planned.leadExternalId}`) ??
            peopleIndex.byExternalId.get(`contact:${planned.leadExternalId}`);
          if (contactId && !planned.payload.pointOfContactId) {
            planned.payload.pointOfContactId = contactId;
          }
        }
        const existingId =
          index.byExternalId.get(planned.externalId) ??
          (planned.phoneTail9 ? index.byPhoneTail9.get(planned.phoneTail9) : undefined);
        if (existingId) {
          // A deal sitting in a stage the mirror could never have written is
          // one a human moved. Bitrix has no signal for "cars with customer"
          // or "deposit refunded", so re-asserting a derived stage here would
          // drag Babek's card back to "new lead" on the next minute's beat and
          // make the board look like it forgets every drag. Everything else in
          // the payload still patches — only the stage is left alone.
          if (entity === "deals" && isManualStage(instance, index.stageById.get(existingId) ?? null)) {
            delete planned.payload.stage;
          }
          patches.push({ id: existingId, planned });
        } else {
          creates.push({ planned });
        }
      }

      if (!dryRun) {
        for (const { id, planned } of patches) {
          try {
            await client.patch(`${cfg.objectPath}/${id}`, planned.payload);
            counts.updated++;
          } catch (e) {
            counts.failed++;
            counts.firstError ??= `${planned.externalId}: ${(e as Error).message.slice(0, 200)}`;
            bump((counts.failedReasons ??= {}), `patch/${failureKind((e as Error).message)}`);
            continue;
          }
          // A phone-matched record now carries our externalId — make it
          // findable by the primary key from here on.
          index.byExternalId.set(planned.externalId, id);
          if (!suppressNotify && opts.onRecord) {
            await opts.onRecord({ entity, externalId: planned.externalId, action: "updated" });
          }
        }
        if (creates.length > 0) {
          // A created record goes back into the shared index so a LATER row
          // in the same run (same person, different Bitrix id) becomes a
          // patch, not a duplicate. Echoes are matched by externalId, never
          // by position: the poison fallback below drops entries, and a
          // positionally mis-aligned id is worse than none — it hides the
          // real record (duplicate on the next matching row) AND retargets
          // later patches onto the wrong person. Live proof: the first full
          // import made ~105k people from ~76k source customers this way.
          const registerCreated = (planned: PlannedRecord, id: string) => {
            index.byExternalId.set(planned.externalId, id);
            if (planned.phoneTail9 && !index.byPhoneTail9.has(planned.phoneTail9)) {
              index.byPhoneTail9.set(planned.phoneTail9, id);
            }
          };
          try {
            const plannedByExternalId = new Map(
              creates.map((c) => [c.planned.externalId, c.planned])
            );
            const created = await client.batchCreate(
              cfg.objectPath,
              creates.map((c) => c.planned.payload)
            );
            counts.created += created.length;
            for (const rec of created) {
              const echo = rec as Record<string, unknown> | undefined;
              const id = typeof echo?.id === "string" ? echo.id : null;
              const planned =
                typeof echo?.externalId === "string"
                  ? plannedByExternalId.get(echo.externalId)
                  : undefined;
              // An id-less or unmatched echo simply means the NEXT run
              // re-matches the record by externalId from Twenty.
              if (id && planned) registerCreated(planned, id);
            }
          } catch (batchErr) {
            // One poisoned record must not sink the other 59 (audit H4, live
            // proof: an invalid phone failed the whole batch). Fall back to
            // per-record creates and isolate the poison.
            for (const c of creates) {
              try {
                const one = await client.batchCreate(cfg.objectPath, [c.planned.payload]);
                counts.created++;
                const id = (one[0] as Record<string, unknown> | undefined)?.id;
                if (typeof id === "string") registerCreated(c.planned, id);
              } catch (e) {
                // Twenty holds a UNIQUE index on the primary email, and two
                // real people DO share one (an agent's address on a family's
                // leads). Losing the person to keep the contested email is the
                // wrong trade — retry once without it. Verdict recorded so
                // the report shows what was given up.
                if (isDuplicateEntry(e) && stripEmails(c.planned.payload)) {
                  try {
                    const one = await client.batchCreate(cfg.objectPath, [c.planned.payload]);
                    counts.created++;
                    bump(counts.verdicts, "email:duplicate_dropped");
                    const id = (one[0] as Record<string, unknown> | undefined)?.id;
                    if (typeof id === "string") registerCreated(c.planned, id);
                    continue;
                  } catch (retryErr) {
                    void retryErr;
                  }
                }
                counts.failed++;
                counts.firstError ??= `${c.planned.externalId}: ${(e as Error).message.slice(0, 200)}`;
                bump((counts.failedReasons ??= {}), `create/${failureKind((e as Error).message)}`);
              }
            }
            void batchErr;
          }
          if (!suppressNotify && opts.onRecord) {
            for (const { planned } of creates) {
              await opts.onRecord({ entity, externalId: planned.externalId, action: "created" });
            }
          }
        }
        await state.save({ entity, cursor, counts, status: "running" });
      } else {
        counts.created += creates.length;
        counts.updated += patches.length;
      }

      // ── Deal side effects: the content that is not an opportunity FIELD ──
      // Runs AFTER the upsert flush so freshly created opportunities are
      // already registered in the index — their Twenty ids are what notes and
      // stageEvents attach to. In dry-run the would-be creates have no id
      // yet, so side effects are only COUNTED (matching created/updated).
      if (entity === "deals" && noteTitles && stageEventKeys && peopleIndex) {
        const sideEffectFailed = (kind: string, e: unknown) => {
          counts.failed++;
          counts.firstError ??= `${kind}: ${(e as Error).message.slice(0, 200)}`;
          bump((counts.failedReasons ??= {}), `${kind}/${failureKind((e as Error).message)}`);
        };
        for (const { row, planned } of admittedDeals) {
          const scopedId = planned.externalId;
          const opportunityId = index.byExternalId.get(scopedId);
          const tail =
            typeof planned.payload.phoneTail9 === "string" ? planned.payload.phoneTail9 : null;
          // The person behind the deal: by Bitrix lead id when the link
          // exists (today it never does — deal.lead_id is NULL), else by the
          // deal's phone tail. Brand-scoped keys, like the index contents.
          const personId =
            (planned.leadExternalId
              ? peopleIndex.byExternalId.get(
                  scopedExternalId("leads", planned.leadExternalId, opts.brandLine)
                ) ??
                peopleIndex.byExternalId.get(
                  scopedExternalId("contacts", planned.leadExternalId, opts.brandLine)
                )
              : undefined) ?? (tail ? peopleIndex.byPhoneTail9.get(tail) : undefined);

          // 1. Deal COMMENTS (the BitrixGPT summary of client needs) → a
          //    native Twenty NOTE targeted at the opportunity (and the person
          //    when known), exactly how the WA projector attaches its notes.
          //    Idempotent by title — notes carry no externalId.
          const comments = row.sourceComments?.trim();
          if (comments) {
            const title = aiSummaryNoteTitle(scopedId);
            if (!noteTitles.has(title)) {
              noteTitles.add(title); // same-run dedupe; the set is rebuilt per run
              if (!dryRun) {
                // A missing id means the opportunity upsert itself failed —
                // the next run retries the note (nothing was created).
                if (opportunityId) {
                  try {
                    const created = await client.batchCreate("notes", [
                      { title, bodyV2: { markdown: comments.slice(0, 8000), blocknote: null } },
                    ]);
                    const noteId = (created[0] as Record<string, unknown> | undefined)?.id;
                    if (typeof noteId !== "string") {
                      throw new Error("note created without id in response");
                    }
                    await client.batchCreate("noteTargets", [
                      { noteId, targetOpportunityId: opportunityId },
                      ...(personId ? [{ noteId, targetPersonId: personId }] : []),
                    ]);
                    counts.notes = (counts.notes ?? 0) + 1;
                  } catch (e) {
                    sideEffectFailed("note", e);
                  }
                }
              } else {
                counts.notes = (counts.notes ?? 0) + 1;
              }
            }
          }

          // 2. MOVED_* → ONE stageEvent per observed transition, idempotent by
          //    externalId = deal:<id>:<MOVED_TIME>. Bitrix keeps only the LAST
          //    move, so this captures the current transition once — history
          //    accumulates run over run as deals keep moving.
          if (row.sourceMovedAt) {
            const key = stageEventExternalId(scopedId, row.sourceMovedAt);
            if (!stageEventKeys.has(key)) {
              stageEventKeys.add(key);
              if (!dryRun) {
                if (opportunityId) {
                  try {
                    await client.batchCreate("stageEvents", [
                      {
                        externalId: key,
                        fromStage: row.previousStageDetail ?? null,
                        toStage: row.stageDetail ?? row.stage ?? null,
                        changedAt: row.sourceMovedAt.toISOString(),
                        // Raw Bitrix user id — the platform keeps no
                        // Bitrix-id → name table to resolve it against.
                        changedBy: row.sourceMovedById ?? null,
                        opportunityId,
                      },
                    ]);
                    counts.stageEvents = (counts.stageEvents ?? 0) + 1;
                  } catch (e) {
                    sideEffectFailed("stageEvent", e);
                  }
                }
              } else {
                counts.stageEvents = (counts.stageEvents ?? 0) + 1;
              }
            }
          }

          // 3. Deal-carried PERSON traits. returnCustomer only propagates
          //    when TRUE: Bitrix defaults the flag to "N", so false carries
          //    no signal and would churn the person on every run. With
          //    several deals per person the last page wins — documented, not
          //    resolved (Bitrix itself keeps these per deal, not per client).
          const enrichment: Record<string, unknown> = {
            ...(row.languageSegment ? { languageSegment: mirrorSemanticValueCode(row.languageSegment) } : {}),
            ...(row.returnCustomer ? { returnCustomer: true } : {}),
            ...socialLinksField(firstHttpUrl(row.sourceDescription)),
          };
          if (Object.keys(enrichment).length > 0 && personId) {
            if (!dryRun) {
              try {
                await client.patch(`people/${personId}`, enrichment);
                counts.personEnriched = (counts.personEnriched ?? 0) + 1;
              } catch (e) {
                sideEffectFailed("enrich", e);
              }
            } else {
              counts.personEnriched = (counts.personEnriched ?? 0) + 1;
            }
          }
        }
      }

      if (hitCap || rows.length < SOURCE_PAGE) break;
    }

    if (!dryRun && !hitCap) {
      await state.save({ entity, cursor, counts, status: "done" });
    }
    if (hitCap) break; // global cap — later entities wait for the next run
  }

  return report;
}

// ─── Drizzle plumbing ───────────────────────────────────────────────────────
//
// Only Bitrix-mirrored rows are mirrored onwards (external_source =
// 'bitrix24'): platform-native records have no external_id at all, and
// kaiten-sourced rows belong to the fleet contour, not the CRM cutover.

function createDrizzleSource(db: PlatformDb, tenantId: string): MirrorSource {
  // The brand is a property of the tenant, not of the row, so it is resolved
  // once and reused for every page instead of joining it onto 130k rows.
  let brandLine: string | null | undefined;
  const resolveBrandLine = async (): Promise<string | null> => {
    if (brandLine !== undefined) return brandLine;
    const [t] = await db
      .select({ slug: tenant.slug })
      .from(tenant)
      .where(eq(tenant.id, tenantId))
      .limit(1);
    brandLine = brandLineForTenantSlug(t?.slug);
    return brandLine;
  };

  return {
    async list(entity, { afterExternalId, limit }) {
      const brand = await resolveBrandLine();
      if (entity === "contacts") {
        const rows = await db
          .select({
            id: customer.id,
            externalId: customer.externalId,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            source: customer.source,
            notes: customer.notes,
            socialUrl: customer.socialUrl,
            createdAt: customer.createdAt,
          })
          .from(customer)
          .where(
            and(
              eq(customer.tenantId, tenantId),
              eq(customer.externalSource, "bitrix24"),
              isNotNull(customer.externalId),
              afterExternalId ? gt(customer.externalId, afterExternalId) : undefined
            )
          )
          .orderBy(customer.externalId)
          .limit(limit);
        // Honest activity for the cutoff. The customer table carries NO date
        // that means anything about the business: there is no Bitrix
        // DATE_MODIFY column, `updated_at` is bumped by every incremental
        // sync pass, and `created_at` is the timestamp of OUR import (all
        // 52,603 take-auto rows land in July 2026), not the day the client
        // appeared. Measured 2026-08-02: every contact passes a 2026-07-01
        // cutoff and 86 pass 2026-08-01 — the date says nothing.
        //
        // So a contact's activity is borrowed from the records that DO carry
        // honest Bitrix dates:
        //   1. its own WhatsApp conversation (message log), and
        //   2. the lead(s) reachable at the same phone — matched on the last
        //      9 digits, the same key `lead_phone_key_idx` indexes, and dated
        //      by their deals' DATE_MODIFY (else the lead's DATE_CREATE).
        // A contact with NEITHER signal has no evidence of life at all: it
        // gets the epoch, so the normal cutoff gate drops it as before_cutoff
        // rather than letting a dateless row through (record.ts keeps rows
        // with no date, which for these would admit the whole 2017 archive).
        const ids = rows.map((r) => r.id);
        const activity = ids.length
          ? await db
              .select({ customerId: message.customerId, lastAt: max(message.createdAt) })
              .from(message)
              .where(and(eq(message.tenantId, tenantId), inArray(message.customerId, ids)))
              .groupBy(message.customerId)
          : [];
        const lastMessageAt = new Map(activity.map((a) => [a.customerId, a.lastAt]));

        const tails = [...new Set(rows.map((r) => phoneTail9(r.phone)).filter((t): t is string => !!t))];
        // The WHERE expression is written to match `lead_phone_key_idx`
        // character for character — any drift and this degrades to a seq scan
        // over the whole lead table once per page.
        const leadActivity = tails.length
          ? await db.execute(sql`
              select right(regexp_replace(coalesce(l.phone, ''), '\\D', '', 'g'), 9) as tail9,
                     max(coalesce(d.source_modified_at, d.last_activity_at, l.created_at)) as act
                from lead l
                left join deal d on d.lead_id = l.id
               where l.tenant_id = ${tenantId}::uuid
                 and l.phone is not null
                 and right(regexp_replace(coalesce(l.phone, ''), '\\D', '', 'g'), 9)
                     in (${sql.join(
                       tails.map((t) => sql`${t}`),
                       sql`, `
                     )})
               group by 1
            `)
          : [];
        const leadActivityByTail9 = new Map<string, Date>();
        for (const r of sqlRows<{ tail9: string | null; act: Date | string | null }>(leadActivity)) {
          if (!r.tail9 || !r.act) continue;
          leadActivityByTail9.set(r.tail9, r.act instanceof Date ? r.act : new Date(r.act));
        }

        return rows
          .filter((r): r is typeof r & { externalId: string } => r.externalId !== null)
          .map((r) => {
            const tail = phoneTail9(r.phone);
            const signals = [
              lastMessageAt.get(r.id) ?? null,
              tail ? (leadActivityByTail9.get(tail) ?? null) : null,
            ].filter((d): d is Date => d instanceof Date);
            const best = signals.reduce<Date | null>(
              (acc, d) => (acc === null || d > acc ? d : acc),
              null
            );
            return {
              externalId: r.externalId,
              name: r.name,
              phone: r.phone,
              email: r.email,
              source: r.source,
              notes: r.notes,
              socialUrl: r.socialUrl,
              // NO_ACTIVITY_STAMP, not null: a null date is ADMITTED by the
              // cutoff gate, which is the wrong direction for these rows.
              brandLine: brand,
              modifiedAt: best ?? NO_ACTIVITY_STAMP,
            };
          });
      }
      if (entity === "leads") {
        const rows = await db
          .select({
            id: lead.id,
            externalId: lead.externalId,
            name: lead.customerName,
            phone: lead.phone,
            email: lead.email,
            status: lead.status,
            stageDetail: lead.stageDetail,
            source: lead.source,
            notes: lead.notes,
            sourceDescription: lead.sourceDescription,
            createdAt: lead.createdAt,
          })
          .from(lead)
          .where(
            and(
              eq(lead.tenantId, tenantId),
              // NOT just Bitrix any more. Bitrix is being switched off for
              // cost, and leads have started being born here — the first ones
              // from WhatsApp (modules/crm/lead-from-whatsapp.ts). This filter
              // was the reason a locally-born lead would reach the platform DB
              // and then never appear in Twenty: the desk would simply not see
              // it. Widen it as each intake channel moves off Bitrix.
              inArray(lead.externalSource, ["bitrix24", WA_LEAD_SOURCE]),
              isNotNull(lead.externalId),
              afterExternalId ? gt(lead.externalId, afterExternalId) : undefined
            )
          )
          .orderBy(lead.externalId)
          .limit(limit);
        // Honest activity for the cutoff: lead.updated_at is bumped by every
        // sync pass, so it cannot drive it. The real business-activity signal
        // for a lead is activity on its DEALS (deal.source_modified_at is
        // Bitrix's own DATE_MODIFY, last_activity_at its imported stamp).
        // Fallback: lead.created_at, which the sync keeps as Bitrix's honest
        // DATE_CREATE intake date.
        const ids = rows.map((r) => r.id);
        const dealStamps = ids.length
          ? await db
              .select({
                leadId: deal.leadId,
                sourceModifiedAt: deal.sourceModifiedAt,
                lastActivityAt: deal.lastActivityAt,
              })
              .from(deal)
              .where(and(eq(deal.tenantId, tenantId), inArray(deal.leadId, ids)))
          : [];
        const lastDealActivityAt = new Map<string, Date>();
        for (const d of dealStamps) {
          if (!d.leadId) continue;
          const stamp = d.sourceModifiedAt ?? d.lastActivityAt;
          if (!stamp) continue;
          const prev = lastDealActivityAt.get(d.leadId);
          if (!prev || stamp > prev) lastDealActivityAt.set(d.leadId, stamp);
        }
        return rows
          .filter((r): r is typeof r & { externalId: string } => r.externalId !== null)
          .map((r) => ({
            externalId: r.externalId,
            name: r.name,
            phone: r.phone,
            email: r.email,
            status: r.status,
            stageDetail: r.stageDetail,
            source: r.source,
            notes: r.notes,
            sourceDescription: r.sourceDescription,
            brandLine: brand,
            modifiedAt: lastDealActivityAt.get(r.id) ?? r.createdAt,
          }));
      }
      const rows = await db
        .select({
          externalId: deal.externalId,
          name: deal.ref,
          leadExternalId: lead.externalId,
          // NULL on deals whose lead link was never populated by the Bitrix
          // import — selected anyway so the deal's phoneTail9 upgrades itself
          // the day that link exists, instead of staying on the title-scraping
          // fallback forever.
          leadPhone: lead.phone,
          // Rental-portal deals link a CONTACT, not a lead (0067): fall back
          // to the customer's phone, same tail9 rule as the AI resolver.
          customerPhone: customer.phone,
          // Card owner — resolved to a workspaceMember id per instance below.
          ownerEmail: user.email,
          status: deal.status,
          stage: deal.stage,
          stageDetail: deal.stageDetail,
          value: deal.value,
          // The Bitrix semantic fields (0065): projected onto the opportunity
          // (lossReason/carModels), a summary note (sourceComments), the
          // matched person (languageSegment/returnCustomer/social) and the
          // stageEvent audit (sourceMoved*/previousStageDetail).
          sourceComments: deal.sourceComments,
          sourceDescription: deal.sourceDescription,
          lossReason: deal.lossReason,
          carModels: deal.carModels,
          languageSegment: deal.languageSegment,
          returnCustomer: deal.returnCustomer,
          sourceMovedAt: deal.sourceMovedAt,
          sourceMovedById: deal.sourceMovedById,
          previousStageDetail: deal.previousStageDetail,
          sourceModifiedAt: deal.sourceModifiedAt,
          lastActivityAt: deal.lastActivityAt,
          updatedAt: deal.updatedAt,
        })
        .from(deal)
        .leftJoin(lead, eq(deal.leadId, lead.id))
        .leftJoin(customer, eq(deal.customerId, customer.id))
        .leftJoin(user, eq(deal.ownerId, user.id))
        .where(
          and(
            eq(deal.tenantId, tenantId),
            eq(deal.externalSource, "bitrix24"),
            isNotNull(deal.externalId),
            afterExternalId ? gt(deal.externalId, afterExternalId) : undefined
          )
        )
        .orderBy(deal.externalId)
        .limit(limit);
      return rows
        .filter((r): r is typeof r & { externalId: string } => r.externalId !== null)
        .map((r) => ({
          externalId: r.externalId,
          name: r.name,
          phone: r.leadPhone ?? r.customerPhone,
          ownerEmail: r.ownerEmail,
          status: r.status,
          stage: r.stage,
          stageDetail: r.stageDetail,
          value: r.value,
          leadExternalId: r.leadExternalId,
          sourceComments: r.sourceComments,
          sourceDescription: r.sourceDescription,
          lossReason: r.lossReason,
          carModels: r.carModels,
          languageSegment: r.languageSegment,
          returnCustomer: r.returnCustomer,
          sourceMovedAt: r.sourceMovedAt,
          sourceMovedById: r.sourceMovedById,
          previousStageDetail: r.previousStageDetail,
          // Freshness precedence mirrors the deal comments in schema.ts:
          // source_modified_at is Bitrix's own stamp; updated_at is polluted
          // by nightly reconcile and is only the last resort.
          brandLine: brand,
          modifiedAt: r.sourceModifiedAt ?? r.lastActivityAt ?? r.updatedAt,
        }));
    },
  };
}

function createDrizzleStateStore(db: PlatformDb, tenantId: string): MirrorStateStore {
  return {
    async withLock(fn) {
      // Session-scoped (NOT xact — a run spans many transactions).
      const res = (await db.execute(
        sql`SELECT pg_try_advisory_lock(hashtextextended(${`mirror:${tenantId}`}, 0)) AS ok`
      )) as unknown as { rows: { ok: boolean }[] };
      if (!res.rows[0]?.ok) return false;
      try {
        return await fn();
      } finally {
        await db.execute(sql`SELECT pg_advisory_unlock(hashtextextended(${`mirror:${tenantId}`}, 0))`);
      }
    },
    async load(entity) {
      const [row] = await db
        .select()
        .from(twentyMirrorState)
        .where(and(eq(twentyMirrorState.tenantId, tenantId), eq(twentyMirrorState.entity, entity)))
        .limit(1);
      if (!row) return null;
      return {
        entity,
        cursor: row.cursor,
        status: row.status === "done" ? "done" : "running",
        counts: reviveCounts(row.counts),
      };
    },
    async save(row) {
      await db
        .insert(twentyMirrorState)
        .values({
          tenantId,
          entity: row.entity,
          cursor: row.cursor,
          status: row.status,
          counts: row.counts as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [twentyMirrorState.tenantId, twentyMirrorState.entity],
          set: {
            cursor: row.cursor,
            status: row.status,
            counts: row.counts as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          },
        });
    },
  };
}

/**
 * Mirror our Bitrix-sourced CRM rows into Twenty. Idempotent and resumable —
 * see the module header for the source-of-truth decision.
 *
 * `db` must be the tenant-scoped handle in worker context (createTenantJob's
 * tx — RLS enforced via SET LOCAL app.tenant_id); scripts pass the global db
 * and rely on the explicit tenantId predicates below.
 */
export async function mirrorBitrixToTwenty(
  db: PlatformDb,
  tenantId: string,
  opts: MirrorOptions = {}
): Promise<MirrorReport> {
  // Resolved HERE rather than left to the caller: forgetting it would silently
  // turn phone matching workspace-wide again, and the damage (a brand's client
  // patched and re-branded into another brand) is invisible until someone
  // notices a client missing from their list.
  const [t] = await db
    .select({ slug: tenant.slug })
    .from(tenant)
    .where(eq(tenant.id, tenantId))
    .limit(1);
  // The slug also decides WHICH Twenty deployment this tenant lives in — the
  // rental brands are a different instance with a different key. Resolve the
  // tenant BEFORE the client, or every rental mirror writes into sales.
  const client = opts.client ?? getTwentyClientForTenantSlug(t?.slug);
  const brandLine = opts.brandLine ?? brandLineForTenantSlug(t?.slug);
  return runMirror(createDrizzleSource(db, tenantId), createDrizzleStateStore(db, tenantId), client, {
    ...opts,
    brandLine,
    // Same slug, same reason as the client above: the deployment decides the
    // stage vocabulary, and getting it from anywhere else lets the two drift.
    instance: opts.instance ?? twentyInstanceForTenantSlug(t?.slug),
  });
}

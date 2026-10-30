// SALES AUTOMATIONS — the sales desk's opportunity automations.
//
// Runs against the SALES Twenty instance ONLY (:3001, "default"). Never the
// rental instance (:3002) — the two deployments must not share state.
//
// Six automations (2026-08-25/26 sales meetings + the 2026-09 leasing
// restructure), all idempotent:
//   1. Auto lead number — every opportunity without a leadNumber (excluding the
//      Bitrix mirror's deals) gets the next value of the platform sequence
//      `twenty_lead_seq` (race-safe: nextval cannot hand the same number twice).
//      Backfill is oldest-first by construction (createdAt sort).
//   2. Returning-lead detection — a NEW opportunity whose phoneTail9 already has
//      a CLOSED (CUSTOMER/LOST) opportunity is staged RETURNING_LEAD and gets a
//      note listing the prior rentals (date, car, outcome).
//   3. Stage-change timestamps — on stage change: stamp stageChangedAt; entering
//      FOLLOW_UP increments followUpCount; entering CUSTOMER with an empty
//      bookingDate stamps it today.
//   4. Owner reassignment ping — on owner change where the actor (updatedBy) is
//      not the new owner, create an in-app note on the record + Telegram ping
//      the new owner (if a telegram_link chat is resolvable).
//   5. Daily digest — at 08:00 GST, per active agent: their open leads with
//      number + name + direct link, sent via Telegram (agents without a linked
//      chat are skipped and reported).
//   6. Handover normalizer (girls' queue → guys' pipeline) — a card carries
//      primaryStage while it sits in the primary-processing queue and
//      salesStage once it is on the closers' board; the two must never both be
//      set (salesStage wins, primaryStage clears), and a card owned by a
//      closer with no salesStage is handed over even if the girl forgot the
//      stage (salesStage = IDENTIFYING_THE_NEED, primaryStage clears). No-op
//      until the workspace has the two fields, and it never FIGHTS the relay:
//      the relay sets primaryStage only at creation, this only clears it when
//      a handover signal exists.
//
// The stage/owner diff needs prior state, so the pass keeps a JSON snapshot
// sidecar keyed by opportunity id (same file-sidecar pattern as manager-notify
// keys). Polling (not a Twenty logic-function cron) because the box has no
// `npx twenty apply` deploy path — see docs/twenty-sales-automations-2026-08-27.md.
//
// BAN-SAFETY: notifications go ONLY through the Telegram staff bot
// (sendTelegramDm / resolveTelegramChatIdByPhoneTail). Nothing here touches
// WhatsApp, wa-* pm2 processes, or wa-observer.

import { sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { normalizePhone } from "@/platform/messaging/phone";
import type { TwentyClient } from "@/platform/integrations/twenty/client";
import type { LeadNumberSource } from "@/platform/integrations/twenty/lead-number";
import { SALES_CLOSER_IDS } from "@/modules/board/owners";

type PlatformDb = typeof platformDb;

// ─── Stage vocabulary (sales instance) ──────────────────────────────────────
// Keep in sync with the funnel the pipeline task configured (docs/
// twenty-sales-pipeline-2026-08-27.md) + the RETURNING_LEAD stage this task adds.

export const STAGE_NEW = "NEW";
export const STAGE_RETURNING_LEAD = "RETURNING_LEAD";
export const STAGE_FOLLOW_UP = "FOLLOW_UP";
export const STAGE_CUSTOMER = "CUSTOMER"; // Successful Deal (the won stage)
export const STAGE_LOST = "LOST";

/** Stages that mean "this deal is over". */
const CLOSED = new Set([STAGE_CUSTOMER, STAGE_LOST]);

/** Stages a NEW lead may sit in before an agent has advanced it. */
const FRESH = new Set([STAGE_NEW]);

/** Stages that count as "open" for the daily digest. */
const OPEN = new Set([
  STAGE_NEW,
  "CONTACTED",
  "NO_RESPONSE",
  STAGE_FOLLOW_UP,
  STAGE_RETURNING_LEAD,
]);

export function isClosedStage(stage: string | null | undefined): boolean {
  return !!stage && CLOSED.has(stage);
}

// ─── Phone ──────────────────────────────────────────────────────────────────

const MIN_DIGITS = 9;

export function phoneTail9(digits: string | null | undefined): string | null {
  const d = normalizePhone(digits);
  return d.length >= MIN_DIGITS ? d.slice(-MIN_DIGITS) : null;
}

// ─── Opportunity record shape (REST) ────────────────────────────────────────

export interface OppRecord {
  id: string;
  name: string | null;
  stage: string | null;
  ownerId: string | null;
  pointOfContactId: string | null;
  leadNumber: string | null;
  stageChangedAt: string | null;
  followUpCount: number | null;
  bookingDate: string | null;
  phoneTail9: string | null;
  externalId: string | null;
  externalSource: string | null;
  /** The girls' queue stage (leasing restructure) — null until handed over. */
  primaryStage: string | null;
  /** The closers' pipeline stage — set means the card left the girls' board. */
  salesStage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  updatedByWorkspaceMemberId: string | null;
  updatedByName: string | null;
  deletedAt: string | null;
}

export function mapOpp(raw: Record<string, unknown>): OppRecord {
  const updatedBy = (raw.updatedBy ?? {}) as Record<string, unknown>;
  const tail = typeof raw.phoneTail9 === "string" ? raw.phoneTail9 : "";
  const name = typeof raw.name === "string" ? raw.name : null;
  return {
    id: String(raw.id),
    name,
    stage: typeof raw.stage === "string" ? raw.stage : null,
    ownerId: (raw.ownerId as string | null) ?? null,
    pointOfContactId: (raw.pointOfContactId as string | null) ?? null,
    leadNumber: typeof raw.leadNumber === "string" && raw.leadNumber.trim() ? raw.leadNumber.trim() : null,
    stageChangedAt: (raw.stageChangedAt as string | null) ?? null,
    followUpCount: raw.followUpCount == null ? null : Number(raw.followUpCount),
    bookingDate: (raw.bookingDate as string | null) ?? null,
    phoneTail9: tail || phoneTail9(name ? namePhoneFromTitle(name) : null),
    externalId: (raw.externalId as string | null) ?? null,
    externalSource: (raw.externalSource as string | null) ?? null,
    // Absent from the workspace = undefined → null, same as "not set". The
    // normalizer's field-presence gate (handoverFieldsPresent in the pass) is
    // what tells the two apart before any write is attempted.
    primaryStage: (raw.primaryStage as string | null) ?? null,
    salesStage: (raw.salesStage as string | null) ?? null,
    createdAt: (raw.createdAt as string | null) ?? null,
    updatedAt: (raw.updatedAt as string | null) ?? null,
    updatedByWorkspaceMemberId: (updatedBy.workspaceMemberId as string | null) ?? null,
    updatedByName: (updatedBy.name as string | null) ?? null,
    deletedAt: (raw.deletedAt as string | null) ?? null,
  };
}

/** A "+971…" or bare digits string inside a card title (manual leads often have
 *  the phone in the name and no phoneTail9). */
function namePhoneFromTitle(title: string): string | null {
  const m = /(?<!\d)(\+?\d{9,15})(?!\d)/.exec(title);
  return m ? m[1] : null;
}

/** The card's serial from leadNumber (the field we own), else the "#N " prefix. */
export function leadNo(opp: OppRecord): string | null {
  if (opp.leadNumber) return opp.leadNumber;
  const name = opp.name ?? "";
  const m = /^#(\d+)\s/.exec(name);
  return m ? m[1] : null;
}

// ─── Returning-lead history ─────────────────────────────────────────────────

export interface PriorRental {
  /** "2026-03-12" */ date: string;
  car: string;
  outcome: string; // "Successful" | "Lost"
}

/** Compact prior-history line list for the returning-lead note body. */
export function buildReturningNoteBody(lead: string | null, prior: PriorRental[]): string {
  const header = lead ? `Returning lead #${lead} — prior history:` : "Returning lead — prior history:";
  if (prior.length === 0) return header;
  const lines = prior.map((p) => `- ${p.date} · ${p.car || "?"} · ${p.outcome}`);
  return `${header}\n${lines.join("\n")}`;
}

// ─── Handover normalizer (girls' queue → guys' pipeline) ────────────────────
//
// The 2026-09 leasing restructure: NEW cards are born on the girls' board
// (primaryStage = NEW_APPLICATION, set by the wa-lead relay at creation) and
// move to the closers' pipeline (salesStage) on handover. A card must never
// carry both, and a card a closer owns must never sit stageless on the girls'
// board. This decides the patch; the pass applies it.

/** A closer-owned card with no salesStage is handed over at this stage. */
export const SALES_STAGE_HANDOVER = "IDENTIFYING_THE_NEED";

/**
 * The handover patch for one card, or null when it is already consistent.
 * `fieldsPresent` is the workspace gate: while the two fields do not exist on
 * the live instance (they are being rolled out), normalization is a no-op —
 * absent reads as null, and "clear primaryStage" must never be WRITTEN to a
 * workspace that has no such column.
 */
export function planHandoverNormalization(input: {
  ownerId: string | null;
  salesStage: string | null;
  primaryStage: string | null;
  closerIds: ReadonlySet<string>;
  fieldsPresent: boolean;
}): Record<string, unknown> | null {
  if (!input.fieldsPresent) return null;
  const { ownerId, salesStage, primaryStage } = input;
  // On the guys' board already → leaves the girls' board.
  if (salesStage && primaryStage) return { primaryStage: null };
  // A closer owns it but the stage was never set — the handover still
  // completes (girl reassigned without setting the stage).
  if (ownerId && input.closerIds.has(ownerId) && !salesStage && primaryStage) {
    return { salesStage: SALES_STAGE_HANDOVER, primaryStage: null };
  }
  return null;
}

// ─── Reassignment message ───────────────────────────────────────────────────

export function buildReassignText(input: {
  lead: string | null;
  name: string | null;
  phone: string | null;
  manager: string | null;
}): string {
  const who = input.lead ? `Lead #${input.lead}` : "Lead";
  const ident = [input.name, input.phone].filter(Boolean).join(" / ");
  const by = input.manager ? ` by ${input.manager}` : "";
  return `🙋 ${who}${ident ? ` (${ident})` : ""} assigned to you${by}.`;
}

// ─── Digest ─────────────────────────────────────────────────────────────────

export interface OpenLeadLine {
  lead: string | null;
  name: string | null;
  url: string | null;
}

export interface AgentDigest {
  agentLabel: string;
  openLeads: OpenLeadLine[];
}

export function buildDigestMessages(
  agent: AgentDigest,
  cardBaseUrl: string,
  dayLabel: string
): string[] {
  const base = cardBaseUrl.replace(/\/$/, "");
  const header = `📋 ${agent.agentLabel} — open leads (${dayLabel}):`;
  if (agent.openLeads.length === 0) return [`${header}\n(no open leads)`];
  const lines = agent.openLeads.map((l) => {
    const num = l.lead ? `#${l.lead}` : "—";
    const name = l.name ?? "(unnamed)";
    const link = l.url ?? null;
    return link ? `${num} · ${name}\n${link}` : `${num} · ${name}`;
  });
  // Chunk to Telegram's 4096-char limit.
  const messages: string[] = [];
  let current = header;
  for (const line of lines) {
    if (current.length + line.length + 2 > 3800) {
      messages.push(current);
      current = line;
    } else {
      current += `\n${line}`;
    }
  }
  messages.push(current);
  return messages;
}

// ─── Snapshot state ─────────────────────────────────────────────────────────

export interface OppSnapshot {
  stage: string | null;
  ownerId: string | null;
  followUpCount: number | null;
  bookingDate: string | null;
}

export interface SalesAutomationState {
  /** Prior observed value per opportunity id (for stage/owner diffing). */
  snapshot: Record<string, OppSnapshot>;
  /** Last Dubai day (YYYY-MM-DD) the digest fired — once per day. */
  digestSentDay: string | null;
}

export function emptyState(): SalesAutomationState {
  return { snapshot: {}, digestSentDay: null };
}

export function loadState(raw: string): SalesAutomationState {
  try {
    const parsed = JSON.parse(raw) as Partial<SalesAutomationState>;
    return {
      snapshot: (parsed.snapshot && typeof parsed.snapshot === "object" ? parsed.snapshot : {}) as Record<string, OppSnapshot>,
      digestSentDay: typeof parsed.digestSentDay === "string" ? parsed.digestSentDay : null,
    };
  } catch {
    return emptyState();
  }
}

export function serializeState(state: SalesAutomationState): string {
  return JSON.stringify(state, null, 1);
}

// ─── Dependencies + pass ────────────────────────────────────────────────────

export interface SalesAutomationDeps {
  client: TwentyClient;
  nextLeadNumber: LeadNumberSource;
  db: PlatformDb;
  /** Telegram DM sender (shared staff-DM helper). */
  send: (chatId: string, text: string) => Promise<void>;
  /** Resolve a Telegram chat_id for a phone tail9 (telegram_link). */
  resolveChat: (phoneTail9: string) => Promise<string | null>;
  /** workspaceMember email → full phone digits (or "" when not on file). */
  ownerPhones: Record<string, string>;
  /** workspaceMember email → display name fallback. */
  ownerNames: Record<string, string>;
  /** e.g. https://app.takeauto.tech */
  cardBaseUrl: string;
  state: SalesAutomationState;
  /** Injectable clock for tests. */
  now: Date;
  /** Dubai day label for the digest header ("2026-08-28"). */
  dayLabel: string;
  /** Hour of the Dubai day (for the 08:00 digest gate). */
  hourDubai: number;
}

export interface SalesAutomationCounts {
  scanned: number;
  numbered: number;
  returningLeads: number;
  returningNotes: number;
  stageStamps: number;
  followUpIncrements: number;
  bookingStamps: number;
  ownerPings: number;
  ownerPingsSkipped: number;
  digestSent: number;
  digestSkipped: number;
  /** Cards moved off the girls' board by the handover normalizer. */
  handoverNormalized: number;
  errors: string[];
}

export interface SalesAutomationOptions {
  commit: boolean;
  /** Force the digest (for tests / manual runs), bypassing the 08:00 gate. */
  forceDigest?: boolean;
  logger?: (line: string) => void;
}

const BITRIX_SOURCE = "bitrix24";
const DIGEST_HOUR = 8; // 08:00 GST

// Handover-normalizer guards, once per PROCESS (the runner polls every 60s —
// a missing-field warning every pass would bury the log). `handoverBroken`
// latches when a patch proves the workspace lacks the fields despite the read
// gate, and the normalizer stays silent for the rest of the process.
let handoverAbsentLogged = false;
let handoverBroken = false;

/** Twenty's vocabulary for "this field does not exist on this object". */
function isUnknownFieldError(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /cannot query field|unknown (field|column)|does not exist/i.test(m);
}

export async function runSalesAutomationsPass(
  deps: SalesAutomationDeps,
  opts: SalesAutomationOptions
): Promise<SalesAutomationCounts> {
  const counts: SalesAutomationCounts = {
    scanned: 0,
    numbered: 0,
    returningLeads: 0,
    returningNotes: 0,
    stageStamps: 0,
    followUpIncrements: 0,
    bookingStamps: 0,
    ownerPings: 0,
    ownerPingsSkipped: 0,
    digestSent: 0,
    digestSkipped: 0,
    handoverNormalized: 0,
    errors: [],
  };
  const log = opts.logger ?? (() => {});

  // Full scan — the sales book is ~1.2k opportunities (~21 pages), well under
  // the 100 req/min workspace budget even at a 60s poll.
  const opps: OppRecord[] = [];
  // The handover fields are being rolled out on the live instance — until
  // they exist the normalizer must be a no-op, and "exists" is decided from
  // the raw payload (a present field reads null; an absent one reads
  // undefined and is missing as a KEY).
  let handoverFieldsPresent = false;
  for await (const rec of deps.client.listAll<Record<string, unknown>>("opportunities")) {
    if ("primaryStage" in rec && "salesStage" in rec) handoverFieldsPresent = true;
    opps.push(mapOpp(rec));
  }
  counts.scanned = opps.length;

  const live = opps.filter((o) => !o.deletedAt);

  // workspaceMembers index for owner/actor names (built once per pass).
  const members = new Map<string, { name: string; email: string }>();
  for await (const m of deps.client.listAll<Record<string, unknown>>("workspaceMembers")) {
    const rec = m as Record<string, unknown>;
    const id = String(rec.id);
    const nameObj = rec.name as { firstName?: unknown; lastName?: unknown } | undefined;
    const firstName = typeof nameObj?.firstName === "string" ? nameObj.firstName : "";
    const lastName = typeof nameObj?.lastName === "string" ? nameObj.lastName : "";
    const emailRaw = rec.userEmail;
    const email = typeof emailRaw === "string" ? emailRaw : "";
    members.set(id, { name: `${firstName} ${lastName}`.trim() || email, email });
  }

  const ownerEmailById = (id: string | null): string | null => {
    if (!id) return null;
    return members.get(id)?.email ?? null;
  };
  const ownerLabelById = (id: string | null): string | null => {
    if (!id) return null;
    const m = members.get(id);
    if (!m) return null;
    return deps.ownerNames[m.email] ?? m.name;
  };

  // ── 1. Numbering (oldest first) ────────────────────────────────────────────
  // Skip manual stubs: an empty card somebody created by hand and abandoned
  // (2026-09-30: an accidental empty card got #181 and was reported as "a lead
  // with no info"). Once a human fills the name or links a contact, the card
  // is numbered on the next pass.
  const isManualStub = (o: (typeof live)[number]): boolean =>
    !(o.name ?? "").trim() && !o.pointOfContactId && !o.phoneTail9 && !o.externalId;
  const toNumber = live
    .filter((o) => !o.leadNumber && o.externalSource !== BITRIX_SOURCE && !isManualStub(o))
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id.localeCompare(b.id));

  for (const o of toNumber) {
    if (!opts.commit) {
      counts.numbered++;
      log(`[sales-auto] would number ${o.id} (${o.name ?? "unnamed"})`);
      continue;
    }
    try {
      const n = await deps.nextLeadNumber();
      await deps.client.patch(`opportunities/${o.id}`, { leadNumber: String(n) });
      o.leadNumber = String(n);
      counts.numbered++;
      log(`[sales-auto] numbered #${n} ${o.id}`);
    } catch (e) {
      counts.errors.push(`number ${o.id}: ${msg(e)}`);
    }
  }

  // ── 2. Returning-lead detection ────────────────────────────────────────────
  // Index: phoneTail9 → closed (CUSTOMER/LOST) opportunities with their date.
  const closedByTail = new Map<string, { createdAt: string; car: string; outcome: string; id: string }[]>();
  for (const o of live) {
    const tail = o.phoneTail9;
    if (!tail || !isClosedStage(o.stage)) continue;
    const list = closedByTail.get(tail) ?? [];
    list.push({
      createdAt: o.createdAt ?? "",
      car: carLabel(o),
      outcome: o.stage === STAGE_CUSTOMER ? "Successful" : "Lost",
      id: o.id,
    });
    closedByTail.set(tail, list);
  }

  for (const o of live) {
    if (o.stage !== STAGE_NEW) continue; // only brand-new leads flip to Returning
    const tail = o.phoneTail9;
    if (!tail) continue;
    const prior = (closedByTail.get(tail) ?? [])
      .filter((p) => p.id !== o.id && (p.createdAt || "") <= (o.createdAt || "9999"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10);
    if (prior.length === 0) continue;

    const body = buildReturningNoteBody(
      leadNo(o),
      prior.map((p) => ({ date: p.createdAt.slice(0, 10), car: p.car, outcome: p.outcome }))
    );
    log(`[sales-auto] returning lead ${o.id}: ${prior.length} prior closed opps`);

    if (!opts.commit) {
      counts.returningLeads++;
      counts.returningNotes++;
      continue;
    }
    try {
      // Note first (so it lands even if the stage write races), then stage.
      const created = await deps.client.batchCreate("notes", [
        { title: "Returning lead — prior history", bodyV2: { markdown: body, blocknote: null } },
      ]);
      const noteId = (created[0] as Record<string, unknown> | undefined)?.id;
      if (typeof noteId === "string") {
        await deps.client.batchCreate("noteTargets", [
          { noteId, targetOpportunityId: o.id },
          ...(o.pointOfContactId ? [{ noteId, targetPersonId: o.pointOfContactId }] : []),
        ]);
      }
      await deps.client.patch(`opportunities/${o.id}`, { stage: STAGE_RETURNING_LEAD, stageChangedAt: o.updatedAt ?? new Date(deps.now).toISOString() });
      o.stage = STAGE_RETURNING_LEAD;
      counts.returningLeads++;
      counts.returningNotes++;
      log(`[sales-auto] set RETURNING_LEAD on ${o.id}`);
    } catch (e) {
      counts.errors.push(`returning ${o.id}: ${msg(e)}`);
    }
  }

  // ── 6. Handover normalizer (girls' queue → guys' pipeline) ───────────────
  // Runs before the snapshot diff so a normalized salesStage is stamped like
  // any other stage change in the same pass.
  if (!handoverFieldsPresent) {
    if (!handoverAbsentLogged) {
      handoverAbsentLogged = true;
      log(`[sales-auto] handover normalizer idle — workspace has no salesStage/primaryStage fields yet`);
    }
  } else if (!handoverBroken) {
    for (const o of live) {
      const patch = planHandoverNormalization({
        ownerId: o.ownerId,
        salesStage: o.salesStage,
        primaryStage: o.primaryStage,
        closerIds: SALES_CLOSER_IDS,
        fieldsPresent: handoverFieldsPresent,
      });
      if (!patch) continue;
      if (!opts.commit) {
        counts.handoverNormalized++;
        log(`[sales-auto] would normalize handover on ${o.id}: ${JSON.stringify(patch)}`);
        continue;
      }
      try {
        await deps.client.patch(`opportunities/${o.id}`, patch);
        if ("primaryStage" in patch) o.primaryStage = null;
        if ("salesStage" in patch) o.salesStage = SALES_STAGE_HANDOVER;
        counts.handoverNormalized++;
        log(`[sales-auto] handover normalized on ${o.id}: ${JSON.stringify(patch)}`);
      } catch (e) {
        if (isUnknownFieldError(e)) {
          // The read gate said the fields exist but the write says otherwise —
          // believe the write, log ONCE, and stay idle for this process.
          handoverBroken = true;
          log(`[sales-auto] handover normalizer disabled for this process — unknown field: ${msg(e)}`);
          break;
        }
        counts.errors.push(`handover ${o.id}: ${msg(e)}`);
      }
    }
  }

  // ── 3 + 4. Stage-change stamp + owner-change ping (diff vs snapshot) ──────
  for (const o of live) {
    const prev = deps.state.snapshot[o.id];
    if (!prev) {
      // First sight — record, no diff.
      deps.state.snapshot[o.id] = {
        stage: o.stage,
        ownerId: o.ownerId,
        followUpCount: o.followUpCount,
        bookingDate: o.bookingDate,
      };
      continue;
    }

    const stageChanged = (o.stage ?? null) !== (prev.stage ?? null);
    const ownerChanged = (o.ownerId ?? null) !== (prev.ownerId ?? null);

    if (stageChanged) {
      // Stamp stageChangedAt to the record's own updatedAt (when the change
      // actually happened), falling back to now.
      const stamp = o.updatedAt ?? new Date(deps.now).toISOString();
      const patchBody: Record<string, unknown> = { stageChangedAt: stamp };

      let enteringFollowUp = o.stage === STAGE_FOLLOW_UP && prev.stage !== STAGE_FOLLOW_UP;
      let enteringCustomer = o.stage === STAGE_CUSTOMER && prev.stage !== STAGE_CUSTOMER;

      if (enteringFollowUp) {
        const next = (o.followUpCount ?? 0) + 1;
        patchBody.followUpCount = next;
        o.followUpCount = next;
        counts.followUpIncrements++;
      }
      if (enteringCustomer && !o.bookingDate) {
        patchBody.bookingDate = new Date(deps.now).toISOString();
        o.bookingDate = patchBody.bookingDate as string;
        counts.bookingStamps++;
      }

      if (opts.commit) {
        try {
          await deps.client.patch(`opportunities/${o.id}`, patchBody);
          o.stageChangedAt = stamp;
        } catch (e) {
          counts.errors.push(`stageStamp ${o.id}: ${msg(e)}`);
        }
      }
      counts.stageStamps++;
      log(`[sales-auto] stage ${prev.stage} → ${o.stage} on ${o.id}${opts.commit ? " (stamped)" : ""}`);
    }

    if (ownerChanged && o.ownerId) {
      // Delegation = the actor who changed it is NOT the new owner.
      const actor = o.updatedByWorkspaceMemberId;
      const isDelegation = actor !== o.ownerId;
      if (isDelegation) {
        const email = ownerEmailById(o.ownerId);
        const phone = email ? deps.ownerPhones[email] ?? "" : "";
        const chatId = phone ? await deps.resolveChat(phoneTail9(phone) ?? "").catch(() => null) : null;
        const manager = ownerLabelById(actor);
        const text = buildReassignText({
          lead: leadNo(o),
          name: o.name,
          phone: o.phoneTail9,
          manager,
        });

        if (!opts.commit) {
          counts.ownerPings++;
          log(`[sales-auto] would ping owner of ${o.id}: ${text}`);
        } else if (chatId) {
          try {
            // In-app note on the record + Telegram ping.
            const created = await deps.client.batchCreate("notes", [
              { title: "Lead reassigned", bodyV2: { markdown: text, blocknote: null } },
            ]);
            const noteId = (created[0] as Record<string, unknown> | undefined)?.id;
            if (typeof noteId === "string") {
              await deps.client.batchCreate("noteTargets", [{ noteId, targetOpportunityId: o.id }]);
            }
            await deps.send(chatId, text);
            counts.ownerPings++;
            log(`[sales-auto] pinged owner of ${o.id}`);
          } catch (e) {
            counts.errors.push(`ownerPing ${o.id}: ${msg(e)}`);
          }
        } else {
          counts.ownerPingsSkipped++;
          log(`[sales-auto] owner of ${o.id} has no telegram chat — skipped`);
        }
      }
    }

    // Advance the snapshot to the observed state.
    deps.state.snapshot[o.id] = {
      stage: o.stage,
      ownerId: o.ownerId,
      followUpCount: o.followUpCount,
      bookingDate: o.bookingDate,
    };
  }

  // ── 5. Daily digest (08:00 GST, once per day) ──────────────────────────────
  const dueNow = opts.forceDigest || deps.hourDubai === DIGEST_HOUR;
  if (dueNow && deps.state.digestSentDay !== deps.dayLabel) {
    const openByOwner = new Map<string, OpenLeadLine[]>();
    const ownerOrder: string[] = [];
    for (const o of live) {
      if (!o.ownerId || !OPEN.has(o.stage ?? "")) continue;
      const email = ownerEmailById(o.ownerId);
      if (!email) continue;
      if (!openByOwner.has(email)) {
        openByOwner.set(email, []);
        ownerOrder.push(email);
      }
      openByOwner.get(email)!.push({
        lead: leadNo(o),
        name: o.name,
        url: `${deps.cardBaseUrl.replace(/\/$/, "")}/object/opportunity/${o.id}`,
      });
    }

    for (const email of ownerOrder) {
      const phone = deps.ownerPhones[email] ?? "";
      const label = deps.ownerNames[email] ?? email;
      const chatId = phone ? await deps.resolveChat(phoneTail9(phone) ?? "").catch(() => null) : null;
      const messages = buildDigestMessages(
        { agentLabel: label, openLeads: openByOwner.get(email)! },
        deps.cardBaseUrl,
        deps.dayLabel
      );
      if (!opts.commit) {
        counts.digestSent++;
        log(`[sales-auto] would digest ${label}: ${messages.length} message(s)`);
        continue;
      }
      if (chatId) {
        for (const m of messages) {
          try {
            await deps.send(chatId, m);
          } catch (e) {
            counts.errors.push(`digest ${email}: ${msg(e)}`);
          }
        }
        counts.digestSent++;
        log(`[sales-auto] digest sent to ${label}`);
      } else {
        counts.digestSkipped++;
        log(`[sales-auto] digest skipped for ${label} — no telegram chat`);
      }
    }

    if (opts.commit) {
      deps.state.digestSentDay = deps.dayLabel;
    }
  }

  return counts;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function carLabel(o: OppRecord): string {
  const raw = (o as unknown as { carModels?: unknown }).carModels;
  return typeof raw === "string" ? raw : "";
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Dubai (Asia/Dubai = UTC+4, no DST) helpers for the runner. */
export function dubaiDayLabel(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function dubaiHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", hour12: false }).format(now)
  );
}

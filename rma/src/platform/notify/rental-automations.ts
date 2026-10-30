// RENTAL AUTOMATIONS — the rental desk's opportunity automations.
//
// Runs against the RENTAL Twenty instance ONLY (:3002, "rental"). Never the
// sales instance (:3001) — the two deployments must not share state.
//
// Retarget of src/platform/notify/sales-automations.ts to the rental funnel
// vocabulary (docs/twenty-rental-pipeline-2026-08-28.md). The rental stage
// enum values differ from sales: NEW_REQUEST (New Lead), IN_PROGRESS
// (Contacted), COMPLETED (Successful Deal), CAR_WITH_CUSTOMER (No Response),
// WE_SHOULD_REACH_OUT_AGAIN (Follow-up), UNSUCCESSFUL_DEAL (Lost/Unsuccessful),
// plus RETURNING_LEAD added by this task and 7 legacy stages.
//
// Automations (all idempotent, DRY-RUN by default):
//   1. Auto lead number — every opportunity without a leadNumber (excluding
//      the Bitrix mirror's deals) gets the next value of the platform
//      sequence `twenty_lead_seq` (race-safe: nextval cannot hand the same
//      number twice). Backfill is oldest-first by construction (createdAt
//      sort). Manual/walk-in leads created in the UI are numbered here too.
//   2. Returning-lead detection — a NEW opportunity whose phoneTail9 already
//      has a CLOSED (COMPLETED/UNSUCCESSFUL_DEAL) opportunity is staged
//      RETURNING_LEAD and gets a note listing the prior deals (date, car,
//      outcome).
//   3. Stage-change timestamps — on stage change: stamp stageChangedAt;
//      entering WE_SHOULD_REACH_OUT_AGAIN increments followUpCount; entering
//      COMPLETED with an empty bookingDate stamps it today.
//   4. Owner reassignment ping + follow-up — on owner change where the actor
//      (updatedBy) is not the new owner: in-app note + Telegram ping to the
//      new owner, plus the same text on WhatsApp via wa_outbox when the
//      owner's full number is on file. A pending-reassign monitor then
//      re-warns the owner and reports back to the manager if the lead stays
//      untouched (no stage change / record edit) past the follow-up window.
//   5. Booking broadcast — when a deal first enters COMPLETED, post a booking
//      line (lead #, customer, car, dates, value) to the team's Telegram
//      bookings group (same channel the deal-broadcast runner uses). If no
//      channel is configured, it is skipped and reported — never invented.
//   6. Daily digest — at 08:00 GST, per active agent: their open leads with
//      number + name + direct link, via Telegram (agents without a linked
//      chat are skipped and reported).
//
// The stage/owner diff needs prior state, so the pass keeps a JSON snapshot
// sidecar keyed by opportunity id (same pattern as manager-notify keys).
// Polling (not a Twenty logic-function cron) because the box has no
// `npx twenty apply` deploy path — see docs/twenty-rental-automations-2026-08-28.md.
//
// BAN-SAFETY: Telegram DMs go ONLY through the Telegram staff bot
// (sendTelegramDm) and booking lines through the existing bookings group
// (TELEGRAM_BOT_TOKEN → DEAL_BROADCAST_CHAT_ID). The WhatsApp reassignment
// ping goes ONLY through wa_outbox (enqueueOutbox), drained by the
// wa-observer bridge with its own send guards. Nothing here talks to Baileys
// directly or touches wa-* pm2 processes.

import { sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { normalizePhone } from "@/platform/messaging/phone";
import type { TwentyClient } from "@/platform/integrations/twenty/client";
import { waMeLink } from "@/platform/integrations/twenty/deal-link";
import type { LeadNumberSource } from "@/platform/integrations/twenty/lead-number";

type PlatformDb = typeof platformDb;

// ─── Stage vocabulary (rental instance) ─────────────────────────────────────
// Keep in sync with the funnel the pipeline task configured + the
// RETURNING_LEAD stage this task adds (docs/twenty-rental-pipeline-2026-08-28.md).

export const STAGE_NEW = "NEW_REQUEST";
export const STAGE_RETURNING_LEAD = "RETURNING_LEAD";
export const STAGE_FOLLOW_UP = "WE_SHOULD_REACH_OUT_AGAIN";
export const STAGE_WON = "COMPLETED"; // Successful Deal
export const STAGE_LOST = "UNSUCCESSFUL_DEAL"; // Lost/Unsuccessful
export const STAGE_NOT_A_LEAD = "NOT_A_LEAD";

/** Stages that mean "this deal is over". */
const CLOSED = new Set([STAGE_WON, STAGE_LOST]);

/** Stages that count as "open" for the daily digest — everything still being
 *  worked, i.e. not won/lost and not the "not a lead" discard column. */
export function isOpenStage(stage: string | null | undefined): boolean {
  return !!stage && !CLOSED.has(stage) && stage !== STAGE_NOT_A_LEAD;
}

export function isClosedStage(stage: string | null | undefined): boolean {
  return !!stage && CLOSED.has(stage);
}

// ─── Phone ──────────────────────────────────────────────────────────────────

const MIN_DIGITS = 9;

export function phoneTail9(digits: string | null | undefined): string | null {
  const d = normalizePhone(digits);
  return d.length >= MIN_DIGITS ? d.slice(-MIN_DIGITS) : null;
}

/** Full customer digits from a card's WhatsApp link (both relays write it),
 *  falling back to the card's phoneTail9 (a 9-digit tail). */
function fullPhoneFromCard(raw: Record<string, unknown>): string {
  const whatsapp = (raw.whatsapp ?? {}) as { primaryLinkUrl?: unknown };
  const url = typeof whatsapp.primaryLinkUrl === "string" ? whatsapp.primaryLinkUrl : "";
  const m = /(?:wa\.me\/|[?&]phone=)(\d+)/.exec(url);
  if (m) return m[1];
  return typeof raw.phoneTail9 === "string" ? raw.phoneTail9 : "";
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
  phoneFull: string;
  carModels: string | null;
  carCategory: string | null;
  valueMicros: number | null;
  rentalStart: string | null;
  rentalEnd: string | null;
  externalId: string | null;
  externalSource: string | null;
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
  const rentalValue = (raw.rentalValue ?? {}) as { amountMicros?: unknown };
  const amount = (raw.amount ?? {}) as { amountMicros?: unknown };
  const rvMicros = rentalValue.amountMicros != null ? Number(rentalValue.amountMicros) : NaN;
  const aMicros = amount.amountMicros != null ? Number(amount.amountMicros) : NaN;
  const valueMicros = Number.isFinite(rvMicros) && rvMicros > 0 ? rvMicros
    : Number.isFinite(aMicros) && aMicros > 0 ? aMicros : null;
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
    phoneFull: fullPhoneFromCard(raw),
    carModels: typeof raw.carModels === "string" && raw.carModels.trim() ? raw.carModels.trim() : null,
    carCategory: typeof raw.carCategory === "string" && raw.carCategory.trim() ? raw.carCategory.trim() : null,
    valueMicros,
    rentalStart: (raw.rentalStart as string | null) ?? null,
    rentalEnd: (raw.rentalEnd as string | null) ?? null,
    externalId: (raw.externalId as string | null) ?? null,
    externalSource: (raw.externalSource as string | null) ?? null,
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

/** The car label for a note/message — the free-text model first, the category
 *  select second. */
export function carLabel(opp: OppRecord): string {
  return opp.carModels ?? opp.carCategory ?? "";
}

/** "2026-08-23 → 2026-08-26" from the rental dates, else "". */
function dateSpan(opp: OppRecord): string {
  const from = (opp.rentalStart ?? "").slice(0, 10);
  const to = (opp.rentalEnd ?? "").slice(0, 10);
  if (from && to) return `${from} → ${to}`;
  if (from) return from;
  if (to) return to;
  return "";
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

// ─── Reassignment message ───────────────────────────────────────────────────

export function buildReassignText(input: {
  lead: string | null;
  name: string | null;
  phone: string | null;
  manager: string | null;
  /** Direct card link (rent.takeauto.tech/object/opportunity/<id>). */
  cardUrl?: string | null;
  /** Deep link straight into the customer's WhatsApp chat. */
  chatUrl?: string | null;
}): string {
  const who = input.lead ? `Lead #${input.lead}` : "Lead";
  const ident = [input.name, input.phone].filter(Boolean).join(" / ");
  const by = input.manager ? ` by ${input.manager}` : "";
  const lines = [`🙋 ${who}${ident ? ` (${ident})` : ""} assigned to you${by}.`];
  if (input.chatUrl) lines.push(`💬 Chat: ${input.chatUrl}`);
  if (input.cardUrl) lines.push(`🗂 Card: ${input.cardUrl}`);
  return lines.join("\n");
}

/** The follow-up nudge when a reassigned lead stays untouched. */
export function buildReassignFollowUpText(input: {
  lead: string | null;
  name: string | null;
  manager: string | null;
  hours: number;
  cardUrl?: string | null;
}): string {
  const who = input.lead ? `Lead #${input.lead}` : "Lead";
  const ident = input.name ? ` (${input.name})` : "";
  const by = input.manager ? ` assigned by ${input.manager}` : "";
  const lines = [`⏰ ${who}${ident}${by} is still untouched after ~${Math.round(input.hours)}h — please pick it up or hand it back.`];
  if (input.cardUrl) lines.push(`🗂 Card: ${input.cardUrl}`);
  return lines.join("\n");
}

/** The manager's report line when a reassigned lead went untouched. */
export function buildReassignManagerReport(input: {
  lead: string | null;
  name: string | null;
  ownerName: string | null;
  manager: string | null;
  hours: number;
  cardUrl?: string | null;
}): string {
  const who = input.lead ? `Lead #${input.lead}` : "Lead";
  const ident = input.name ? ` (${input.name})` : "";
  const lines = [`⚠️ ${who}${ident} assigned to ${input.ownerName ?? "the agent"}${input.manager ? ` by ${input.manager}` : ""} — not touched after ~${Math.round(input.hours)}h.`];
  if (input.cardUrl) lines.push(`🗂 Card: ${input.cardUrl}`);
  return lines.join("\n");
}

// ─── Booking broadcast message (stage → Successful) ─────────────────────────

export function buildBookingLine(o: OppRecord, cardBaseUrl: string): string {
  const num = leadNo(o) ? `#${leadNo(o)}` : "—";
  const name = o.name ?? "(unnamed)";
  const car = carLabel(o);
  const dates = dateSpan(o);
  const aed = o.valueMicros != null ? `${Math.round(o.valueMicros / 1_000_000)} AED` : "";
  const parts = [`✅ Booking ${num}`, name];
  if (car) parts.push(car);
  if (dates) parts.push(dates);
  if (aed) parts.push(aed);
  const link = `${cardBaseUrl.replace(/\/$/, "")}/object/opportunity/${o.id}`;
  return `${parts.join(" · ")}\n${link}`;
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

export interface PendingReassign {
  ownerId: string;
  assignedAt: string; // ISO — the moment the delegation was seen
  warnedAt: string | null; // ISO — the follow-up nudge was already sent
  lead: string | null;
  name: string | null;
  manager: string | null;
  ownerEmail: string | null;
}

export interface RentalAutomationState {
  /** Prior observed value per opportunity id (for stage/owner diffing). */
  snapshot: Record<string, OppSnapshot>;
  /** Delegations waiting for the owner to touch the lead (follow-up monitor). */
  pendingReassign: Record<string, PendingReassign>;
  /** Last Dubai day (YYYY-MM-DD) the digest fired — once per day. */
  digestSentDay: string | null;
}

export function emptyState(): RentalAutomationState {
  return { snapshot: {}, pendingReassign: {}, digestSentDay: null };
}

export function loadState(raw: string): RentalAutomationState {
  try {
    const parsed = JSON.parse(raw) as Partial<RentalAutomationState>;
    return {
      snapshot: (parsed.snapshot && typeof parsed.snapshot === "object" ? parsed.snapshot : {}) as Record<string, OppSnapshot>,
      pendingReassign: (parsed.pendingReassign && typeof parsed.pendingReassign === "object"
        ? parsed.pendingReassign
        : {}) as Record<string, PendingReassign>,
      digestSentDay: typeof parsed.digestSentDay === "string" ? parsed.digestSentDay : null,
    };
  } catch {
    return emptyState();
  }
}

export function serializeState(state: RentalAutomationState): string {
  return JSON.stringify(state, null, 1);
}

// ─── Dependencies + pass ────────────────────────────────────────────────────

export interface RentalAutomationDeps {
  client: TwentyClient;
  nextLeadNumber: LeadNumberSource;
  db: PlatformDb;
  /** Telegram DM sender (shared staff-DM helper). */
  send: (chatId: string, text: string) => Promise<void>;
  /** WhatsApp sender (wa_outbox enqueue; the observer bridge drains it). */
  sendWhatsApp?: (phoneDigits: string, text: string) => Promise<void>;
  /** Resolve a Telegram chat_id for a phone tail9 (telegram_link). */
  resolveChat: (phoneTail9: string) => Promise<string | null>;
  /** workspaceMember email → full phone digits (or "" when not on file). */
  ownerPhones: Record<string, string>;
  /** workspaceMember email → display name fallback. */
  ownerNames: Record<string, string>;
  /** e.g. https://rent.takeauto.tech */
  cardBaseUrl: string;
  state: RentalAutomationState;
  /** Injectable clock for tests. */
  now: Date;
  /** Dubai day label for the digest header ("2026-08-28"). */
  dayLabel: string;
  /** Hour of the Dubai day (for the 08:00 digest gate). */
  hourDubai: number;
  /** Booking-group poster (stage → Successful). Null = no channel configured. */
  sendBooking?: (text: string) => Promise<void> | null;
  /** Follow-up window for an untouched reassigned lead, in ms. */
  reassignFollowUpMs?: number;
  /** The rental manager's workspace email — gets the "still untouched" reports. */
  managerEmail?: string;
}

export interface RentalAutomationCounts {
  scanned: number;
  numbered: number;
  returningLeads: number;
  returningNotes: number;
  stageStamps: number;
  followUpIncrements: number;
  bookingStamps: number;
  ownerPings: number;
  ownerPingsSkipped: number;
  ownerPingsWhatsApp: number;
  bookingBroadcasts: number;
  bookingBroadcastsSkipped: number;
  followUpsSent: number;
  managerReports: number;
  digestSent: number;
  digestSkipped: number;
  errors: string[];
}

export interface RentalAutomationOptions {
  commit: boolean;
  /** Force the digest (for tests / manual runs), bypassing the 08:00 gate. */
  forceDigest?: boolean;
  logger?: (line: string) => void;
}

const BITRIX_SOURCE = "bitrix24";
const DIGEST_HOUR = 8; // 08:00 GST
const DEFAULT_FOLLOW_UP_MS = 3 * 3_600_000; // 3 hours

export async function runRentalAutomationsPass(
  deps: RentalAutomationDeps,
  opts: RentalAutomationOptions
): Promise<RentalAutomationCounts> {
  const counts: RentalAutomationCounts = {
    scanned: 0,
    numbered: 0,
    returningLeads: 0,
    returningNotes: 0,
    stageStamps: 0,
    followUpIncrements: 0,
    bookingStamps: 0,
    ownerPings: 0,
    ownerPingsSkipped: 0,
    ownerPingsWhatsApp: 0,
    bookingBroadcasts: 0,
    bookingBroadcastsSkipped: 0,
    followUpsSent: 0,
    managerReports: 0,
    digestSent: 0,
    digestSkipped: 0,
    errors: [],
  };
  const log = opts.logger ?? (() => {});

  // Full scan — the rental book is ~300 opportunities, well under the
  // 100 req/min workspace budget even at a 60s poll.
  const opps: OppRecord[] = [];
  for await (const rec of deps.client.listAll<Record<string, unknown>>("opportunities")) {
    opps.push(mapOpp(rec));
  }
  counts.scanned = opps.length;

  const live = opps.filter((o) => !o.deletedAt);
  const byId = new Map(live.map((o) => [o.id, o]));

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
  const phoneForEmail = (email: string | null): string => (email ? deps.ownerPhones[email] ?? "" : "");

  // ── 1. Numbering (oldest first) ────────────────────────────────────────────
  const toNumber = live
    .filter((o) => !o.leadNumber && o.externalSource !== BITRIX_SOURCE)
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id.localeCompare(b.id));

  for (const o of toNumber) {
    if (!opts.commit) {
      counts.numbered++;
      log(`[rental-auto] would number ${o.id} (${o.name ?? "unnamed"})`);
      continue;
    }
    try {
      const n = await deps.nextLeadNumber();
      await deps.client.patch(`opportunities/${o.id}`, { leadNumber: String(n) });
      o.leadNumber = String(n);
      counts.numbered++;
      log(`[rental-auto] numbered #${n} ${o.id}`);
    } catch (e) {
      counts.errors.push(`number ${o.id}: ${msg(e)}`);
    }
  }

  // ── 2. Returning-lead detection ────────────────────────────────────────────
  // Index: phoneTail9 → closed (COMPLETED/UNSUCCESSFUL_DEAL) opportunities.
  const closedByTail = new Map<string, { createdAt: string; car: string; outcome: string; id: string }[]>();
  for (const o of live) {
    const tail = o.phoneTail9;
    if (!tail || !isClosedStage(o.stage)) continue;
    const list = closedByTail.get(tail) ?? [];
    list.push({
      createdAt: o.createdAt ?? "",
      car: carLabel(o),
      outcome: o.stage === STAGE_WON ? "Successful" : "Lost",
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
    log(`[rental-auto] returning lead ${o.id}: ${prior.length} prior closed opps`);

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
      await deps.client.patch(`opportunities/${o.id}`, {
        stage: STAGE_RETURNING_LEAD,
        stageChangedAt: o.updatedAt ?? new Date(deps.now).toISOString(),
      });
      o.stage = STAGE_RETURNING_LEAD;
      counts.returningLeads++;
      counts.returningNotes++;
      log(`[rental-auto] set RETURNING_LEAD on ${o.id}`);
    } catch (e) {
      counts.errors.push(`returning ${o.id}: ${msg(e)}`);
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
      const stamp = o.updatedAt ?? new Date(deps.now).toISOString();
      const patchBody: Record<string, unknown> = { stageChangedAt: stamp };

      const enteringFollowUp = o.stage === STAGE_FOLLOW_UP && prev.stage !== STAGE_FOLLOW_UP;
      const enteringWon = o.stage === STAGE_WON && prev.stage !== STAGE_WON;

      if (enteringFollowUp) {
        const next = (o.followUpCount ?? 0) + 1;
        patchBody.followUpCount = next;
        o.followUpCount = next;
        counts.followUpIncrements++;
      }
      if (enteringWon && !o.bookingDate) {
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
      log(`[rental-auto] stage ${prev.stage} → ${o.stage} on ${o.id}${opts.commit ? " (stamped)" : ""}`);

      // ── 5. Booking broadcast (first entry into Successful) ─────────────────
      if (enteringWon) {
        if (deps.sendBooking) {
          const text = buildBookingLine(o, deps.cardBaseUrl);
          if (!opts.commit) {
            counts.bookingBroadcasts++;
            log(`[rental-auto] would post booking for ${o.id}: ${text.split("\n")[0]}`);
          } else {
            try {
              await deps.sendBooking(text);
              counts.bookingBroadcasts++;
              log(`[rental-auto] posted booking for ${o.id}`);
            } catch (e) {
              counts.errors.push(`booking ${o.id}: ${msg(e)}`);
            }
          }
        } else {
          counts.bookingBroadcastsSkipped++;
          log(`[rental-auto] booking channel not configured — skipped broadcast for ${o.id}`);
        }
      }
    }

    if (ownerChanged && o.ownerId) {
      // Delegation = the actor who changed it is NOT the new owner.
      const actor = o.updatedByWorkspaceMemberId;
      const isDelegation = actor !== o.ownerId;
      if (isDelegation) {
        const email = ownerEmailById(o.ownerId);
        const phone = phoneForEmail(email);
        const chatId = phone ? await deps.resolveChat(phoneTail9(phone) ?? "").catch(() => null) : null;
        const manager = ownerLabelById(actor);
        const text = buildReassignText({
          lead: leadNo(o),
          name: o.name,
          phone: o.phoneTail9,
          manager,
          cardUrl: `${deps.cardBaseUrl.replace(/\/$/, "")}/object/opportunity/${o.id}`,
          chatUrl: waMeLink(o.phoneFull),
        });

        if (!opts.commit) {
          counts.ownerPings++;
          log(`[rental-auto] would ping owner of ${o.id}: ${text}`);
        } else {
          // In-app note on the record is ALWAYS written (the "Twenty task on
          // the record" part of the requirement) — the Telegram ping is the
          // conditional part (owner has a resolvable chat).
          try {
            const created = await deps.client.batchCreate("notes", [
              { title: "Lead reassigned", bodyV2: { markdown: text, blocknote: null } },
            ]);
            const noteId = (created[0] as Record<string, unknown> | undefined)?.id;
            if (typeof noteId === "string") {
              await deps.client.batchCreate("noteTargets", [{ noteId, targetOpportunityId: o.id }]);
            }
          } catch (e) {
            counts.errors.push(`reassignNote ${o.id}: ${msg(e)}`);
          }
          if (chatId) {
            try {
              await deps.send(chatId, text);
              counts.ownerPings++;
              log(`[rental-auto] pinged owner of ${o.id}`);
            } catch (e) {
              counts.errors.push(`ownerPing ${o.id}: ${msg(e)}`);
            }
          } else {
            counts.ownerPingsSkipped++;
            log(`[rental-auto] owner of ${o.id} has no telegram chat — in-app note only`);
          }
          // WhatsApp leg: same text to the owner's full number via wa_outbox
          // (the observer bridge drains it with its ban-safety guards). A WA
          // failure must not eat the Telegram ping or the follow-up tracking.
          if (phone && deps.sendWhatsApp) {
            try {
              await deps.sendWhatsApp(phone, text);
              counts.ownerPingsWhatsApp++;
              log(`[rental-auto] pinged owner of ${o.id} on WhatsApp`);
            } catch (e) {
              counts.errors.push(`ownerPingWA ${o.id}: ${msg(e)}`);
            }
          }
        }

        // Track for the follow-up monitor (only on commit, so the state only
        // advances when the ping actually had a chance to fire).
        if (opts.commit) {
          deps.state.pendingReassign[o.id] = {
            ownerId: o.ownerId,
            assignedAt: new Date(deps.now).toISOString(),
            warnedAt: null,
            lead: leadNo(o),
            name: o.name,
            manager,
            ownerEmail: email,
          };
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

  // ── 4b. Reassignment follow-up monitor ─────────────────────────────────────
  const followUpMs = deps.reassignFollowUpMs ?? DEFAULT_FOLLOW_UP_MS;
  for (const [oppId, pending] of Object.entries(deps.state.pendingReassign)) {
    const o = byId.get(oppId);
    // Lead gone, owner changed again, or record edited since assignment → done.
    if (!o || o.ownerId !== pending.ownerId || (o.updatedAt && pending.assignedAt && o.updatedAt > pending.assignedAt)) {
      delete deps.state.pendingReassign[oppId];
      continue;
    }
    const ageMs = new Date(deps.now).getTime() - Date.parse(pending.assignedAt);
    if (ageMs < followUpMs || pending.warnedAt) continue;

    if (!opts.commit) {
      counts.followUpsSent++;
      log(`[rental-auto] would follow up on reassigned ${oppId} (${pending.name ?? "unnamed"})`);
      continue;
    }
    try {
      const phone = phoneForEmail(pending.ownerEmail);
      const chatId = phone ? await deps.resolveChat(phoneTail9(phone) ?? "").catch(() => null) : null;
      if (chatId) {
        await deps.send(
          chatId,
          buildReassignFollowUpText({
            lead: pending.lead,
            name: pending.name,
            manager: pending.manager,
            hours: ageMs / 3_600_000,
            cardUrl: `${deps.cardBaseUrl.replace(/\/$/, "")}/object/opportunity/${oppId}`,
          })
        );
      }
      // Report back to the manager regardless of the owner's chat.
      const managerPhone = phoneForEmail(deps.managerEmail ?? null);
      const managerChat = managerPhone
        ? await deps.resolveChat(phoneTail9(managerPhone) ?? "").catch(() => null)
        : null;
      if (managerChat) {
        await deps.send(
          managerChat,
          buildReassignManagerReport({
            lead: pending.lead,
            name: pending.name,
            ownerName: ownerLabelById(pending.ownerId),
            manager: pending.manager,
            hours: ageMs / 3_600_000,
            cardUrl: `${deps.cardBaseUrl.replace(/\/$/, "")}/object/opportunity/${oppId}`,
          })
        );
        counts.managerReports++;
      }
      pending.warnedAt = new Date(deps.now).toISOString();
      counts.followUpsSent++;
      log(`[rental-auto] followed up on reassigned ${oppId}`);
    } catch (e) {
      counts.errors.push(`followUp ${oppId}: ${msg(e)}`);
    }
  }

  // ── 6. Daily digest (08:00 GST, once per day) ──────────────────────────────
  const dueNow = opts.forceDigest || deps.hourDubai === DIGEST_HOUR;
  if (dueNow && deps.state.digestSentDay !== deps.dayLabel) {
    const openByOwner = new Map<string, OpenLeadLine[]>();
    const ownerOrder: string[] = [];
    for (const o of live) {
      if (!o.ownerId || !isOpenStage(o.stage)) continue;
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
      const phone = phoneForEmail(email);
      const label = deps.ownerNames[email] ?? email;
      const chatId = phone ? await deps.resolveChat(phoneTail9(phone) ?? "").catch(() => null) : null;
      const messages = buildDigestMessages(
        { agentLabel: label, openLeads: openByOwner.get(email)! },
        deps.cardBaseUrl,
        deps.dayLabel
      );
      if (!opts.commit) {
        counts.digestSent++;
        log(`[rental-auto] would digest ${label}: ${messages.length} message(s)`);
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
        log(`[rental-auto] digest sent to ${label}`);
      } else {
        counts.digestSkipped++;
        log(`[rental-auto] digest skipped for ${label} — no telegram chat`);
      }
    }

    if (opts.commit) {
      deps.state.digestSentDay = deps.dayLabel;
    }
  }

  return counts;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

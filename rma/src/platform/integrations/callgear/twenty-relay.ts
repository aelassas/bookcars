// CallGear → Twenty CRM realtime lead relay (the projector for
// integration_event rows written by the callgear webhook).
//
// Architecture mirrors the rest of the integration layer: PURE decision
// logic (precheckRelay / planCallRelay — no IO, fully unit-testable, same
// pattern as twenty-apps/pipelines/src/shared/pipeline-logic.ts) separated
// from the adapters that talk to the platform DB (RelayStore) and to Twenty
// (RelayTwenty, wrapping the existing TwentyClient — never a raw fetch).
//
// Lifecycle of one event:
//   queued ──claim──▶ processing ──ok──▶ done
//                        │  ├─ transient Twenty error (429/5xx/timeout) ─▶ failed (retried next pass)
//                        │  └─ permanent error (HTTP 4xx, bad phone) ─────▶ dead   (never retried)
// A relay that dies mid-event leaves rows in 'processing'; the claim pass
// re-queues rows stuck there (received long ago — a live claim finishes in
// seconds), so a crash loses at most a delay, never the lead.
//
// Dedupe contract:
//   - Person:      phoneTail9 lookup (the platform's standard matching key).
//     The per-call externalId is NOT stable across repeat calls from the same
//     number and is not the dedupe key — it exists for provenance only.
//   - Opportunity: externalId `callgear:<callId>` — looked up BEFORE any
//     create, so a crash between create and settle retries safely.

import { eq, sql } from "drizzle-orm";
import { db as platformDb } from "@/platform/db/client";
import { integrationEvent, tenant } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { normalizePhone, type NormalizedPhone } from "@/platform/normalize/phone";
import { log } from "@/platform/log";
import { displayAgentName } from "./agent-name";
import type { LeadNumberSource } from "../twenty/lead-number";
import { brandLineForTenantSlug, twentyPhoneFields } from "../twenty/mirror";
import { waLinksField } from "../twenty/deal-link";
import type { TwentyClient, TwentyListPage } from "../twenty/client";
import type { CallGearCallFinishedParams, CallGearCallFinishedRequest } from "./types";

// ─── Pure decision logic ────────────────────────────────────────────────────

/** Opportunity externalId namespace — the idempotency key for one call. */
export function callOpportunityExternalId(callId: string): string {
  return `callgear:${callId}`;
}

/**
 * Fields an opportunity MUST carry for the relay to be safe at all. Losing
 * name/stage/pointOfContact means a broken or non-standard workspace — fail
 * loudly (event → failed) rather than write a record we cannot re-identify
 * on retry (no externalId → duplicate on the next pass).
 *
 * Metadata names the person relation `pointOfContact` (RELATION) while the
 * REST write takes the FK as `pointOfContactId` — accept either name here,
 * the create body keeps using `pointOfContactId`.
 *
 * Everything else (stageDetail, brandLine, recording, callDurationSeconds,
 * callDirection, callStartedAt, callAgentName) is OPTIONAL: written only when
 * workspace metadata discovery says the field exists, skipped with one log
 * line otherwise — the relay must never crash on a workspace that predates
 * the call-metadata fields.
 */
/** LINKS composite for the call recording (see waLinksField in twenty/deal-link.ts). */
export function callRecordingLinks(url: string): Record<string, unknown> {
  return { primaryLinkUrl: url, primaryLinkLabel: "Call recording", secondaryLinks: [] };
}

/**
 * Where the call came from, in one line the manager can read without opening
 * anything: which line scenario answered it, which site/campaign produced the
 * number, and whatever the operator tagged it with. CallGear has always sent
 * this (scenario_name / site_domain_name / advertising_campaign / tag_names) —
 * we simply threw it away, which is why every card read like an anonymous
 * ring. Empty parts are dropped, so a bare call still yields a clean string.
 */
export function formatCallSource(metadata: Record<string, unknown> | undefined): string | undefined {
  if (!metadata) return undefined;
  const part = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;
  const tags = Array.isArray(metadata.tags)
    ? (metadata.tags as unknown[]).filter((t): t is string => typeof t === "string" && !!t.trim())
    : [];
  const pieces = [part(metadata.scenario), part(metadata.site), part(metadata.campaign), ...tags].filter(
    (p): p is string => !!p
  );
  return pieces.length ? pieces.join(" · ") : undefined;
}

const REQUIRED_OPPORTUNITY_FIELDS = ["name", "stage", "externalId", "externalSource"];
const POINT_OF_CONTACT_METADATA_NAMES = ["pointOfContact", "pointOfContactId"];

export type RelayPrecheck =
  | { proceed: true; phone: NormalizedPhone & { e164: string; tail9: string } }
  | { proceed: false; outcome: "done" | "dead"; reason: string };

/**
 * Cheap gates that need no Twenty state: direction and caller phone.
 *
 * Only INBOUND calls create leads: an outbound call is an agent phoning a
 * known customer — projecting it would manufacture a "new lead" out of
 * ordinary work and spam the top of the funnel.
 */
export function precheckRelay(params: CallGearCallFinishedParams): RelayPrecheck {
  if (params.direction !== "inbound") {
    return { proceed: false, outcome: "done", reason: `non-inbound call (${params.direction})` };
  }
  const phone = normalizePhone(params.from);
  if (!phone.valid || !phone.e164 || !phone.tail9) {
    return { proceed: false, outcome: "dead", reason: "invalid caller phone" };
  }
  return {
    proceed: true,
    phone: { e164: phone.e164, tail9: phone.tail9, valid: true, reason: null },
  };
}

export interface RelayPlanInput {
  params: CallGearCallFinishedParams;
  /** Validated caller phone from precheckRelay. */
  phone: { e164: string; tail9: string };
  /** Twenty person id matched by phoneTail9, null when unknown. */
  existingPersonId: string | null;
  /** Twenty opportunity id matched by `callgear:<callId>`, null when absent. */
  existingOpportunityId: string | null;
  /** Field names present on the Twenty opportunity object (metadata discovery). */
  opportunityFields: ReadonlySet<string>;
  /** Tenant's business line, null when unmapped — omitted, never guessed. */
  brandLine: string | null;
  /**
   * Top-of-funnel stage for the NEW opportunity, per the target workspace's
   * own stage enum. Sales uses `NEW`; the rental workspace renamed its
   * pipeline (`NEW_REQUEST`, `IN_PROGRESS`, …) and rejects `NEW` with a 400.
   */
  newStage?: string;
  /**
   * Twenty workspaceMember id of the agent who answered this call, when the
   * name resolves to exactly one member (see matchMemberForAgent). Set as the
   * card's owner — "the responsible" the desk filters by (owner 2026-08-14).
   */
  ownerId?: string | null;
}

export type RelayPlan =
  | { action: "already_relayed" }
  | { action: "workspace_broken"; missing: string[] }
  | {
      action: "create_lead";
      /** reuse = phoneTail9 match; create = payload for POST /rest/people. */
      person: { kind: "reuse"; id: string } | { kind: "create"; payload: Record<string, unknown> };
      /** POST /rest/opportunities body, MINUS pointOfContactId (the adapter
       *  fills it once the person id is known). */
      opportunity: Record<string, unknown>;
      /** Optional fields dropped because the workspace does not have them. */
      skippedFields: string[];
    };

/** Split "First Last …" the same way the mirror does for Twenty's FULL_NAME. */
function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  const [first, ...rest] = parts;
  return { firstName: first, lastName: rest.join(" ") };
}

/**
 * "2026-08-10T07:47:55Z" → "2026-08-10 11:47" — the time the phone actually
 * rang, in Dubai. The card title is read by people sitting in Dubai; a UTC
 * stamp made an 11:47 call look like it happened at 07:47 and turned every
 * "which call was this?" into arithmetic.
 */
const OFFICE_TIME_ZONE = "Asia/Dubai";

export function callTimestamp(startTime: string): string {
  const ms = Date.parse(startTime);
  if (Number.isNaN(ms)) return startTime;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    // hourCycle, NOT `hour12: false` — they are not the same thing. On the
    // Node the beats actually run (homebrew node@20) `hour12: false` selects
    // the h24 cycle and numbers the midnight hour 24, so every card created
    // between 00:00 and 00:59 was named "2026-09-01 24:28". Newer Node returns
    // 00 for both, which is why an ad-hoc check over SSH did not reproduce it.
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const at = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${at("year")}-${at("month")}-${at("day")} ${at("hour")}:${at("minute")}`;
}

/**
 * Plan the Twenty writes for one inbound call. Pure: every decision the relay
 * makes is visible here, and the adapters only execute what it returns.
 */
export function planCallRelay(input: RelayPlanInput): RelayPlan {
  const { params, phone, opportunityFields } = input;

  // Crash-safe retry: the opportunity for this callId already exists — the
  // previous pass created it and died before stamping the event done.
  if (input.existingOpportunityId) return { action: "already_relayed" };

  const missing = REQUIRED_OPPORTUNITY_FIELDS.filter((f) => !opportunityFields.has(f));
  if (!POINT_OF_CONTACT_METADATA_NAMES.some((f) => opportunityFields.has(f))) {
    missing.push("pointOfContact");
  }
  if (missing.length > 0) return { action: "workspace_broken", missing };

  const personPart: Extract<RelayPlan, { action: "create_lead" }>["person"] = input.existingPersonId
    ? { kind: "reuse", id: input.existingPersonId }
    : {
        kind: "create",
        payload: {
          name: params.customer?.name?.trim()
            ? splitName(params.customer.name)
            : // A nameless caller is labelled by its phone tail, NEVER "Unknown"
              // (that placeholder cost a manual dedupe once — see mirror.ts).
              { firstName: `+…${phone.tail9}`, lastName: "" },
          phones: { ...twentyPhoneFields(phone.e164), additionalPhones: [] },
          // Per-call id — NOT the dedupe key (see module header).
          externalId: `callgear-person:${params.callId}`,
          externalSource: "callgear",
          phoneTail9: phone.tail9,
          ...(input.brandLine ? { brandLine: input.brandLine } : {}),
        },
      };

  // A call CallGear reports with no talk time was never picked up. That is a
  // missed lead — the single most actionable thing on this board — so it is
  // named as such rather than left for the manager to infer from a 0.
  const answered = Number.isFinite(params.duration) && Number(params.duration) > 0;

  const wanted: Record<string, unknown> = {
    name: `Inbound call ${phone.e164} ${callTimestamp(params.startTime)}`,
    stage: input.newStage ?? "NEW",
    externalId: callOpportunityExternalId(params.callId),
    externalSource: "callgear",
    // What the manager needs to know at a glance, in the field the card shows
    // second. "call.finished" is our transport's word for it and told a human
    // nothing; whether anybody picked up is the whole point of the card.
    stageDetail: answered ? "Answered call" : "Missed call",
    // The caller's number ON the opportunity, not only inside its title. The
    // title is readable but not clickable, and phoneTail9 is also how the
    // WhatsApp stitcher and the mirror find this deal later.
    phoneTail9: phone.tail9,
    // LINKS composite → a clickable "message this customer" straight from the
    // card. Same helper the deal mirror uses, so both surfaces behave alike.
    // Built from the NORMALIZED number, not the provider's raw `from`: CallGear
    // sends "00971…" and spaced forms too, and the WhatsApp deep link 404s on those.
    ...waLinksField(phone.e164),
    ...(input.brandLine ? { brandLine: input.brandLine } : {}),
    // LINKS composite (see waLinksField in twenty/deal-link.ts) — the only
    // field type Twenty renders as a clickable anchor. Left unset entirely
    // when CallGear sent no recording.
    ...(params.recordingUrl ? { recording: callRecordingLinks(params.recordingUrl) } : {}),
    ...(Number.isFinite(params.duration) ? { callDurationSeconds: params.duration } : {}),
    // SELECT options are stored UPPER_SNAKE (see schema-bootstrap selectOptions).
    callDirection: String(params.direction).toUpperCase(),
    // A malformed timestamp would earn a Twenty 400 and kill the event.
    ...(Number.isNaN(Date.parse(params.startTime)) ? {} : { callStartedAt: params.startTime }),
    // The agent belongs to THIS call, not to the caller — so it goes on the
    // opportunity, and only when CallGear actually named one. Displayed in
    // English, Bitrix prefix stripped (see agent-name.ts).
    ...(displayAgentName(params.agent?.name) ? { callAgentName: displayAgentName(params.agent?.name) } : {}),
    // The responsible (owner 2026-08-14): the agent who ANSWERED owns the
    // card, so the desk filters the board per person. Core field — bypasses
    // the custom-fields gate below. Set only when the name resolved to
    // exactly one member; a manager still assigns the rest by hand.
    ...(input.ownerId ? { ownerId: input.ownerId } : {}),
    // Where the lead came from — line scenario, site, campaign, operator tags.
    // Without it every inbound call reads as an anonymous ring and nobody can
    // tell an Instagram enquiry from a walk-in caller.
    ...(formatCallSource(params.metadata) ? { callSource: formatCallSource(params.metadata) } : {}),
  };

  const opportunity: Record<string, unknown> = {};
  const skippedFields: string[] = [];
  for (const [key, value] of Object.entries(wanted)) {
    // Required fields were checked above; this filters the OPTIONAL ones.
    // ownerId is a CORE field — always writable, never in the custom set.
    if (REQUIRED_OPPORTUNITY_FIELDS.includes(key) || key === "ownerId" || opportunityFields.has(key)) {
      opportunity[key] = value;
    } else {
      skippedFields.push(key);
    }
  }

  return { action: "create_lead", person: personPart, opportunity, skippedFields };
}

/**
 * One call reaches us as TWO notifications: "call ended" carries the talk
 * time, "recording ready" carries the file and the campaign attribution.
 * Whichever arrives second used to be dropped on the floor as
 * `already_relayed` (bar the recording), which is why a picked-up call could
 * sit on the board reading "Missed call", 0 seconds, no recording, nothing to
 * transcribe. Both halves now land on the same card.
 *
 * The rule is FILL THE BLANKS, never clobber: a field already carrying a
 * value is left alone, because a manager may have typed it. The one exception
 * is the answered/missed verdict — "Missed call" written from a payload with
 * no talk time is not an opinion, it is a stale fact, and a later event that
 * proves the call was answered corrects it.
 */
export function planCallEnrich(input: {
  params: CallGearCallFinishedParams;
  existing: Record<string, unknown>;
  opportunityFields: ReadonlySet<string>;
  /** Resolved owner for the answering agent — fills a blank ownerId only. */
  ownerId?: string | null;
}): Record<string, unknown> {
  const { params, existing, opportunityFields } = input;
  const patch: Record<string, unknown> = {};
  const blank = (key: string): boolean => {
    const v = existing[key];
    return v === null || v === undefined || v === "" || (typeof v === "number" && v === 0);
  };
  const put = (key: string, value: unknown): void => {
    if (opportunityFields.has(key)) patch[key] = value;
  };

  if (params.recordingUrl && !(existing.recording as { primaryLinkUrl?: string } | null)?.primaryLinkUrl) {
    put("recording", callRecordingLinks(params.recordingUrl));
  }

  const duration = Number(params.duration);
  if (Number.isFinite(duration) && duration > 0) {
    // Talk time from a later event beats a 0 (or a shorter recording length).
    if (duration > Number(existing.callDurationSeconds ?? 0)) put("callDurationSeconds", duration);
    if (existing.stageDetail === "Missed call") put("stageDetail", "Answered call");
  }

  const agentDisplay = displayAgentName(params.agent?.name);
  if (agentDisplay && blank("callAgentName")) put("callAgentName", agentDisplay);
  // The answering agent owns the card — fill a blank owner only, never take
  // a card away from a manager (or another agent) who already holds it.
  // Core field, so it bypasses put()'s custom-fields gate.
  if (input.ownerId && blank("ownerId")) patch.ownerId = input.ownerId;
  if (blank("callStartedAt") && !Number.isNaN(Date.parse(params.startTime))) {
    put("callStartedAt", params.startTime);
  }
  const source = formatCallSource(params.metadata);
  if (source && blank("callSource")) put("callSource", source);

  return patch;
}

// ─── Error classification ───────────────────────────────────────────────────

/**
 * Twenty 4xx (except 429) means the payload is rejected as-is — retrying the
 * SAME body forever just burns the rate budget, so the event goes 'dead'.
 * 429/5xx/timeouts/network resets are transient: the event stays retryable.
 * The status code survives in the client's error message ("Twenty POST …
 * HTTP 400: …"); the message never carries the API key or full URL.
 */
export function isPermanentTwentyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code = Number(msg.match(/HTTP (\d{3})/)?.[1]);
  return Number.isInteger(code) && code >= 400 && code < 500 && code !== 429;
}

// ─── Adapter interfaces (faked in tests) ────────────────────────────────────

export interface ClaimedCallEvent {
  id: string;
  tenantId: string;
  callId: string;
  /** Parsed call.finished params; null when rawPayload is malformed. */
  params: CallGearCallFinishedParams | null;
}

export type RelayOutcome =
  | { status: "done" }
  | { status: "failed" | "dead"; error: string };

export interface RelayStore {
  /**
   * Race-safe claim of up to `batchSize` queued/failed callgear events across
   * all tenants, flipped to 'processing'. Must be safe against a concurrent
   * relay and the webhook writer.
   */
  claim(batchSize: number): Promise<ClaimedCallEvent[]>;
  /** Final stamp for one event (see the lifecycle in the module header). */
  settle(eventId: string, tenantId: string, outcome: RelayOutcome): Promise<void>;
  /** Tenant slug for brandLine resolution; null when the tenant is gone. */
  tenantSlug(tenantId: string): Promise<string | null>;
}

export interface RelayTwenty {
  findPersonByTail9(tail9: string): Promise<{ id: string } | null>;
  /**
   * The WHOLE record, not just its id: the second notification of a call has
   * to see which facts the card is still missing before it can fill them in
   * (see planCallEnrich).
   */
  findOpportunityByExternalId(
    externalId: string
  ): Promise<({ id: string } & Record<string, unknown>) | null>;
  createPerson(payload: Record<string, unknown>): Promise<{ id: string }>;
  createOpportunity(payload: Record<string, unknown>): Promise<{ id: string }>;
  /** Fill in the blanks on an existing call card (recording, talk time, …). */
  patchOpportunity(id: string, patch: Record<string, unknown>): Promise<void>;
}

export interface RelayDeps {
  store: RelayStore;
  twenty: RelayTwenty;
  /** Discovered once at startup — see discoverOpportunityFields. */
  opportunityFields: ReadonlySet<string>;
  /**
   * Per-tenant instance routing. The holding runs TWO Twenty deployments
   * (default = sales, rental = Cardiwan/EasyRent) with separate workspaces —
   * a rental-brand call MUST land in the rental workspace, never the sales
   * one. When present, this wins over the shared `twenty`/`opportunityFields`
   * (which stay as the default-instance fallback); an `{ error }` result
   * fails the event transiently so it retries once the instance is
   * configured — falling back to the other instance would leak one brand's
   * leads into the other brand's book.
   */
  routeForTenant?: (
    tenantId: string
  ) => Promise<
    | {
        twenty: RelayTwenty;
        opportunityFields: ReadonlySet<string>;
        newStage?: string;
        /**
         * The counter of the board this call is written to.
         *
         * Both relays feed the same rental board, so they must share ITS
         * sequence. Numbering from the relay's default instead put a "#13
         * Inbound call" beside a "#13 WhatsApp direct" (Ayham, 2026-09-01) —
         * the number has to follow the card, not the process that made it.
         */
        nextLeadNumber?: LeadNumberSource;
        /**
         * Responsible-agent resolution for THIS instance (owner 2026-08-14):
         * display agent name → workspaceMember id, null when unknown or
         * ambiguous. Per-instance because each workspace has its own members.
         */
        ownerIdForAgent?: (agentDisplayName: string) => string | null;
      }
    | { error: string }
  >;
  /**
   * Serial allocator for NEW cards (platform sequence — race-safe across both
   * lead relays). Absent = unnumbered cards (tests); present + the routed
   * workspace has leadNumber → `#N` on the card name + leadNumber field.
   */
  nextLeadNumber?: LeadNumberSource;
}

export interface RelayPassReport {
  claimed: number;
  done: number;
  failed: number;
  dead: number;
  /** Optional opportunity fields skipped (workspace lacks them), union over the pass. */
  skippedFields: string[];
}

// ─── Orchestration ──────────────────────────────────────────────────────────

async function relayOne(deps: RelayDeps, event: ClaimedCallEvent): Promise<"done" | "failed" | "dead"> {
  const settle = (outcome: RelayOutcome) => deps.store.settle(event.id, event.tenantId, outcome);

  try {
    // Routing FIRST: every Twenty call below (idempotency lookup included)
    // must hit the instance this tenant's workspace lives in.
    let twenty = deps.twenty;
    let opportunityFields = deps.opportunityFields;
    let newStage: string | undefined;
    let ownerIdForAgent: ((agentDisplayName: string) => string | null) | undefined;
    // The counter belongs to the BOARD, not to this process — see the route type.
    let routeLeadNumber: LeadNumberSource | undefined;
    if (deps.routeForTenant) {
      const routed = await deps.routeForTenant(event.tenantId);
      if ("error" in routed) {
        await settle({ status: "failed", error: routed.error.slice(0, 500) });
        return "failed";
      }
      twenty = routed.twenty;
      opportunityFields = routed.opportunityFields;
      newStage = routed.newStage;
      ownerIdForAgent = routed.ownerIdForAgent;
      routeLeadNumber = routed.nextLeadNumber;
    }

    if (!event.params) {
      await settle({ status: "dead", error: "malformed payload: no call.finished params" });
      return "dead";
    }

    const pre = precheckRelay(event.params);
    if (!pre.proceed) {
      if (pre.outcome === "dead") await settle({ status: "dead", error: pre.reason });
      else await settle({ status: "done" });
      return pre.outcome;
    }

    // Idempotency FIRST: a retried event must find its opportunity before any
    // create happens.
    const existingOpp = await twenty.findOpportunityByExternalId(
      callOpportunityExternalId(event.params.callId)
    );
    const existingPerson = existingOpp ? null : await twenty.findPersonByTail9(pre.phone.tail9);

    const slug = await deps.store.tenantSlug(event.tenantId);
    // The responsible (owner 2026-08-14): resolve the answering agent to the
    // workspace member once per event, use it on create AND on blank-fill
    // enrich. Unknown agent → null → card stays unowned, never guessed.
    const agentDisplay = displayAgentName(event.params.agent?.name);
    const ownerId = agentDisplay ? (ownerIdForAgent?.(agentDisplay) ?? null) : null;
    const plan = planCallRelay({
      params: event.params,
      phone: pre.phone,
      existingPersonId: existingPerson?.id ?? null,
      existingOpportunityId: existingOpp?.id ?? null,
      opportunityFields,
      brandLine: brandLineForTenantSlug(slug),
      newStage,
      ownerId,
    });

    if (plan.action === "already_relayed") {
      // The other half of this call (recording + attribution, or the talk time
      // if the recording landed first) — merge it into the card that exists.
      const patch = planCallEnrich({
        params: event.params,
        existing: existingOpp ?? {},
        opportunityFields,
        ownerId,
      });
      if (Object.keys(patch).length > 0 && existingOpp?.id) {
        await twenty.patchOpportunity(existingOpp.id, patch);
        log.info("callgear relay: enriched existing call card", {
          tenantId: event.tenantId,
          callId: event.params.callId,
          fields: Object.keys(patch),
        });
      }
      await settle({ status: "done" });
      return "done";
    }
    if (plan.action === "workspace_broken") {
      // No HTTP code → classified transient: the lead retries every pass and
      // relays as soon as the operator fixes the workspace schema.
      throw new Error(`Twenty opportunity metadata missing required fields: ${plan.missing.join(", ")}`);
    }

    for (const f of plan.skippedFields) {
      log.warn("callgear relay: opportunity field not in workspace metadata, skipped", {
        tenantId: event.tenantId,
        field: f,
      });
    }

    const personId =
      plan.person.kind === "reuse"
        ? plan.person.id
        : (await twenty.createPerson(plan.person.payload)).id;
    const payload: Record<string, unknown> = { ...plan.opportunity, pointOfContactId: personId };
    // Serial number: `#N` on the name + leadNumber field, from the platform
    // sequence (race-safe against the WhatsApp/Telegram relay).
    const leadNumberSource = routeLeadNumber ?? deps.nextLeadNumber;
    if (leadNumberSource && opportunityFields.has("leadNumber")) {
      const n = await leadNumberSource();
      payload.leadNumber = String(n);
      payload.name = `#${n} ${payload.name}`;
    }
    await twenty.createOpportunity(payload);
    await settle({ status: "done" });
    return "done";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isPermanentTwentyError(err)) {
      await settle({ status: "dead", error: message.slice(0, 500) });
      return "dead";
    }
    await settle({ status: "failed", error: message.slice(0, 500) });
    return "failed";
  }
}

/** One relay pass: claim a batch, project each event, report the tallies. */
export async function runRelayPass(deps: RelayDeps, batchSize: number): Promise<RelayPassReport> {
  const events = await deps.store.claim(batchSize);
  const report: RelayPassReport = { claimed: events.length, done: 0, failed: 0, dead: 0, skippedFields: [] };
  for (const event of events) {
    const result = await relayOne(deps, event);
    report[result]++;
  }
  return report;
}

// ─── Twenty adapter (over the existing client) ──────────────────────────────

/** Twenty list pages key their rows by the object path ("people", …). */
function firstRow<T>(page: TwentyListPage<T>, objectPath: string): T | null {
  const rows = page.data?.[objectPath] ?? Object.values(page.data ?? {}).find(Array.isArray) ?? [];
  return rows[0] ?? null;
}

/** Create echoes differ between live ("createPerson") and mock ("createpeople")
 *  — read the id off whatever single record came back instead of the key. */
function createdId(res: unknown): { id: string } {
  const data = (res as { data?: Record<string, unknown> }).data ?? {};
  const rec = Object.values(data)[0] as { id?: unknown } | undefined;
  if (!rec || typeof rec.id !== "string") {
    throw new Error("Twenty create returned no record id");
  }
  return { id: rec.id };
}

export function createTwentyRelay(client: TwentyClient): RelayTwenty {
  return {
    async findPersonByTail9(tail9) {
      const page = await client.get<TwentyListPage<Record<string, unknown>>>("people", {
        filter: `phoneTail9[eq]:${tail9}`,
        limit: 1,
      });
      const row = firstRow(page, "people");
      return row && typeof row.id === "string" ? { id: row.id } : null;
    },
    async findOpportunityByExternalId(externalId) {
      const page = await client.get<TwentyListPage<Record<string, unknown>>>("opportunities", {
        filter: `externalId[eq]:${externalId}`,
        limit: 1,
      });
      const row = firstRow(page, "opportunities");
      return row && typeof row.id === "string" ? (row as { id: string } & Record<string, unknown>) : null;
    },
    async createPerson(payload) {
      return createdId(await client.post("people", payload));
    },
    async createOpportunity(payload) {
      return createdId(await client.post("opportunities", payload));
    },
    async patchOpportunity(id, patch) {
      await client.patch(`opportunities/${id}`, patch);
    },
  };
}

/**
 * Discover the opportunity field list from workspace metadata. Called ONCE at startup
 * (not per event — metadata crawls are paginated and rate-limited).
 * A workspace without an opportunity object is not a Twenty workspace: throw.
 */
export async function discoverOpportunityFields(client: TwentyClient): Promise<Set<string>> {
  const objects = await client.metadata.listObjects();
  const opportunity = objects.find((o) => o.nameSingular === "opportunity");
  if (!opportunity) {
    throw new Error('Twenty object "opportunity" not found in workspace metadata');
  }
  const fields = await client.metadata.listFields();
  return new Set(fields.filter((f) => f.objectMetadataId === opportunity.id).map((f) => f.name));
}

// ─── Drizzle store (platform DB) ────────────────────────────────────────────

// Rows parked in 'processing' by a relay that died mid-event. A live claim
// finishes in seconds, so anything still 'processing' this long after
// RECEIPT is abandoned — requeue it rather than lose the lead forever.
const STALE_PROCESSING_MINUTES = 15;

function paramsFromRawPayload(raw: unknown): CallGearCallFinishedParams | null {
  const params = (raw as Partial<CallGearCallFinishedRequest> | null)?.params;
  if (!params || typeof params !== "object") return null;
  const p = params as Partial<CallGearCallFinishedParams>;
  if (typeof p.callId !== "string" || typeof p.from !== "string") return null;
  return p as CallGearCallFinishedParams;
}

/** node-postgres returns QueryResult; drizzle's typing hides the rows field. */
function sqlRows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

export function createDrizzleRelayStore(): RelayStore {
  return {
    async claim(batchSize) {
      const claimed: ClaimedCallEvent[] = [];

      // The tenant table is the tenancy root (no RLS) — safe to read from the
      // global pool, same as the webhook's token lookup does.
      const tenants = await platformDb.select({ id: tenant.id }).from(tenant);

      for (const t of tenants) {
        const remaining = batchSize - claimed.length;
        if (remaining <= 0) break;

        const rows = await withDrizzleTenant(t.id, async (tx) => {
          // Requeue claims abandoned by a dead relay (see STALE_PROCESSING_MINUTES).
          await tx.execute(sql`
            UPDATE integration_event
               SET processing_status = 'queued'
             WHERE provider = 'callgear'
               AND processing_status = 'processing'
               AND received_at < now() - ${`${STALE_PROCESSING_MINUTES} minutes`}::interval
          `);
          // Claim atomically: the status flip and the row lock happen in one
          // statement, and SKIP LOCKED lets a second relay instance (or the
          // webhook writer) overlap without ever handing one event to two
          // workers. Commits immediately — no DB transaction is held open
          // across the Twenty network calls that follow.
          const res = await tx.execute(sql`
            UPDATE integration_event
               SET processing_status = 'processing'
             WHERE id IN (
               SELECT id FROM integration_event
                WHERE provider = 'callgear'
                  AND processing_status IN ('queued', 'failed')
                ORDER BY received_at
                LIMIT ${remaining}
                FOR UPDATE SKIP LOCKED
             )
            RETURNING id, tenant_id, provider_event_id, raw_payload
          `);
          return sqlRows<{
            id: string;
            tenant_id: string;
            provider_event_id: string;
            raw_payload: unknown;
          }>(res);
        });

        for (const row of rows) {
          claimed.push({
            id: row.id,
            tenantId: row.tenant_id,
            callId: row.provider_event_id,
            params: paramsFromRawPayload(row.raw_payload),
          });
        }
      }
      return claimed;
    },

    async settle(eventId, tenantId, outcome) {
      await withDrizzleTenant(tenantId, async (tx) => {
        await tx
          .update(integrationEvent)
          .set(
            outcome.status === "done"
              ? // Clear any error left by an earlier failed attempt — the event
                // is done now, and a stale message reads as if it were not.
                { processingStatus: "done", processingError: null, processedAt: new Date() }
              : outcome.status === "dead"
                ? { processingStatus: "dead", processingError: outcome.error, processedAt: new Date() }
                : { processingStatus: "failed", processingError: outcome.error }
          )
          .where(eq(integrationEvent.id, eventId));
      });
    },

    async tenantSlug(tenantId) {
      const rows = await platformDb
        .select({ slug: tenant.slug })
        .from(tenant)
        .where(eq(tenant.id, tenantId))
        .limit(1);
      return rows[0]?.slug ?? null;
    },
  };
}

// RENTAL DISTRIBUTOR — the acceptance-window sweeper for main-line leads.
//
// The wa-lead relay DEALS a new main-line card (round-robin over the available
// agents of the brand's rotation) and records the assignment in
// twenty_mirror_state (entity rental_distribution). This sweeper enforces
// Ayham's 10-minute rule: if the assigned agent has not ACTED inside the
// acceptance window (RENTAL_ACCEPT_TIMEOUT_MIN, default 10), the card is
// reassigned to the next available agent, the previous one is recorded as
// "ignored", and the manager is told. Every transition (assigned / accepted /
// ignored / reassigned / all-busy) notifies the manager over WhatsApp from the
// main line (wa_outbox — the observer bridge drains it; nothing here touches
// Baileys).
//
// "Acted" — the acceptance signal, and why it is this trio:
//   1. An OUTBOUND WhatsApp row to the customer's tail9 (message table,
//      direction='outbound', tail matched across from/from_pn/to) newer than
//      the assignment — direct evidence an agent contacted the customer.
//   2. A 👍 REACTION from the assigned agent on the "🆕 Lead #N assigned to
//      you" ping (Ayham, 2026-09-19: a thumbs-up on the assignment message IS
//      the acceptance — no reassignment). The observer bridge records the
//      reaction in wa_reaction, keyed by the WA message id the drain stored on
//      wa_outbox at send time; the runner matches reactor→assignee by phone
//      tail9 (wa_identity fallback for @lid). Pinned emoji set in the runner.
//   3. The card's stage moved off the NEW band. The band is NEW_REQUEST AND
//      RETURNING_LEAD — the latter is flipped AUTOMATICALLY by
//      rental-automations' returning-lead detector with no agent involved, so
//      it must not count as acting.
//   The cheaper alternatives were rejected on evidence: `updatedAt` bumps when
//   the relay itself enriches the card or the automations stamp it, so any
//   note/field touch would mark every card "acted" without an agent lifting a
//   finger.
//
// IDEMPOTENT: each assignment record carries its own state (assignedAt /
// acceptedAt / ignoredNames / done), persisted after EVERY processed card
// (MERGE into twenty_mirror_state.counts — never overwrite). A re-run of the
// same pass finds accepted/manager-queue cards done and unexpired ones inside
// their window, and processes nothing twice.
//
// DRY-RUN BY DEFAULT — no Twenty writes, no outbox rows, no state moves until
// the runner passes --commit.
//
// REPLIES (Ayham, 2026-09-19) — acceptance is no longer only INFERRED: the
// agent can answer the assignment ping, and the manager can steer:
//   agent:  "1"/"ok"/"да"/"принял"/"✅" = accept · "2"/"нет"/"пас"/"next"/"❌"
//           = decline (immediate reassign, the declining agent excluded);
//   manager: "#<lead> next" = force-reassign · "#<lead> <name>" = assign to
//           that agent (works on manager-queue cards too — that's the whole
//           point of "all busy → come back to me").
// Each pass reads the bot/main lines' inbound rows since the last pass
// (cursor in twenty_mirror_state counts.botRepliesCursor), maps sender →
// roster/manager by phone tail9, and applies the command BEFORE the window
// sweep — an explicit answer beats a timeout, and a decline must not cost
// the customer ten silent minutes.

import type { TwentyClient } from "@/platform/integrations/twenty/client";
import { MIN_PHONE_MATCH_DIGITS } from "@/platform/messaging/phone";
import {
  AGENT_REPLY_HINT,
  MANAGER_STEER_HINT,
  renderText,
  nextAvailableAgent,
  type AgentAvailability,
  type DistributorTexts,
  type RentalRotationKey,
  type RotationAgent,
} from "@/modules/rental/rotation";
import {
  pruneRentalAssignments,
  type RentalAssignment,
} from "@/platform/integrations/twenty/wa-lead-relay";

// ─── Stage vocabulary (rental instance) ─────────────────────────────────────

/** Stages that do NOT count as "the agent acted" (see the header). */
export const UNACTED_STAGES: ReadonlySet<string> = new Set(["NEW_REQUEST", "RETURNING_LEAD"]);
/** Stages that mean the card is over — sweeping stops, silently. */
export const CLOSED_STAGES: ReadonlySet<string> = new Set(["COMPLETED", "UNSUCCESSFUL_DEAL"]);

/**
 * The acceptance signal. An outbound message to the customer is direct
 * evidence; a 👍 from the assigned agent on the assignment ping is the
 * agent saying yes (Ayham, 2026-09-19); a stage move counts only when it
 * leaves the NEW band (the RETURNING_LEAD flip is automatic, not an agent
 * acting).
 */
export function isAssignmentAccepted(
  stage: string | null,
  hadOutbound: boolean,
  hadReaction: boolean
): boolean {
  return hadOutbound || hadReaction || (!!stage && !UNACTED_STAGES.has(stage));
}

// ─── Bot-inbox reply parsing (Ayham, 2026-09-19) ────────────────────────────

/** One inbound row addressed to the notify/main line, sender resolved by the runner. */
export interface BotReplyRow {
  /** Sender digits when resolvable (from_pn / plain JID / wa_identity for @lid). */
  senderPhone: string | null;
  senderJid: string;
  body: string;
  at: Date;
}

// EXACT short tokens, never substrings — a sentence containing "ok" is
// chatter, not an acceptance. Case/space tolerant; trailing punctuation
// stripped ("1." = "1"). The sets are the owner's list, verbatim.
const ACCEPT_TOKENS: ReadonlySet<string> = new Set([
  "1", "ok", "yes", "да", "принял", "принято", "accept", "✅", "👍",
]);
const DECLINE_TOKENS: ReadonlySet<string> = new Set([
  "2", "no", "нет", "пас", "pass", "next", "❌",
]);

function normReply(body: string): string {
  return body.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!…;:]+$/u, "").trim();
}

/** What an agent's reply to the assignment ping means, or null (not a command). */
export function parseAgentReply(body: string | null | undefined): "accept" | "decline" | null {
  if (!body) return null;
  const t = normReply(body);
  if (ACCEPT_TOKENS.has(t)) return "accept";
  if (DECLINE_TOKENS.has(t)) return "decline";
  return null;
}

export type ManagerCommand =
  | { kind: "next"; lead: string }
  | { kind: "assign"; lead: string; name: string }
  | { kind: "invalid" } // started with "#" but garbled — the manager gets the help reply
  | null; // not a command at all (ordinary chatter)

/**
 * Manager steering: "#1053 next" / "#1053 дальше" forces a reassign,
 * "#1053 Ali" assigns directly. Anything else starting with # is invalid
 * (→ help reply); a message without # is not a command.
 */
export function parseManagerCommand(body: string | null | undefined): ManagerCommand {
  if (!body) return null;
  const t = body.trim();
  if (!t.startsWith("#")) return null;
  const m = /^#\s*(\d+)\s*([\s\S]*)$/.exec(t);
  if (!m) return { kind: "invalid" };
  const lead = String(Number(m[1])); // "#0105" === leadNumber "105"
  const rest = normReply(m[2] ?? "");
  if (!rest) return { kind: "invalid" };
  if (rest === "next" || rest === "дальше") return { kind: "next", lead };
  return { kind: "assign", lead, name: (m[2] ?? "").trim() };
}

/** Sent when a manager message starts with # but doesn't parse. */
export const MANAGER_HELP_TEXT =
  "Commands: #<lead> next — reassign to the next agent · #<lead> <name> — assign to that agent (e.g. #1053 Ali).";

export type AssignmentAction =
  | { kind: "none" } // inside the window — check again next pass
  | { kind: "close" } // card deleted or closed — stop tracking, no notifications
  | { kind: "accept" }
  | { kind: "reassign"; agent: RotationAgent; nextCursor: number }
  | { kind: "managerQueue" };

/**
 * What should happen to one tracked assignment RIGHT NOW. Pure — the pass
 * performs the IO. Every agent who already let this card age out is EXCLUDED
 * from the re-pick, not just the current one: without the history the card
 * cycles the whole roster forever (a re-assign to Babek dedupes on
 * `assign:<opp>:Babek`, so he is not even TOLD the card is his again), which
 * is exactly the "it reassigns every 10 minutes" chaos Ayham reported
 * 2026-09-18 — cards #1011/#1015 had 9-11 ignores each. When everyone on the
 * roster has ignored it, the card falls to the manager queue.
 */
export function planAssignmentAction(input: {
  assignment: RentalAssignment;
  stage: string | null;
  deleted: boolean;
  hadOutbound: boolean;
  /** 👍 from the assigned agent on the assignment ping (wa_reaction). */
  hadReaction: boolean;
  roster: readonly RotationAgent[];
  availability: Record<string, AgentAvailability>;
  cursor: number | null;
  now: Date;
  acceptWindowMs: number;
}): AssignmentAction {
  const { assignment: a } = input;
  if (input.deleted || (input.stage !== null && CLOSED_STAGES.has(input.stage))) {
    return { kind: "close" };
  }
  if (isAssignmentAccepted(input.stage, input.hadOutbound, input.hadReaction)) return { kind: "accept" };
  const ageMs = input.now.getTime() - Date.parse(a.assignedAt);
  if (!Number.isFinite(ageMs) || ageMs < input.acceptWindowMs) return { kind: "none" };
  const excluded = new Set(
    [a.agentName, ...a.ignoredNames].map((n) => n.trim().toLowerCase())
  );
  const pick = nextAvailableAgent(input.roster, input.availability, input.cursor, input.now, excluded);
  if (pick) return { kind: "reassign", agent: pick.agent, nextCursor: pick.nextCursor };
  return { kind: "managerQueue" };
}

// ─── Pass ───────────────────────────────────────────────────────────────────

export interface RentalDistributorStore {
  loadCursors(): Promise<Record<string, number>>;
  saveCursors(cursors: Record<string, number>): Promise<void>;
  loadAssignments(): Promise<Record<string, RentalAssignment>>;
  saveAssignments(map: Record<string, RentalAssignment>): Promise<void>;
  /** ISO high-water mark of the bot-inbox reply reader (null = never ran). */
  loadReplyCursor(): Promise<string | null>;
  saveReplyCursor(iso: string): Promise<void>;
}

export interface RentalDistributorDeps {
  client: TwentyClient;
  /** Discovered workspace fields — unknown stamp fields are silently dropped. */
  opportunityFields: ReadonlySet<string>;
  rosters: Record<RentalRotationKey, readonly RotationAgent[]>;
  managerMemberIdFor(brand: RentalRotationKey): string | null;
  managerPhoneFor(brand: RentalRotationKey): string | null;
  managerNameFor(brand: RentalRotationKey): string | null;
  texts: DistributorTexts;
  acceptWindowMs: number;
  store: RentalDistributorStore;
  loadAvailability(): Promise<Record<string, AgentAvailability>>;
  /** Any outbound WhatsApp row to this customer tail9 since `since`. */
  hasOutboundTo(tenantSlug: string, tail9: string, since: Date): Promise<boolean>;
  /**
   * A pinned-emoji (👍…) reaction from the ASSIGNED agent on the assignment
   * ping for this opp since `since` — the agent accepting the lead
   * (Ayham, 2026-09-19). The runner matches wa_reaction → wa_outbox via the
   * WA message id, the outbox row → the assignment via board_item_id =
   * dedupeUuid(`assign:<oppId>[:<agentName>]`).
   */
  hasAcceptanceReaction(
    oppId: string,
    agentName: string,
    agentPhoneDigits: string | null,
    since: Date
  ): Promise<boolean>;
  /** wa_outbox enqueue on the assignment's main line (see modules/rental/outbox). */
  sendWhatsApp(input: {
    line: string;
    toDigits: string;
    text: string;
    dedupeKey: string;
  }): Promise<boolean>;
  /**
   * Inbound rows addressed to the bot line (RENTAL_NOTIFY_LINE) and the brand
   * MAIN lines since `since`, oldest first, sender resolved to digits where
   * possible — the agent accept/decline + manager steering channel
   * (Ayham, 2026-09-19).
   */
  loadBotReplies(since: Date): Promise<BotReplyRow[]>;
  /** First-run lookback for the reply reader, when no cursor exists yet. */
  replyLookbackMs: number;
  /** Single sender line for MANAGER notifications (RENTAL_NOTIFY_LINE);
   *  null/absent = the assignment's main line. Agents always hear from the
   *  main line itself. */
  notifyLine?: string | null;
  /** e.g. https://rent.takeauto.tech — deep links in notifications. */
  cardBaseUrl: string;
  now: Date;
}

export interface RentalDistributorCounts {
  scanned: number;
  accepted: number;
  reassigned: number;
  managerQueue: number;
  closed: number;
  /** Bot-inbox rows that parsed as an actual command (agent or manager). */
  replies: number;
  notifications: number;
  errors: string[];
}

export interface RentalDistributorOptions {
  commit: boolean;
  logger?: (line: string) => void;
}

export async function runRentalDistributorPass(
  deps: RentalDistributorDeps,
  opts: RentalDistributorOptions
): Promise<RentalDistributorCounts> {
  const counts: RentalDistributorCounts = {
    scanned: 0,
    accepted: 0,
    reassigned: 0,
    managerQueue: 0,
    closed: 0,
    replies: 0,
    notifications: 0,
    errors: [],
  };
  const log = opts.logger ?? (() => {});
  const commit = opts.commit;

  const assignments = await deps.store.loadAssignments();
  const cursors = await deps.store.loadCursors();
  const availability = await deps.loadAvailability();

  const saveAssignments = async () =>
    deps.store.saveAssignments(pruneRentalAssignments(assignments, deps.now));

  // ── Shared mechanics (the sweep and the reply commands use the same code) ──

  const cardUrl = (oppId: string) =>
    `${deps.cardBaseUrl.replace(/\/$/, "")}/object/opportunity/${oppId}`;
  const varsFor = (a: RentalAssignment) => ({
    lead: a.leadNumber ? `#${a.leadNumber}` : "—",
    phone: `+${a.customerPhone}`,
    agent: a.agentName,
    brand: a.brand as string,
    minutes: Math.round(deps.acceptWindowMs / 60_000),
    message: "",
  });
  const notifyOn = async (
    line: string | null,
    toDigits: string | null,
    text: string,
    dedupeKey: string
  ) => {
    if (!toDigits) {
      log(`[rental-distributor] notify skipped (${dedupeKey}) — no WhatsApp number`);
      return;
    }
    if (!line) {
      log(`[rental-distributor] notify skipped (${dedupeKey}) — no sender line configured`);
      return;
    }
    if (!commit) {
      counts.notifications++;
      log(`[rental-distributor] would notify ${toDigits} (${dedupeKey})`);
      return;
    }
    try {
      const sent = await deps.sendWhatsApp({ line, toDigits, text, dedupeKey });
      if (sent) counts.notifications++;
      else log(`[rental-distributor] notify ${dedupeKey} NOT queued — outbox unavailable`);
    } catch (e) {
      counts.errors.push(`notify ${dedupeKey}: ${msg(e)}`);
    }
  };
  // Agents hear from the MAIN LINE; the manager from the ONE bot line
  // (RENTAL_NOTIFY_LINE) — owner/Ayham, 2026-09-17.
  const notifyAgent = (a: RentalAssignment, toDigits: string | null, text: string, key: string) =>
    notifyOn(a.line, toDigits, text, key);
  const notifyManager = (a: RentalAssignment, text: string, key: string) =>
    notifyOn(deps.notifyLine ?? a.line, deps.managerPhoneFor(a.brand), text, key);
  // Manager COMMAND replies go back to the sender's chat — the bot line, or
  // the card's main line when RENTAL_NOTIFY_LINE is unset (same rule as
  // notifyManager; command-less rows — help, unknown lead — have no card to
  // fall back to and need the bot line).
  const managerReplyLine = (a?: RentalAssignment) => deps.notifyLine ?? a?.line ?? null;

  // Read the card as it is NOW. A failed read retries next pass (or the next
  // command) — the record is untouched, so nothing is decided on a guess.
  const readCard = async (
    oppId: string
  ): Promise<{ stage: string | null; deleted: boolean; ignoredSoFar: number | null } | null> => {
    try {
      const res = await deps.client.get<Record<string, Record<string, unknown>>>(
        `opportunities/${oppId}`
      );
      const opp = (res?.data?.opportunity ?? {}) as Record<string, unknown>;
      return {
        stage: typeof opp.stage === "string" ? opp.stage : null,
        deleted: typeof opp.deletedAt === "string" && !!opp.deletedAt,
        ignoredSoFar: typeof opp.ignoredCount === "number" ? opp.ignoredCount : null,
      };
    } catch (e) {
      counts.errors.push(`read ${oppId}: ${msg(e)}`);
      return null;
    }
  };

  const applyAccept = async (oppId: string, a: RentalAssignment) => {
    log(`[rental-distributor] ACCEPTED ${oppId} (lead ${varsFor(a).lead}) by ${a.agentName}${commit ? "" : " — dry-run"}`);
    counts.accepted++;
    if (commit) {
      a.acceptedAt = deps.now.toISOString();
      a.done = true;
      // The acceptedAt stamp — silently dropped where Ops has not created
      // the field yet (the metadata gate, same rule as the relay).
      if (deps.opportunityFields.has("acceptedAt")) {
        try {
          await deps.client.patch(`opportunities/${oppId}`, { acceptedAt: deps.now.toISOString() });
        } catch (e) {
          counts.errors.push(`acceptStamp ${oppId}: ${msg(e)}`);
        }
      }
      await notifyManager(
        a,
        renderText(deps.texts.managerAccepted, varsFor(a)) + `\n🗂 ${cardUrl(oppId)}`,
        `mgr-accepted:${oppId}`
      );
      await saveAssignments().catch((e) => counts.errors.push(`save ${oppId}: ${msg(e)}`));
    }
  };

  const applyManagerQueue = async (oppId: string, a: RentalAssignment) => {
    // Nobody available (the current/ignoring agent excluded) — park the card
    // with the brand manager and say so, once.
    log(`[rental-distributor] MANAGER QUEUE ${oppId} (lead ${varsFor(a).lead}) — no available ${a.brand} agent${commit ? "" : " — dry-run"}`);
    counts.managerQueue++;
    if (commit) {
      const managerId = deps.managerMemberIdFor(a.brand);
      if (managerId) {
        try {
          await deps.client.patch(`opportunities/${oppId}`, { ownerId: managerId });
        } catch (e) {
          counts.errors.push(`managerQueue ${oppId}: ${msg(e)}`);
          return;
        }
        a.memberId = managerId;
      }
      a.agentName = deps.managerNameFor(a.brand) ?? "manager";
      a.done = true;
      a.managerQueue = true;
      const vars = varsFor(a);
      await notifyManager(
        a,
        renderText(deps.texts.managerAllBusy, vars) + renderText(MANAGER_STEER_HINT, vars) + `\n🗂 ${cardUrl(oppId)}`,
        `mgr-allbusy:${oppId}`
      );
      await saveAssignments().catch((e) => counts.errors.push(`save ${oppId}: ${msg(e)}`));
    }
  };

  type ReassignOutcome =
    | { kind: "reassigned"; agent: RotationAgent }
    | { kind: "managerQueue" }
    | { kind: "failed" };

  /**
   * Hand the card to the next available agent, the current one recorded as
   * ignored — `reason` is "ignored" (the window lapsed) or "declined" (the
   * agent answered 2/нет, or the manager forced "next"): same mechanics,
   * different manager wording (Ayham: a decline is an answer, not a silence).
   */
  const applyReassign = async (
    oppId: string,
    a: RentalAssignment,
    ignoredSoFar: number | null,
    reason: "ignored" | "declined"
  ): Promise<ReassignOutcome> => {
    const excluded = new Set(
      [a.agentName, ...a.ignoredNames].map((n) => n.trim().toLowerCase())
    );
    const pick = nextAvailableAgent(
      deps.rosters[a.brand] ?? [],
      availability,
      cursors[a.brand] ?? 0,
      deps.now,
      excluded
    );
    if (!pick) {
      await applyManagerQueue(oppId, a);
      return { kind: "managerQueue" };
    }
    const next = pick.agent;
    const vars = varsFor(a); // BEFORE the mutation — {agent} is the one losing the card
    log(
      `[rental-distributor] REASSIGN ${oppId} (lead ${vars.lead}): ${a.agentName} ${reason} → ${next.name}${commit ? "" : " — dry-run"}`
    );
    counts.reassigned++;
    if (commit) {
      try {
        const patch: Record<string, unknown> = { ownerId: next.memberId };
        // ignoredCount stamp — gated like acceptedAt (unknown field dropped).
        if (deps.opportunityFields.has("ignoredCount")) {
          patch.ignoredCount = (ignoredSoFar ?? 0) + 1;
        }
        await deps.client.patch(`opportunities/${oppId}`, patch);
      } catch (e) {
        counts.errors.push(`reassign ${oppId}: ${msg(e)}`);
        return { kind: "failed" }; // the record stays as-is — retried next pass
      }
      a.ignoredNames.push(a.agentName);
      a.agentName = next.name;
      a.memberId = next.memberId;
      a.phone = next.phone;
      a.assignedAt = deps.now.toISOString(); // the new agent's window starts now
      cursors[a.brand] = pick.nextCursor;
      await notifyManager(
        a,
        renderText(reason === "declined" ? deps.texts.managerDeclined : deps.texts.managerIgnored, vars) +
          renderText(MANAGER_STEER_HINT, vars) +
          `\n🗂 ${cardUrl(oppId)}`,
        `mgr-${reason}:${oppId}:${a.ignoredNames[a.ignoredNames.length - 1]}`
      );
      await notifyAgent(
        a,
        next.phone,
        renderText(deps.texts.agentAssigned, { ...vars, agent: next.name }) + AGENT_REPLY_HINT + `\n🗂 ${cardUrl(oppId)}`,
        `assign:${oppId}:${next.name}`
      );
      await notifyManager(
        a,
        renderText(deps.texts.managerReassigned, { ...vars, agent: next.name }) + `\n🗂 ${cardUrl(oppId)}`,
        `mgr-reassigned:${oppId}:${next.name}`
      );
      try {
        await deps.store.saveCursors(cursors);
        await saveAssignments();
      } catch (e) {
        counts.errors.push(`save ${oppId}: ${msg(e)}`);
      }
    }
    return { kind: "reassigned", agent: next };
  };

  /**
   * Manager steering "#<lead> <name>": assign the card to THAT agent directly.
   * Availability is NOT consulted — a manager's explicit choice overrides the
   * toggles. A manager-queue card is re-activated (done=false): "all busy →
   * come back to me" is only useful if the manager can hand the card out.
   */
  const applyAssign = async (
    oppId: string,
    a: RentalAssignment,
    agent: RotationAgent
  ): Promise<boolean> => {
    log(`[rental-distributor] STEER ${oppId} (lead ${varsFor(a).lead}): manager assigns → ${agent.name}${commit ? "" : " — dry-run"}`);
    counts.reassigned++; // the card changed owner — same bucket
    if (commit) {
      try {
        await deps.client.patch(`opportunities/${oppId}`, { ownerId: agent.memberId });
      } catch (e) {
        counts.errors.push(`steer ${oppId}: ${msg(e)}`);
        return false; // untouched — retried on the manager's next message
      }
      a.agentName = agent.name;
      a.memberId = agent.memberId;
      a.phone = agent.phone;
      a.assignedAt = deps.now.toISOString(); // the steered agent's window starts now
      a.done = false;
      delete a.managerQueue;
      const vars = varsFor(a);
      await notifyAgent(
        a,
        agent.phone,
        renderText(deps.texts.agentAssigned, { ...vars, agent: agent.name }) + AGENT_REPLY_HINT + `\n🗂 ${cardUrl(oppId)}`,
        `assign:${oppId}:${agent.name}`
      );
      await saveAssignments().catch((e) => counts.errors.push(`save ${oppId}: ${msg(e)}`));
    }
    return true;
  };

  // ── Bot-inbox replies FIRST (Ayham, 2026-09-19) ──────────────────────────
  // An explicit accept/decline or a manager command beats the timeout sweep,
  // so replies are applied before the window is even looked at. The cursor
  // moves ONLY on commit and ONLY past rows this pass actually read.
  const replyCursorRaw = await deps.store
    .loadReplyCursor()
    .catch((e: unknown) => (counts.errors.push(`replyCursor: ${msg(e)}`), null));
  const replySince = replyCursorRaw
    ? new Date(replyCursorRaw)
    : new Date(deps.now.getTime() - deps.replyLookbackMs);
  let replyRows: BotReplyRow[] = [];
  try {
    replyRows = await deps.loadBotReplies(replySince);
  } catch (e) {
    counts.errors.push(`botReplies: ${msg(e)}`);
  }

  if (replyRows.length > 0) {
    const tailOf = (digits: string | null): string | null => {
      const d = (digits ?? "").replace(/\D/g, "");
      return d.length >= MIN_PHONE_MATCH_DIGITS ? d.slice(-MIN_PHONE_MATCH_DIGITS) : null;
    };
    // Sender → who they are: a rotation agent (either brand) or a manager.
    const agentByTail = new Map<string, RotationAgent>();
    for (const brand of ["etm", "cardiwan"] as RentalRotationKey[]) {
      for (const ag of deps.rosters[brand] ?? []) {
        const t = tailOf(ag.phone);
        if (t) agentByTail.set(t, ag);
      }
    }
    const managerTails = new Set(
      (["etm", "cardiwan"] as RentalRotationKey[])
        .map((b) => tailOf(deps.managerPhoneFor(b)))
        .filter((t): t is string => !!t)
    );
    // Pending cards, plus manager-queue ones — "#n <name>" steers a card OUT
    // of the manager's queue.
    const findByLead = (lead: string) =>
      Object.entries(assignments).find(
        ([, a]) =>
          (!a.done || a.managerQueue) &&
          a.leadNumber !== null &&
          Number(a.leadNumber) === Number(lead)
      );
    // An agent's short reply carries no lead number — it applies to his MOST
    // RECENT pending assignment (he answers the ping he just got).
    const latestPendingFor = (agentName: string) =>
      Object.entries(assignments)
        .filter(
          ([, a]) => !a.done && a.agentName.trim().toLowerCase() === agentName.trim().toLowerCase()
        )
        .sort((x, y) => y[1].assignedAt.localeCompare(x[1].assignedAt))[0];

    let maxReplyAt: Date | null = null;
    for (const row of replyRows) {
      if (!maxReplyAt || row.at.getTime() > maxReplyAt.getTime()) maxReplyAt = row.at;
      const tail = tailOf(row.senderPhone);
      if (!tail) {
        log(`[rental-distributor] reply from ${row.senderJid} — no phone resolved, skipped`);
        continue;
      }
      // One confirmation per row, ever — the row is read once (cursor), the
      // key only guards a mid-pass retry.
      const cmdKey = `cmd:${tail}:${row.at.toISOString()}`;

      if (managerTails.has(tail)) {
        const cmd = parseManagerCommand(row.body);
        if (!cmd) continue; // ordinary manager chatter, not a command
        counts.replies++;
        if (cmd.kind === "invalid") {
          await notifyOn(managerReplyLine(), row.senderPhone, MANAGER_HELP_TEXT, cmdKey);
          continue;
        }
        const found = findByLead(cmd.lead);
        if (!found) {
          await notifyOn(
            managerReplyLine(),
            row.senderPhone,
            `Lead #${cmd.lead}: no pending assignment (accepted or closed already?).`,
            cmdKey
          );
          continue;
        }
        const [oppId, a] = found;
        const card = await readCard(oppId);
        if (!card) continue;
        if (card.deleted || (card.stage !== null && CLOSED_STAGES.has(card.stage))) {
          a.done = true;
          counts.closed++;
          if (commit) await saveAssignments().catch((e) => counts.errors.push(`save ${oppId}: ${msg(e)}`));
          await notifyOn(managerReplyLine(a), row.senderPhone, `Lead #${cmd.lead} is already closed.`, cmdKey);
          continue;
        }
        if (cmd.kind === "next") {
          if (a.managerQueue) {
            await notifyOn(
              managerReplyLine(a),
              row.senderPhone,
              `Lead #${cmd.lead} is in your queue — use #${cmd.lead} <name> to assign it.`,
              cmdKey
            );
            continue;
          }
          const prevName = a.agentName;
          const out = await applyReassign(oppId, a, card.ignoredSoFar, "declined");
          const confirm =
            out.kind === "reassigned"
              ? `✅ #${cmd.lead}: ${prevName} skipped → reassigned to ${out.agent.name}.`
              : out.kind === "managerQueue"
                ? `✅ #${cmd.lead}: nobody available — the card is in your queue.`
                : `⚠️ #${cmd.lead}: reassign failed (see log) — retried next pass.`;
          await notifyOn(managerReplyLine(a), row.senderPhone, confirm, cmdKey);
          continue;
        }
        // "#<lead> <name>" — direct assignment, availability overridden.
        const roster = deps.rosters[a.brand] ?? [];
        const target = roster.find(
          (r) => r.name.trim().toLowerCase() === cmd.name.trim().toLowerCase()
        );
        if (!target) {
          await notifyOn(
            managerReplyLine(a),
            row.senderPhone,
            `Unknown agent "${cmd.name}". ${a.brand} roster: ${roster.map((r) => r.name).join(", ") || "(empty)"}.`,
            cmdKey
          );
          continue;
        }
        if (!target.memberId) {
          await notifyOn(
            managerReplyLine(a),
            row.senderPhone,
            `"${target.name}" is not a CRM workspace member — cannot assign.`,
            cmdKey
          );
          continue;
        }
        const ok = await applyAssign(oppId, a, target);
        await notifyOn(
          managerReplyLine(a),
          row.senderPhone,
          ok ? `✅ #${cmd.lead} assigned to ${target.name}.` : `⚠️ #${cmd.lead}: assign failed (see log) — retried next pass.`,
          cmdKey
        );
        continue;
      }

      const agent = agentByTail.get(tail);
      if (!agent) continue; // a customer or a stranger — not a command channel
      const reply = parseAgentReply(row.body);
      if (!reply) continue; // ordinary agent chatter
      counts.replies++;
      const found = latestPendingFor(agent.name);
      if (!found) {
        log(`[rental-distributor] "${reply}" from ${agent.name} — no pending assignment, ignored`);
        continue;
      }
      const [oppId, a] = found;
      const card = await readCard(oppId);
      if (!card) continue;
      if (card.deleted || (card.stage !== null && CLOSED_STAGES.has(card.stage))) {
        a.done = true;
        counts.closed++;
        if (commit) await saveAssignments().catch((e) => counts.errors.push(`save ${oppId}: ${msg(e)}`));
        continue;
      }
      if (reply === "accept") await applyAccept(oppId, a);
      else await applyReassign(oppId, a, card.ignoredSoFar, "declined");
    }

    if (commit && maxReplyAt) {
      await deps.store
        .saveReplyCursor(maxReplyAt.toISOString())
        .catch((e) => counts.errors.push(`replyCursor save: ${msg(e)}`));
    }
  }

  // ── The acceptance-window sweep ───────────────────────────────────────────

  for (const [oppId, a] of Object.entries(assignments)) {
    if (a.done) continue;
    counts.scanned++;

    const card = await readCard(oppId);
    if (!card) continue;
    const { stage, deleted, ignoredSoFar } = card;

    const live = !deleted && !(stage !== null && CLOSED_STAGES.has(stage));
    const hadOutbound = live
      ? await deps.hasOutboundTo(a.tenantSlug, a.customerTail9, new Date(a.assignedAt)).catch((e) => {
          counts.errors.push(`outbound ${oppId}: ${msg(e)}`);
          return false;
        })
      : false;
    // The 👍 probe, alongside the outbound one. Same guard: a deleted/closed
    // card is closed below regardless, so the query is not worth running.
    const hadReaction = live
      ? await deps.hasAcceptanceReaction(oppId, a.agentName, a.phone, new Date(a.assignedAt)).catch((e) => {
          counts.errors.push(`reaction ${oppId}: ${msg(e)}`);
          return false;
        })
      : false;

    const action = planAssignmentAction({
      assignment: a,
      stage,
      deleted,
      hadOutbound,
      hadReaction,
      roster: deps.rosters[a.brand] ?? [],
      availability,
      cursor: cursors[a.brand] ?? 0,
      now: deps.now,
      acceptWindowMs: deps.acceptWindowMs,
    });

    if (action.kind === "none") continue;

    if (action.kind === "close") {
      a.done = true;
      counts.closed++;
      if (commit) await saveAssignments().catch((e) => counts.errors.push(`save ${oppId}: ${msg(e)}`));
      continue;
    }

    if (action.kind === "accept") {
      await applyAccept(oppId, a);
      continue;
    }

    if (action.kind === "reassign") {
      // The plan's pick is recomputed inside applyReassign — same pure inputs
      // (roster, availability, cursor, exclusions), so the same agent.
      await applyReassign(oppId, a, ignoredSoFar, "ignored");
      continue;
    }

    // managerQueue
    await applyManagerQueue(oppId, a);
  }

  return counts;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

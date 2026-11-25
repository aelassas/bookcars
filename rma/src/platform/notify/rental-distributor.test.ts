// rental-distributor.ts — the acceptance-window sweeper (sweeper-style fakes,
// same shape as sales-automations.test.ts).
//
// Pins: the acceptance signal (outbound WhatsApp OR stage off the NEW band —
// RETURNING_LEAD excluded because that flip is automatic), reassignment after
// the window with the ignoring agent EXCLUDED, the all-busy manager-queue
// fallback, the gated stamps (acceptedAt/ignoredCount silently dropped where
// the workspace lacks the fields), and idempotency — a processed assignment
// never fires twice.
import { describe, expect, it } from "vitest";
import type { TwentyClient } from "@/platform/integrations/twenty/client";
import type { RentalAssignment } from "@/platform/integrations/twenty/wa-lead-relay";
import { DEFAULT_TEXTS, type AgentAvailability, type RotationAgent } from "@/modules/rental/rotation";
import {
  isAssignmentAccepted,
  parseAgentReply,
  parseManagerCommand,
  planAssignmentAction,
  runRentalDistributorPass,
  type BotReplyRow,
  type RentalDistributorDeps,
} from "./rental-distributor";

const T0 = new Date("2026-09-16T10:00:00.000Z");
const NOW = new Date("2026-09-16T10:20:00.000Z"); // 20 min later — past the 10-min window
const WINDOW_MS = 10 * 60_000;

const ROSTER: RotationAgent[] = [
  { name: "Ali", phone: "971542445835", memberId: "ali-id" },
  { name: "Babek", phone: "971529965085", memberId: "babek-id" },
];

function assignment(over: Partial<RentalAssignment> = {}): RentalAssignment {
  return {
    brand: "etm",
    line: "etm-website",
    tenantSlug: "easyrent",
    agentName: "Ali",
    memberId: "ali-id",
    phone: "971542445835",
    customerTail9: "501234567",
    customerPhone: "971501234567",
    leadNumber: "101",
    assignedAt: T0.toISOString(),
    acceptedAt: null,
    ignoredNames: [],
    done: false,
    ...over,
  };
}

describe("isAssignmentAccepted — the acceptance signal", () => {
  it("an outbound message to the customer is acting, whatever the stage", () => {
    expect(isAssignmentAccepted("NEW_REQUEST", true, false)).toBe(true);
    expect(isAssignmentAccepted(null, true, false)).toBe(true);
  });

  it("a 👍 reaction from the assignee on the assignment ping is acting (Ayham, 2026-09-19)", () => {
    expect(isAssignmentAccepted("NEW_REQUEST", false, true)).toBe(true);
    expect(isAssignmentAccepted("RETURNING_LEAD", false, true)).toBe(true);
  });

  it("a stage off the NEW band is acting", () => {
    expect(isAssignmentAccepted("IN_PROGRESS", false, false)).toBe(true);
    expect(isAssignmentAccepted("COMPLETED", false, false)).toBe(true);
  });

  it("RETURNING_LEAD is NOT acting — that flip is automatic (rental-automations), not the agent", () => {
    expect(isAssignmentAccepted("RETURNING_LEAD", false, false)).toBe(false);
    expect(isAssignmentAccepted("NEW_REQUEST", false, false)).toBe(false);
    expect(isAssignmentAccepted(null, false, false)).toBe(false);
  });
});

describe("planAssignmentAction — pure transitions", () => {
  const base = {
    assignment: assignment(),
    stage: "NEW_REQUEST" as string | null,
    deleted: false,
    hadOutbound: false,
    hadReaction: false,
    roster: ROSTER,
    availability: {} as Record<string, AgentAvailability>,
    cursor: 1,
    now: NOW,
    acceptWindowMs: WINDOW_MS,
  };

  it("inside the window → none", () => {
    const action = planAssignmentAction({ ...base, now: new Date(T0.getTime() + 5 * 60_000) });
    expect(action.kind).toBe("none");
  });

  it("accepted inside or outside the window → accept", () => {
    expect(planAssignmentAction({ ...base, hadOutbound: true }).kind).toBe("accept");
    expect(planAssignmentAction({ ...base, stage: "IN_PROGRESS" }).kind).toBe("accept");
  });

  it("a 👍 reaction accepts even AFTER the window expired — no reassign", () => {
    expect(planAssignmentAction({ ...base, hadReaction: true }).kind).toBe("accept");
  });

  it("a deleted or closed card → close, silently", () => {
    expect(planAssignmentAction({ ...base, deleted: true }).kind).toBe("close");
    expect(planAssignmentAction({ ...base, stage: "COMPLETED" }).kind).toBe("close");
  });

  it("expired → reassign to the next available, IGNORING agent excluded", () => {
    const action = planAssignmentAction(base);
    expect(action).toEqual({
      kind: "reassign",
      agent: ROSTER[1],
      nextCursor: 2,
    });
  });

  it("every previously-ignored agent stays excluded — the card never cycles back", () => {
    const roster = [...ROSTER, { name: "Abdullah", phone: "971585809747", memberId: "abdullah-id" }];
    // Ali is current, Babek already ignored this card once → Abdullah, not Babek.
    const action = planAssignmentAction({
      ...base,
      roster,
      assignment: assignment({ ignoredNames: ["Babek"] }),
    });
    expect(action.kind).toBe("reassign");
    if (action.kind === "reassign") expect(action.agent.name).toBe("Abdullah");
  });

  it("the whole roster in the ignore history → manager queue, not another lap", () => {
    // Ali current + Babek already ignored = nobody left on a two-man roster.
    expect(
      planAssignmentAction({ ...base, assignment: assignment({ ignoredNames: ["Babek"] }) }).kind
    ).toBe("managerQueue");
  });

  it("expired with the next agent busy → skips to the one after", () => {
    const roster = [...ROSTER, { name: "Abdullah", phone: "971569808087", memberId: "abdullah-id" }];
    const action = planAssignmentAction({
      ...base,
      roster,
      availability: { babek: { status: "busy", busyUntil: new Date(NOW.getTime() + 30 * 60_000) } },
    });
    expect(action.kind).toBe("reassign");
    if (action.kind === "reassign") expect(action.agent.name).toBe("Abdullah");
  });

  it("expired with nobody else available → the manager queue", () => {
    expect(planAssignmentAction({ ...base, roster: [ROSTER[0]!] }).kind).toBe("managerQueue");
    const allBusy: Record<string, AgentAvailability> = {
      babek: { status: "off", busyUntil: null },
    };
    expect(planAssignmentAction({ ...base, availability: allBusy }).kind).toBe("managerQueue");
  });
});

// ─── The pass end to end ────────────────────────────────────────────────────

function harness(opts: {
  assignments: Record<string, RentalAssignment>;
  opps?: Record<string, Record<string, unknown>>;
  outbound?: boolean;
  reaction?: boolean;
  replies?: BotReplyRow[];
  replyCursor?: string | null;
  availability?: Record<string, AgentAvailability>;
  fields?: Set<string>;
  rosters?: RentalDistributorDeps["rosters"];
}) {
  const patched: { id: string; patch: Record<string, unknown> }[] = [];
  const sent: { line: string; toDigits: string; text: string; dedupeKey: string }[] = [];
  const reactionProbes: { oppId: string; agentName: string; agentPhoneDigits: string | null; since: Date }[] = [];
  const state = {
    cursors: { etm: 1 } as Record<string, number>,
    assignments: opts.assignments,
    replyCursor: opts.replyCursor ?? null as string | null,
  };
  const client = {
    get: async (path: string) => {
      const id = path.split("/")[1]!;
      const opp = opts.opps?.[id];
      if (!opp) throw new Error(`404 ${path}`);
      return { data: { opportunity: opp } };
    },
    patch: async (path: string, patch: Record<string, unknown>) => {
      patched.push({ id: path.split("/")[1]!, patch });
    },
  } as unknown as TwentyClient;

  const deps: RentalDistributorDeps = {
    client,
    opportunityFields: opts.fields ?? new Set(["assignedAt", "acceptedAt", "ignoredCount"]),
    rosters: opts.rosters ?? { etm: ROSTER, cardiwan: [] },
    managerMemberIdFor: () => "ayham-id",
    managerPhoneFor: () => "971581417020",
    managerNameFor: () => "Ayham",
    texts: DEFAULT_TEXTS,
    acceptWindowMs: WINDOW_MS,
    store: {
      loadCursors: async () => ({ ...state.cursors }),
      saveCursors: async (c) => {
        state.cursors = c;
      },
      loadAssignments: async () => state.assignments,
      saveAssignments: async (m) => {
        state.assignments = m;
      },
      loadReplyCursor: async () => state.replyCursor,
      saveReplyCursor: async (iso) => {
        state.replyCursor = iso;
      },
    },
    loadAvailability: async () => opts.availability ?? {},
    hasOutboundTo: async () => opts.outbound ?? false,
    hasAcceptanceReaction: async (oppId, agentName, agentPhoneDigits, since) => {
      reactionProbes.push({ oppId, agentName, agentPhoneDigits, since });
      return opts.reaction ?? false;
    },
    sendWhatsApp: async (input) => {
      sent.push(input);
      return true;
    },
    loadBotReplies: async () => opts.replies ?? [],
    replyLookbackMs: 60 * 60_000,
    notifyLine: "takeauto-leasing-dept",
    cardBaseUrl: "https://rent.takeauto.tech",
    now: NOW,
  };
  return { deps, patched, sent, state, reactionProbes };
}

describe("runRentalDistributorPass", () => {
  const OPP_NEW = { id: "opp-1", stage: "NEW_REQUEST", ownerId: "ali-id", ignoredCount: 0 };

  it("accepts on an outbound reply: stamps acceptedAt, notifies the manager, done", async () => {
    const h = harness({ assignments: { "opp-1": assignment() }, opps: { "opp-1": OPP_NEW }, outbound: true });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.accepted).toBe(1);
    expect(h.patched).toEqual([{ id: "opp-1", patch: { acceptedAt: NOW.toISOString() } }]);
    const a = h.state.assignments["opp-1"]!;
    expect(a.done).toBe(true);
    expect(a.acceptedAt).toBe(NOW.toISOString());
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]!.toDigits).toBe("971581417020"); // the manager
    expect(h.sent[0]!.text).toContain("#101");
    expect(h.sent[0]!.text).toContain("Ali");
    expect(h.sent[0]!.dedupeKey).toBe("mgr-accepted:opp-1");
  });

  it("accepts on a 👍 reaction from the assignee: stamps acceptedAt, notifies the manager, NO reassign (Ayham, 2026-09-19)", async () => {
    const h = harness({ assignments: { "opp-1": assignment() }, opps: { "opp-1": OPP_NEW }, reaction: true });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.accepted).toBe(1);
    expect(counts.reassigned).toBe(0); // expired but reacted → stays with Ali
    expect(h.patched).toEqual([{ id: "opp-1", patch: { acceptedAt: NOW.toISOString() } }]);
    const a = h.state.assignments["opp-1"]!;
    expect(a.done).toBe(true);
    expect(a.agentName).toBe("Ali");
    expect(a.ignoredNames).toEqual([]);
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]!.dedupeKey).toBe("mgr-accepted:opp-1");
  });

  it("the reaction probe is asked for the ASSIGNEE's phone — a 👍 from anyone else must not accept", async () => {
    // The phone match itself lives in the runner's SQL; what the pass
    // guarantees is that the probe runs against the assignment's agent, so a
    // reaction from a different phone returns false and the window applies.
    const h = harness({ assignments: { "opp-1": assignment() }, opps: { "opp-1": OPP_NEW }, reaction: false });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(h.reactionProbes).toHaveLength(1);
    expect(h.reactionProbes[0]).toEqual({
      oppId: "opp-1",
      agentName: "Ali",
      agentPhoneDigits: "971542445835", // Ali — not Babek's, not the manager's
      since: new Date(T0.toISOString()),
    });
    expect(counts.accepted).toBe(0);
    expect(counts.reassigned).toBe(1); // no accept signal → the window applies
  });

  it("accepts on a stage move off NEW_REQUEST (IN_PROGRESS)", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": { ...OPP_NEW, stage: "IN_PROGRESS" } },
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.accepted).toBe(1);
    expect(h.state.assignments["opp-1"]!.done).toBe(true);
  });

  it("RETURNING_LEAD (the automatic flip) does NOT count as acting — the window applies", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": { ...OPP_NEW, stage: "RETURNING_LEAD" } },
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.accepted).toBe(0);
    expect(counts.reassigned).toBe(1); // expired + unacted → reassigned
  });

  it("inside the window: untouched, no writes at all", async () => {
    const a = assignment({ assignedAt: new Date(NOW.getTime() - 5 * 60_000).toISOString() });
    const h = harness({ assignments: { "opp-1": a }, opps: { "opp-1": OPP_NEW } });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.scanned).toBe(1);
    expect(counts.accepted + counts.reassigned + counts.managerQueue + counts.closed).toBe(0);
    expect(h.patched).toEqual([]);
    expect(h.sent).toEqual([]);
    expect(h.state.assignments["opp-1"]).toBe(a); // same object, untouched
  });

  it("expired + unacted: reassigns to the next agent, marks Ali ignored, notifies all three parties", async () => {
    const h = harness({ assignments: { "opp-1": assignment() }, opps: { "opp-1": OPP_NEW } });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.reassigned).toBe(1);
    expect(h.patched).toEqual([{ id: "opp-1", patch: { ownerId: "babek-id", ignoredCount: 1 } }]);
    const a = h.state.assignments["opp-1"]!;
    expect(a.ignoredNames).toEqual(["Ali"]);
    expect(a.agentName).toBe("Babek");
    expect(a.memberId).toBe("babek-id");
    expect(a.assignedAt).toBe(NOW.toISOString()); // Babek's window starts now
    expect(a.done).toBe(false);
    expect(h.state.cursors.etm).toBe(2); // the rotation advanced
    const keys = h.sent.map((s) => s.dedupeKey);
    expect(keys).toEqual(["mgr-ignored:opp-1:Ali", "assign:opp-1:Babek", "mgr-reassigned:opp-1:Babek"]);
    const agentMsg = h.sent.find((s) => s.dedupeKey === "assign:opp-1:Babek")!;
    expect(agentMsg.toDigits).toBe("971529965085");
    expect(agentMsg.line).toBe("etm-website"); // sent FROM the main line
    expect(agentMsg.text).toContain("+971501234567"); // the customer's phone
  });

  it("expired with NOBODY else available: parks in the manager queue + tells the manager", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": OPP_NEW },
      rosters: { etm: [ROSTER[0]!], cardiwan: [] }, // Ali alone — excluded as the ignorer
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.managerQueue).toBe(1);
    expect(h.patched).toEqual([{ id: "opp-1", patch: { ownerId: "ayham-id" } }]);
    const a = h.state.assignments["opp-1"]!;
    expect(a.done).toBe(true);
    expect(a.managerQueue).toBe(true);
    expect(a.memberId).toBe("ayham-id");
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]!.dedupeKey).toBe("mgr-allbusy:opp-1");
    expect(h.sent[0]!.text).toContain("please assign manually");
  });

  it("a closed card is dropped from tracking with no notifications", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": { ...OPP_NEW, stage: "COMPLETED" } },
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.closed).toBe(1);
    expect(h.sent).toEqual([]);
    expect(h.state.assignments["opp-1"]!.done).toBe(true);
  });

  it("IDEMPOTENT: a second pass over the same state processes nothing again", async () => {
    const h = harness({ assignments: { "opp-1": assignment() }, opps: { "opp-1": OPP_NEW } });
    await runRentalDistributorPass(h.deps, { commit: true }); // reassign to Babek
    expect(h.sent).toHaveLength(3);
    // Babek's window just started (assignedAt = NOW) — the immediate second
    // pass finds him inside it.
    const counts2 = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts2.reassigned).toBe(0);
    expect(counts2.accepted).toBe(0);
    expect(h.patched).toHaveLength(1);
    expect(h.sent).toHaveLength(3);
    // Accepted cards stay done forever.
    const h2 = harness({ assignments: { "opp-2": assignment() }, opps: { "opp-2": OPP_NEW }, outbound: true });
    await runRentalDistributorPass(h2.deps, { commit: true });
    const again = await runRentalDistributorPass(h2.deps, { commit: true });
    expect(again.accepted).toBe(0);
    expect(h2.sent).toHaveLength(1);
  });

  it("dry-run: counts and logs, but zero writes, zero sends, zero state", async () => {
    const h = harness({ assignments: { "opp-1": assignment() }, opps: { "opp-1": OPP_NEW } });
    const counts = await runRentalDistributorPass(h.deps, { commit: false });
    expect(counts.reassigned).toBe(1); // counted…
    expect(h.patched).toEqual([]); // …but nothing happened
    expect(h.sent).toEqual([]);
    expect(h.state.assignments["opp-1"]!.agentName).toBe("Ali");
    expect(h.state.assignments["opp-1"]!.done).toBe(false);
  });

  it("stamps are silently dropped where the workspace lacks the fields", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": OPP_NEW },
      fields: new Set(["name", "stage"]), // no assignedAt/acceptedAt/ignoredCount
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.reassigned).toBe(1);
    expect(h.patched).toEqual([{ id: "opp-1", patch: { ownerId: "babek-id" } }]); // no ignoredCount
  });

  it("a failed card read is an error, not a decision — retried next pass", async () => {
    const h = harness({ assignments: { "opp-1": assignment() }, opps: {} });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.errors).toHaveLength(1);
    expect(h.state.assignments["opp-1"]!.done).toBe(false);
    expect(h.patched).toEqual([]);
  });
});

// ─── Bot-inbox replies: agent accept/decline + manager steering (2026-09-19) ─

const ALI = "971542445835";
const BABEK = "971529965085";
const MANAGER = "971581417020"; // the harness managerPhoneFor
const replyAt = new Date("2026-09-16T10:15:00.000Z"); // inside the window
const reply = (senderPhone: string | null, body: string, at = replyAt): BotReplyRow => ({
  senderPhone,
  senderJid: senderPhone ? `${senderPhone}@s.whatsapp.net` : "23456789012345@lid",
  body,
  at,
});

describe("parseAgentReply — exact short tokens, never substrings", () => {
  it("every accept token, case/space/punctuation tolerant", () => {
    for (const t of ["1", "ok", "yes", "да", "принял", "принято", "accept", "✅", "👍"]) {
      expect(parseAgentReply(t)).toBe("accept");
    }
    expect(parseAgentReply("  OK  ")).toBe("accept");
    expect(parseAgentReply("1.")).toBe("accept");
    expect(parseAgentReply("Принял!")).toBe("accept");
    expect(parseAgentReply("Yes,")).toBe("accept");
  });

  it("every decline token", () => {
    for (const t of ["2", "no", "нет", "пас", "pass", "next", "❌"]) {
      expect(parseAgentReply(t)).toBe("decline");
    }
    expect(parseAgentReply(" Нет ")).toBe("decline");
    expect(parseAgentReply("2.")).toBe("decline");
  });

  it("a SENTENCE containing a token is chatter, not a command", () => {
    for (const s of [
      "ok let me check",
      "okay",
      "yes sir",
      "no way",
      "accepted it yesterday",
      "принял бы, но занят",
      "2 cars for friday",
      "call 1 more time",
      "ок",
    ]) {
      expect(parseAgentReply(s)).toBeNull();
    }
    expect(parseAgentReply(null)).toBeNull();
    expect(parseAgentReply("")).toBeNull();
  });
});

describe("parseManagerCommand — #<lead> next / #<lead> <name>", () => {
  it("next / дальше", () => {
    expect(parseManagerCommand("#1053 next")).toEqual({ kind: "next", lead: "1053" });
    expect(parseManagerCommand("#1053 NEXT")).toEqual({ kind: "next", lead: "1053" });
    expect(parseManagerCommand("#1053 дальше")).toEqual({ kind: "next", lead: "1053" });
    expect(parseManagerCommand("# 1053 next")).toEqual({ kind: "next", lead: "1053" });
  });

  it("direct assign keeps the name as typed (resolution is case-insensitive)", () => {
    expect(parseManagerCommand("#1053 Ali")).toEqual({ kind: "assign", lead: "1053", name: "Ali" });
    expect(parseManagerCommand("#1053 ali")).toEqual({ kind: "assign", lead: "1053", name: "ali" });
  });

  it("garbled #-messages are invalid (→ help reply); no # is not a command", () => {
    expect(parseManagerCommand("#abc")).toEqual({ kind: "invalid" });
    expect(parseManagerCommand("#1053")).toEqual({ kind: "invalid" });
    expect(parseManagerCommand("#")).toEqual({ kind: "invalid" });
    expect(parseManagerCommand("hello")).toBeNull();
    expect(parseManagerCommand("1053 next")).toBeNull(); // no #
    expect(parseManagerCommand(null)).toBeNull();
  });
});

describe("runRentalDistributorPass — reply commands", () => {
  const OPP_NEW = { id: "opp-1", stage: "NEW_REQUEST", ownerId: "ali-id", ignoredCount: 0 };

  it("agent replies 1 → accepted: acceptedAt stamped, manager told once, cursor saved", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": OPP_NEW },
      replies: [reply(ALI, "1")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.replies).toBe(1);
    expect(counts.accepted).toBe(1);
    expect(counts.reassigned).toBe(0);
    const a = h.state.assignments["opp-1"]!;
    expect(a.done).toBe(true);
    expect(a.acceptedAt).toBe(NOW.toISOString());
    expect(h.patched).toEqual([{ id: "opp-1", patch: { acceptedAt: NOW.toISOString() } }]);
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]!.dedupeKey).toBe("mgr-accepted:opp-1");
    expect(h.sent[0]!.toDigits).toBe(MANAGER);
    expect(h.state.replyCursor).toBe(replyAt.toISOString());
  });

  it("agent replies 2 → immediate reassign, Ali excluded, DECLINED wording (not 'did not act')", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": OPP_NEW },
      replies: [reply(ALI, "2")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.replies).toBe(1);
    expect(counts.reassigned).toBe(1);
    const a = h.state.assignments["opp-1"]!;
    expect(a.ignoredNames).toEqual(["Ali"]);
    expect(a.agentName).toBe("Babek");
    expect(a.assignedAt).toBe(NOW.toISOString());
    const keys = h.sent.map((s) => s.dedupeKey);
    expect(keys).toEqual(["mgr-declined:opp-1:Ali", "assign:opp-1:Babek", "mgr-reassigned:opp-1:Babek"]);
    expect(h.sent[0]!.text).toContain("declined");
    expect(h.sent[0]!.text).not.toContain("did not act");
    // The new agent's ping carries the reply commands.
    expect(h.sent[1]!.text).toContain("1 = accept");
    expect(h.sent[1]!.text).toContain("2 = decline");
  });

  it("the reply applies to the agent's MOST RECENT pending assignment", async () => {
    const older = assignment({ leadNumber: "100", assignedAt: "2026-09-16T09:00:00.000Z" });
    const newer = assignment({ leadNumber: "101" });
    const h = harness({
      assignments: { "opp-0": older, "opp-1": newer },
      opps: { "opp-0": { ...OPP_NEW, id: "opp-0" }, "opp-1": OPP_NEW },
      replies: [reply(ALI, "принял")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.accepted).toBe(1);
    expect(h.state.assignments["opp-1"]!.done).toBe(true); // the newer one
    expect(h.state.assignments["opp-0"]!.done).toBe(false);
  });

  it("a sentence containing 'ok' from an agent does NOT accept — the window applies", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": OPP_NEW },
      replies: [reply(ALI, "ok let me call him in an hour")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.replies).toBe(0);
    expect(counts.accepted).toBe(0);
    expect(counts.reassigned).toBe(1); // expired, unanswered
  });

  it("a reply from a stranger's phone is not a command", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": OPP_NEW },
      replies: [reply("971501112233", "1")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.replies).toBe(0);
    expect(counts.reassigned).toBe(1);
  });

  it("a reply with no pending assignment is logged and ignored", async () => {
    const h = harness({
      assignments: { "opp-1": assignment({ done: true, acceptedAt: T0.toISOString() }) },
      opps: { "opp-1": OPP_NEW },
      replies: [reply(ALI, "1")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.replies).toBe(1);
    expect(counts.accepted).toBe(0);
    expect(h.sent).toEqual([]);
  });

  it("manager #101 next → current assignee skipped, reassigned, confirmation to the manager", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": OPP_NEW },
      replies: [reply(MANAGER, "#101 next")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.replies).toBe(1);
    expect(counts.reassigned).toBe(1);
    const a = h.state.assignments["opp-1"]!;
    expect(a.agentName).toBe("Babek");
    expect(a.ignoredNames).toEqual(["Ali"]);
    const confirm = h.sent.find((s) => s.dedupeKey.startsWith("cmd:"))!;
    expect(confirm.toDigits).toBe(MANAGER);
    expect(confirm.text).toContain("reassigned to Babek");
    expect(confirm.text).toContain("Ali");
  });

  it("manager #101 Babek → direct assign, availability NOT consulted, agent pinged", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": OPP_NEW },
      availability: { babek: { status: "off", busyUntil: null } }, // off-duty — steering overrides
      replies: [reply(MANAGER, "#101 Babek")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.replies).toBe(1);
    const a = h.state.assignments["opp-1"]!;
    expect(a.agentName).toBe("Babek");
    expect(a.memberId).toBe("babek-id");
    expect(a.phone).toBe(BABEK);
    expect(a.ignoredNames).toEqual([]); // steering is not a decline
    expect(a.done).toBe(false);
    expect(a.assignedAt).toBe(NOW.toISOString());
    expect(h.patched).toEqual([{ id: "opp-1", patch: { ownerId: "babek-id" } }]);
    const ping = h.sent.find((s) => s.dedupeKey === "assign:opp-1:Babek")!;
    expect(ping.toDigits).toBe(BABEK);
    const confirm = h.sent.find((s) => s.dedupeKey.startsWith("cmd:"))!;
    expect(confirm.text).toContain("assigned to Babek");
  });

  it("manager #101 Ali on a MANAGER-QUEUE card reactivates it", async () => {
    const queued = assignment({
      agentName: "Ayham",
      memberId: "ayham-id",
      done: true,
      managerQueue: true,
    });
    const h = harness({
      assignments: { "opp-1": queued },
      opps: { "opp-1": OPP_NEW },
      replies: [reply(MANAGER, "#101 Ali")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.replies).toBe(1);
    const a = h.state.assignments["opp-1"]!;
    expect(a.done).toBe(false);
    expect(a.managerQueue).toBeUndefined();
    expect(a.agentName).toBe("Ali");
    expect(h.patched).toEqual([{ id: "opp-1", patch: { ownerId: "ali-id" } }]);
  });

  it("manager #101 <unknown name> → reply listing the valid roster names", async () => {
    const inWindow = assignment({ assignedAt: new Date(NOW.getTime() - 5 * 60_000).toISOString() });
    const h = harness({
      assignments: { "opp-1": inWindow },
      opps: { "opp-1": OPP_NEW },
      replies: [reply(MANAGER, "#101 Zephyr")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.reassigned).toBe(0);
    expect(h.patched).toEqual([]);
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]!.toDigits).toBe(MANAGER);
    expect(h.sent[0]!.text).toContain('Unknown agent "Zephyr"');
    expect(h.sent[0]!.text).toContain("Ali");
    expect(h.sent[0]!.text).toContain("Babek");
  });

  it("manager #999 next (no such lead) → 'no pending assignment' reply", async () => {
    const inWindow = assignment({ assignedAt: new Date(NOW.getTime() - 5 * 60_000).toISOString() });
    const h = harness({
      assignments: { "opp-1": inWindow },
      opps: { "opp-1": OPP_NEW },
      replies: [reply(MANAGER, "#999 next")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.reassigned).toBe(0);
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]!.text).toContain("#999");
    expect(h.sent[0]!.text).toContain("no pending assignment");
  });

  it("manager garbled command → the help reply listing both forms", async () => {
    const inWindow = assignment({ assignedAt: new Date(NOW.getTime() - 5 * 60_000).toISOString() });
    const h = harness({
      assignments: { "opp-1": inWindow },
      opps: { "opp-1": OPP_NEW },
      replies: [reply(MANAGER, "#abc")],
    });
    await runRentalDistributorPass(h.deps, { commit: true });
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]!.toDigits).toBe(MANAGER);
    expect(h.sent[0]!.text).toContain("#<lead> next");
    expect(h.sent[0]!.text).toContain("#<lead> <name>");
  });

  it("manager chatter without # is not a command", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": OPP_NEW },
      replies: [reply(MANAGER, "how is it going")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.replies).toBe(0);
    expect(h.sent.find((s) => s.dedupeKey.startsWith("cmd:"))).toBeUndefined();
  });

  it("an unresolved @lid sender (no phone) is skipped, not guessed", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": OPP_NEW },
      replies: [reply(null, "1")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.replies).toBe(0);
    expect(counts.reassigned).toBe(1); // the window applies
  });

  it("dry-run: replies counted and planned, but no writes and the cursor stays", async () => {
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": OPP_NEW },
      replies: [reply(ALI, "1")],
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: false });
    expect(counts.replies).toBe(1);
    expect(counts.accepted).toBe(1);
    expect(h.patched).toEqual([]);
    expect(h.sent).toEqual([]);
    expect(h.state.assignments["opp-1"]!.done).toBe(false);
    expect(h.state.replyCursor).toBeNull();
  });
});

describe("runRentalDistributorPass — the roster phone is the ping target (override seam)", () => {
  const OPP_NEW = { id: "opp-1", stage: "NEW_REQUEST", ownerId: "ali-id", ignoredCount: 0 };

  it("the reassign ping goes to the roster's CURRENT phone — the runner applies applyPhoneOverrides (0077) before the pass", async () => {
    // Babek's manager-set DB override, already applied by the runner (the seam
    // is pure applyPhoneOverrides — pinned in rotation.test.ts). The pass must
    // send to whatever the roster row carries, never a hardcoded number.
    const overridden = [
      ROSTER[0]!,
      { ...ROSTER[1]!, phone: "971500000099" },
    ];
    const h = harness({
      assignments: { "opp-1": assignment() },
      opps: { "opp-1": OPP_NEW },
      rosters: { etm: overridden, cardiwan: [] },
    });
    const counts = await runRentalDistributorPass(h.deps, { commit: true });
    expect(counts.reassigned).toBe(1);
    const ping = h.sent.find((s) => s.dedupeKey === "assign:opp-1:Babek")!;
    expect(ping.toDigits).toBe("971500000099");
    expect(h.state.assignments["opp-1"]!.phone).toBe("971500000099");
  });
});

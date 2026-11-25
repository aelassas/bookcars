import { describe, expect, it, vi } from "vitest";
import {
  buildReassignText,
  emptyState,
  runRentalAutomationsPass,
  type RentalAutomationDeps,
  type RentalAutomationState,
} from "./rental-automations";
import type { TwentyClient } from "@/platform/integrations/twenty/client";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const WM_AYHAM = "wm-ayham";
const WM_ALI = "wm-ali";

const workspaceMembers = [
  { id: WM_AYHAM, name: { firstName: "Ayham", lastName: "" }, userEmail: "ayham@rental.ae" },
  { id: WM_ALI, name: { firstName: "Ali", lastName: "" }, userEmail: "ali@etm.com" },
];

/** An open lead whose owner just changed Ayham → Ali (delegation). */
const reassignedOpp = {
  id: "opp-1",
  name: "Ahmed",
  stage: "IN_PROGRESS",
  ownerId: WM_ALI,
  leadNumber: "12",
  phoneTail9: "501234567",
  whatsapp: { primaryLinkUrl: "https://wa.me/971501234567" },
  createdAt: "2026-08-20T10:00:00.000Z",
  updatedAt: "2026-08-28T10:00:00.000Z",
  updatedBy: { workspaceMemberId: WM_AYHAM, name: "Ayham" },
};

function stateWithPriorSnapshot(): RentalAutomationState {
  const state = emptyState();
  state.snapshot["opp-1"] = {
    stage: "IN_PROGRESS",
    ownerId: WM_AYHAM, // ← owner changed since the last pass
    followUpCount: null,
    bookingDate: null,
  };
  return state;
}

function makeDeps(overrides: Partial<RentalAutomationDeps> = {}) {
  const listAll = vi.fn((object: string) =>
    (async function* () {
      yield* (object === "opportunities" ? [reassignedOpp] : object === "workspaceMembers" ? workspaceMembers : []);
    })(),
  );
  const patch = vi.fn(async () => ({}));
  const batchCreate = vi.fn(async (object: string) =>
    object === "notes" ? [{ id: "note-1" }] : [{}],
  );
  const send = vi.fn(async () => {});
  const sendWhatsApp = vi.fn(async () => {});
  const deps: RentalAutomationDeps = {
    client: { listAll, patch, batchCreate } as unknown as TwentyClient,
    nextLeadNumber: async () => 1,
    db: {} as RentalAutomationDeps["db"],
    send,
    sendWhatsApp,
    resolveChat: async () => "tg-chat-ali",
    ownerPhones: { "ali@etm.com": "971542445835" },
    ownerNames: {},
    cardBaseUrl: "https://rent.takeauto.tech",
    state: stateWithPriorSnapshot(),
    now: new Date("2026-08-28T10:00:00.000Z"),
    dayLabel: "2026-08-28",
    hourDubai: 14, // off the 08:00 digest gate
    ...overrides,
  };
  return { deps, send, sendWhatsApp, batchCreate };
}

const EXPECTED_TEXT = buildReassignText({
  lead: "12",
  name: "Ahmed",
  phone: "501234567",
  manager: "Ayham",
  cardUrl: "https://rent.takeauto.tech/object/opportunity/opp-1",
  chatUrl: "https://web.whatsapp.com/send?phone=971501234567",
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("owner reassignment ping", () => {
  it("commit mode pings the new owner on Telegram AND WhatsApp", async () => {
    const { deps, send, sendWhatsApp } = makeDeps();
    const counts = await runRentalAutomationsPass(deps, { commit: true });

    expect(counts.errors).toEqual([]);
    expect(counts.ownerPings).toBe(1);
    expect(counts.ownerPingsWhatsApp).toBe(1);
    expect(send).toHaveBeenCalledWith("tg-chat-ali", EXPECTED_TEXT);
    expect(sendWhatsApp).toHaveBeenCalledWith("971542445835", EXPECTED_TEXT);
    // Follow-up monitor tracking must be armed.
    expect(deps.state.pendingReassign["opp-1"]?.ownerId).toBe(WM_ALI);
  });

  it("a WhatsApp failure still counts the Telegram ping and keeps tracking", async () => {
    const { deps, send, sendWhatsApp } = makeDeps({
      sendWhatsApp: vi.fn(async () => {
        throw new Error("wa_outbox down");
      }),
    });
    const counts = await runRentalAutomationsPass(deps, { commit: true });

    expect(send).toHaveBeenCalledWith("tg-chat-ali", EXPECTED_TEXT);
    expect(counts.ownerPings).toBe(1);
    expect(counts.ownerPingsWhatsApp).toBe(0);
    expect(counts.errors).toEqual(["ownerPingWA opp-1: wa_outbox down"]);
    expect(deps.state.pendingReassign["opp-1"]?.ownerId).toBe(WM_ALI);
  });

  it("dry-run never touches WhatsApp", async () => {
    const { deps, send, sendWhatsApp } = makeDeps();
    const counts = await runRentalAutomationsPass(deps, { commit: false });

    expect(counts.ownerPings).toBe(1); // would-ping count
    expect(counts.ownerPingsWhatsApp).toBe(0);
    expect(send).not.toHaveBeenCalled();
    expect(sendWhatsApp).not.toHaveBeenCalled();
  });

  it("owner without a phone on file skips WhatsApp but keeps the TG path", async () => {
    const { deps, send, sendWhatsApp } = makeDeps({ ownerPhones: {} });
    const counts = await runRentalAutomationsPass(deps, { commit: true });

    expect(counts.ownerPingsSkipped).toBe(1); // no phone → no chat either
    expect(counts.ownerPingsWhatsApp).toBe(0);
    expect(send).not.toHaveBeenCalled();
    expect(sendWhatsApp).not.toHaveBeenCalled();
    expect(deps.state.pendingReassign["opp-1"]?.ownerId).toBe(WM_ALI);
  });
});

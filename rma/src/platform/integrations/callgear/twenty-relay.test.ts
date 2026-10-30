// CallGear → Twenty relay tests. No network, no DB: the RelayStore and
// RelayTwenty adapter interfaces are faked in memory, so the pure planner and
// the orchestration are exercised exactly as in production.
import { describe, expect, it } from "vitest";
import {
  callTimestamp,
  formatCallSource,
  isPermanentTwentyError,
  planCallEnrich,
  planCallRelay,
  precheckRelay,
  runRelayPass,
  type ClaimedCallEvent,
  type RelayDeps,
  type RelayOutcome,
  type RelayStore,
  type RelayTwenty,
} from "./twenty-relay";
import type { CallGearCallFinishedParams } from "./types";

// The full opportunity field list the live workspace has (bootstrap-created).
const ALL_FIELDS = new Set([
  "name",
  "stage",
  "pointOfContactId",
  "externalId",
  "externalSource",
  "stageDetail",
  "phoneTail9",
  "whatsapp",
  "brandLine",
  "recording",
  "callDurationSeconds",
  "callDirection",
  "callStartedAt",
  "callAgentName",
  "callSource",
]);

// ─── In-memory fakes ────────────────────────────────────────────────────────

interface FakeEventRow extends ClaimedCallEvent {
  status: string;
  error: string | null;
}

function makeParams(overrides: Partial<CallGearCallFinishedParams> = {}): CallGearCallFinishedParams {
  return {
    callId: "call-1",
    startTime: "2026-08-03T10:15:00.000Z",
    endTime: "2026-08-03T10:17:17.000Z",
    duration: 137,
    direction: "inbound",
    from: "+971501234567",
    to: "+97142000000",
    recordingUrl: "https://recordings.example/call-1.mp3",
    agent: { id: "agent-1", name: "Mariam Saleh", extension: "204" },
    customer: { name: "Ahmed Al Mansoori" },
    ...overrides,
  };
}

function makeEvent(overrides: Partial<FakeEventRow> = {}): FakeEventRow {
  const params = overrides.params === undefined ? makeParams() : overrides.params;
  return {
    id: overrides.id ?? "evt-1",
    tenantId: "tenant-1",
    callId: params?.callId ?? "call-1",
    status: "queued",
    error: null,
    ...overrides,
    params,
  };
}

class FakeStore implements RelayStore {
  rows: FakeEventRow[];
  slugs: Record<string, string | null>;
  constructor(rows: FakeEventRow[], slugs: Record<string, string | null> = { "tenant-1": "take-auto" }) {
    this.rows = rows;
    this.slugs = slugs;
  }
  async claim(batchSize: number): Promise<ClaimedCallEvent[]> {
    const batch = this.rows
      .filter((r) => r.status === "queued" || r.status === "failed")
      .slice(0, batchSize);
    for (const r of batch) r.status = "processing";
    return batch;
  }
  async settle(eventId: string, _tenantId: string, outcome: RelayOutcome): Promise<void> {
    const row = this.rows.find((r) => r.id === eventId);
    if (!row) throw new Error(`unknown event ${eventId}`);
    row.status = outcome.status;
    row.error = outcome.status === "done" ? null : outcome.error;
  }
  async tenantSlug(tenantId: string): Promise<string | null> {
    return this.slugs[tenantId] ?? null;
  }
}

class FakeTwenty implements RelayTwenty {
  people: ({ id: string } & Record<string, unknown>)[] = [];
  opportunities: ({ id: string } & Record<string, unknown>)[] = [];
  /** When set, the next Twenty call throws this error (then clears). */
  nextError: Error | null = null;
  /** When set, EVERY Twenty call throws until cleared. */
  stickyError: Error | null = null;

  private maybeThrow(): void {
    if (this.stickyError) throw this.stickyError;
    if (this.nextError) {
      const e = this.nextError;
      this.nextError = null;
      throw e;
    }
  }
  async findPersonByTail9(tail9: string) {
    this.maybeThrow();
    return this.people.find((p) => p.phoneTail9 === tail9) ?? null;
  }
  async findOpportunityByExternalId(externalId: string) {
    this.maybeThrow();
    return this.opportunities.find((o) => o.externalId === externalId) ?? null;
  }
  async createPerson(payload: Record<string, unknown>) {
    this.maybeThrow();
    const rec = { id: `person-${this.people.length + 1}`, ...payload };
    this.people.push(rec);
    return { id: rec.id };
  }
  async createOpportunity(payload: Record<string, unknown>) {
    this.maybeThrow();
    const rec = { id: `opp-${this.opportunities.length + 1}`, ...payload };
    this.opportunities.push(rec);
    return { id: rec.id };
  }
  async patchOpportunity(id: string, patch: Record<string, unknown>) {
    this.maybeThrow();
    const opp = this.opportunities.find((o) => o.id === id);
    if (opp) Object.assign(opp, patch);
  }
}

function makeDeps(store: FakeStore, twenty: FakeTwenty, fields: ReadonlySet<string> = ALL_FIELDS): RelayDeps {
  return { store, twenty, opportunityFields: fields };
}

// ─── Pure logic ─────────────────────────────────────────────────────────────

describe("precheckRelay", () => {
  it("admits inbound calls with a valid caller phone", () => {
    const pre = precheckRelay(makeParams());
    expect(pre.proceed).toBe(true);
    if (pre.proceed) {
      expect(pre.phone.e164).toBe("+971501234567");
      expect(pre.phone.tail9).toBe("501234567");
    }
  });

  it("marks outbound calls done (agents calling customers are not new leads)", () => {
    const pre = precheckRelay(makeParams({ direction: "outbound" }));
    expect(pre).toMatchObject({ proceed: false, outcome: "done" });
  });

  it("marks an invalid caller phone dead", () => {
    const pre = precheckRelay(makeParams({ from: "123" }));
    expect(pre).toMatchObject({ proceed: false, outcome: "dead", reason: "invalid caller phone" });
  });
});

describe("planCallRelay", () => {
  const base = {
    params: makeParams(),
    phone: { e164: "+971501234567", tail9: "501234567" },
    existingPersonId: null,
    existingOpportunityId: null,
    opportunityFields: ALL_FIELDS,
    brandLine: "takeauto",
  };

  it("plans person create + opportunity for a new caller", () => {
    const plan = planCallRelay(base);
    expect(plan.action).toBe("create_lead");
    if (plan.action !== "create_lead") return;
    expect(plan.person).toMatchObject({
      kind: "create",
      payload: {
        name: { firstName: "Ahmed", lastName: "Al Mansoori" },
        externalSource: "callgear",
        phoneTail9: "501234567",
        brandLine: "takeauto",
      },
    });
    expect(plan.opportunity).toMatchObject({
      // 10:15 UTC is 14:15 in Dubai, where the phone actually rang.
      name: "Inbound call +971501234567 2026-08-03 14:15",
      stage: "NEW",
      externalId: "callgear:call-1",
      externalSource: "callgear",
      stageDetail: "Answered call",
      phoneTail9: "501234567",
      whatsapp: {
        primaryLinkUrl: "https://web.whatsapp.com/send?phone=971501234567",
        primaryLinkLabel: "+971501234567",
        secondaryLinks: [],
      },
      brandLine: "takeauto",
      recording: {
        primaryLinkUrl: "https://recordings.example/call-1.mp3",
        primaryLinkLabel: "Call recording",
        secondaryLinks: [],
      },
      callDurationSeconds: 137,
      callDirection: "INBOUND",
      callStartedAt: "2026-08-03T10:15:00.000Z",
      callAgentName: "Mariam Saleh",
    });
    expect(plan.skippedFields).toEqual([]);
  });

  it("leaves the recording link unset (no crash) when the payload has no recordingUrl", () => {
    const plan = planCallRelay({ ...base, params: makeParams({ recordingUrl: null }) });
    expect(plan.action).toBe("create_lead");
    if (plan.action !== "create_lead") return;
    expect(plan.opportunity).not.toHaveProperty("recording");
  });

  it("leaves callAgentName unset when the payload names no agent", () => {
    const plan = planCallRelay({ ...base, params: makeParams({ agent: null }) });
    expect(plan.action).toBe("create_lead");
    if (plan.action !== "create_lead") return;
    expect(plan.opportunity).not.toHaveProperty("callAgentName");
  });

  it("passes the direction through as the UPPER_SNAKE select value", () => {
    // precheckRelay keeps outbound calls off the planner in production; the
    // mapping itself is direction-agnostic and uppercases whatever arrives.
    const plan = planCallRelay({ ...base, params: makeParams({ direction: "outbound" }) });
    expect(plan.action).toBe("create_lead");
    if (plan.action !== "create_lead") return;
    expect(plan.opportunity.callDirection).toBe("OUTBOUND");
  });

  it("reuses an existing person matched by phoneTail9", () => {
    const plan = planCallRelay({ ...base, existingPersonId: "person-9" });
    expect(plan.action).toBe("create_lead");
    if (plan.action !== "create_lead") return;
    expect(plan.person).toEqual({ kind: "reuse", id: "person-9" });
  });

  it("does nothing when the opportunity for this callId already exists", () => {
    const plan = planCallRelay({ ...base, existingOpportunityId: "opp-7" });
    expect(plan.action).toBe("already_relayed");
  });

  it("stamps where the call came from onto the card", () => {
    const plan = planCallRelay({
      ...base,
      params: makeParams({
        metadata: { scenario: "Отдел продаж", site: "easy-rent.ae", campaign: "Посты Ани", tags: ["Нецелевой контакт"] },
      }),
    });
    expect(plan.action).toBe("create_lead");
    if (plan.action !== "create_lead") return;
    expect(plan.opportunity.callSource).toBe("Отдел продаж · easy-rent.ae · Посты Ани · Нецелевой контакт");
  });

  it("falls back to a phone-tail name for nameless callers (never 'Unknown')", () => {
    const plan = planCallRelay({ ...base, params: makeParams({ customer: null }) });
    expect(plan.action).toBe("create_lead");
    if (plan.action !== "create_lead" || plan.person.kind !== "create") return;
    expect(plan.person.payload.name).toEqual({ firstName: "+…501234567", lastName: "" });
  });

  it("omits brandLine when the tenant maps to no brand (fail closed)", () => {
    const plan = planCallRelay({ ...base, brandLine: null });
    expect(plan.action).toBe("create_lead");
    if (plan.action !== "create_lead") return;
    expect(plan.opportunity).not.toHaveProperty("brandLine");
    if (plan.person.kind === "create") {
      expect(plan.person.payload).not.toHaveProperty("brandLine");
    }
  });

  it("tolerates a workspace missing the call-metadata fields", () => {
    const fields = new Set(ALL_FIELDS);
    for (const f of ["recording", "callDurationSeconds", "callDirection", "callStartedAt", "callAgentName"]) {
      fields.delete(f);
    }
    const plan = planCallRelay({ ...base, opportunityFields: fields });
    expect(plan.action).toBe("create_lead");
    if (plan.action !== "create_lead") return;
    expect(plan.opportunity).not.toHaveProperty("recording");
    expect(plan.opportunity).not.toHaveProperty("callDurationSeconds");
    expect(plan.opportunity).not.toHaveProperty("callDirection");
    expect(plan.opportunity).not.toHaveProperty("callStartedAt");
    expect(plan.opportunity).not.toHaveProperty("callAgentName");
    expect(plan.skippedFields.sort()).toEqual(
      ["callAgentName", "callDirection", "callDurationSeconds", "callStartedAt", "recording"].sort()
    );
  });

  it("refuses to relay when required fields are absent from the workspace", () => {
    const fields = new Set(ALL_FIELDS);
    fields.delete("externalId");
    const plan = planCallRelay({ ...base, opportunityFields: fields });
    expect(plan).toEqual({ action: "workspace_broken", missing: ["externalId"] });
  });

  it("accepts the live metadata relation name `pointOfContact` (FK writes stay `pointOfContactId`)", () => {
    // The sales workspace (verified live 2026-08-07) names the relation
    // `pointOfContact` (RELATION) — there is no `pointOfContactId` in
    // metadata; that name only exists in the REST write body.
    const fields = new Set(ALL_FIELDS);
    fields.delete("pointOfContactId");
    fields.add("pointOfContact");
    const plan = planCallRelay({ ...base, opportunityFields: fields });
    expect(plan.action).toBe("create_lead");
  });

  it("refuses to relay when the point-of-contact relation is absent entirely", () => {
    const fields = new Set(ALL_FIELDS);
    fields.delete("pointOfContactId");
    const plan = planCallRelay({ ...base, opportunityFields: fields });
    expect(plan).toEqual({ action: "workspace_broken", missing: ["pointOfContact"] });
  });
});

describe("formatCallSource", () => {
  it("drops the parts CallGear did not send", () => {
    expect(formatCallSource({ scenario: "Отдел продаж", site: "", campaign: undefined })).toBe("Отдел продаж");
    expect(formatCallSource({})).toBeUndefined();
    expect(formatCallSource(undefined)).toBeUndefined();
  });
});

describe("planCallEnrich (the second half of one call)", () => {
  const fields = ALL_FIELDS;

  it("lands the recording and the attribution on the card the call-end event created", () => {
    const patch = planCallEnrich({
      params: makeParams({
        recordingUrl: "https://app.callgear.ae/system/media/talk/207557522/4a1f/",
        duration: 16,
        metadata: { site: "easy-rent.ae", campaign: "Посты Ани" },
      }),
      existing: { id: "opp-1", stageDetail: "Missed call", callDurationSeconds: 0, recording: null },
      opportunityFields: fields,
    });
    expect(patch.recording).toMatchObject({ primaryLinkUrl: "https://app.callgear.ae/system/media/talk/207557522/4a1f/" });
    expect(patch.callDurationSeconds).toBe(16);
    // Somebody DID pick up — the card must stop calling it a missed call.
    expect(patch.stageDetail).toBe("Answered call");
    expect(patch.callSource).toBe("easy-rent.ae · Посты Ани");
  });

  it("never overwrites what the card already carries", () => {
    const patch = planCallEnrich({
      params: makeParams({ recordingUrl: "https://new/", duration: 5, agent: { name: "Someone Else" } }),
      existing: {
        id: "opp-1",
        recording: { primaryLinkUrl: "https://manual/" },
        callDurationSeconds: 17,
        callAgentName: "Садыгов Бабек",
        stageDetail: "Answered call",
        callStartedAt: "2026-08-10T06:47:55.568Z",
      },
      opportunityFields: fields,
    });
    expect(patch).toEqual({});
  });

  it("skips fields the workspace does not have", () => {
    const patch = planCallEnrich({
      params: makeParams({ recordingUrl: "https://rec/", metadata: { site: "easy-rent.ae" } }),
      existing: { id: "opp-1" },
      opportunityFields: new Set(["name"]),
    });
    expect(patch).toEqual({});
  });

  it("fills a blank owner with the answering agent, never takes a held card", () => {
    const fill = planCallEnrich({
      params: makeParams({}),
      existing: { id: "opp-1", ownerId: null },
      opportunityFields: fields,
      ownerId: "m-babek",
    });
    expect(fill.ownerId).toBe("m-babek");
    const held = planCallEnrich({
      params: makeParams({}),
      existing: { id: "opp-1", ownerId: "m-ali" },
      opportunityFields: fields,
      ownerId: "m-babek",
    });
    expect(held.ownerId).toBeUndefined();
  });
});

describe("isPermanentTwentyError", () => {
  it("classifies 4xx (except 429) as permanent", () => {
    expect(isPermanentTwentyError(new Error('Twenty POST people HTTP 400: {"code":"INVALID_DATA"}'))).toBe(true);
    expect(isPermanentTwentyError(new Error("Twenty GET people HTTP 404: not found"))).toBe(true);
  });
  it("classifies 429/5xx/timeouts as transient", () => {
    expect(isPermanentTwentyError(new Error("Twenty GET people HTTP 429: rate limited"))).toBe(false);
    expect(isPermanentTwentyError(new Error("Twenty POST people HTTP 500: boom"))).toBe(false);
    expect(isPermanentTwentyError(new Error("Twenty GET people timed out after 30000ms"))).toBe(false);
    expect(isPermanentTwentyError(new Error("fetch failed"))).toBe(false);
  });
});

// ─── Orchestration (faked adapters) ─────────────────────────────────────────

describe("runRelayPass", () => {
  it("relays an inbound call: creates person + linked opportunity, marks done", async () => {
    const store = new FakeStore([makeEvent()]);
    const twenty = new FakeTwenty();
    const report = await runRelayPass(makeDeps(store, twenty), 25);

    expect(report).toMatchObject({ claimed: 1, done: 1, failed: 0, dead: 0 });
    expect(twenty.people).toHaveLength(1);
    expect(twenty.opportunities).toHaveLength(1);
    expect(twenty.opportunities[0]).toMatchObject({
      externalId: "callgear:call-1",
      stage: "NEW",
      pointOfContactId: twenty.people[0].id,
      brandLine: "takeauto",
      recording: { primaryLinkUrl: "https://recordings.example/call-1.mp3" },
      whatsapp: { primaryLinkUrl: "https://web.whatsapp.com/send?phone=971501234567" },
      callDurationSeconds: 137,
      callDirection: "INBOUND",
      callStartedAt: "2026-08-03T10:15:00.000Z",
      callAgentName: "Mariam Saleh",
    });
    expect(store.rows[0].status).toBe("done");
    expect(store.rows[0].error).toBeNull();
  });

  it("reuses the person on a repeat call from the same number", async () => {
    const store = new FakeStore([
      makeEvent({ id: "evt-1", params: makeParams({ callId: "call-1" }) }),
      makeEvent({ id: "evt-2", params: makeParams({ callId: "call-2" }) }),
    ]);
    const twenty = new FakeTwenty();
    const report = await runRelayPass(makeDeps(store, twenty), 25);

    expect(report.done).toBe(2);
    expect(twenty.people).toHaveLength(1); // same tail9 → one person
    expect(twenty.opportunities).toHaveLength(2);
    expect(twenty.opportunities[1].pointOfContactId).toBe(twenty.people[0].id);
  });

  it("creates exactly one opportunity when the same callId is processed twice", async () => {
    const store = new FakeStore([
      makeEvent({ id: "evt-1" }),
      makeEvent({ id: "evt-2" }), // same callId — crash-retry duplicate
    ]);
    const twenty = new FakeTwenty();
    const report = await runRelayPass(makeDeps(store, twenty), 25);

    expect(report.done).toBe(2);
    expect(twenty.opportunities).toHaveLength(1);
  });

  it("marks outbound calls done without any Twenty write", async () => {
    const store = new FakeStore([makeEvent({ params: makeParams({ direction: "outbound" }) })]);
    const twenty = new FakeTwenty();
    const report = await runRelayPass(makeDeps(store, twenty), 25);

    expect(report.done).toBe(1);
    expect(twenty.people).toHaveLength(0);
    expect(twenty.opportunities).toHaveLength(0);
    expect(store.rows[0].status).toBe("done");
  });

  it("marks an invalid caller phone dead without any Twenty write", async () => {
    const store = new FakeStore([makeEvent({ params: makeParams({ from: "123" }) })]);
    const twenty = new FakeTwenty();
    const report = await runRelayPass(makeDeps(store, twenty), 25);

    expect(report.dead).toBe(1);
    expect(store.rows[0]).toMatchObject({ status: "dead", error: "invalid caller phone" });
    expect(twenty.people).toHaveLength(0);
  });

  it("marks malformed payloads dead", async () => {
    const store = new FakeStore([makeEvent({ params: null })]);
    const twenty = new FakeTwenty();
    const report = await runRelayPass(makeDeps(store, twenty), 25);
    expect(report.dead).toBe(1);
    expect(store.rows[0].status).toBe("dead");
  });

  it("marks a Twenty 4xx rejection dead (never retried)", async () => {
    const store = new FakeStore([makeEvent()]);
    const twenty = new FakeTwenty();
    twenty.stickyError = new Error('Twenty POST people HTTP 400: {"code":"INVALID_FIELD_INPUT"}');
    const report = await runRelayPass(makeDeps(store, twenty), 25);

    expect(report.dead).toBe(1);
    expect(store.rows[0].status).toBe("dead");
    expect(store.rows[0].error).toContain("HTTP 400");
  });

  it("marks a 429 failed and retries it on the next pass", async () => {
    const store = new FakeStore([makeEvent()]);
    const twenty = new FakeTwenty();

    twenty.stickyError = new Error("Twenty GET people HTTP 429: rate limited");
    const first = await runRelayPass(makeDeps(store, twenty), 25);
    expect(first.failed).toBe(1);
    expect(store.rows[0].status).toBe("failed");
    expect(twenty.opportunities).toHaveLength(0);

    // Throttle gone — the failed event is claimed again and relays cleanly.
    twenty.stickyError = null;
    const second = await runRelayPass(makeDeps(store, twenty), 25);
    expect(second.done).toBe(1);
    expect(store.rows[0].status).toBe("done");
    expect(twenty.opportunities).toHaveLength(1);
  });

  it("keeps a created person reusable when the opportunity create dies (crash-safe)", async () => {
    const store = new FakeStore([makeEvent()]);
    const twenty = new FakeTwenty();
    // Person create succeeds, opportunity create hits a transient wall.
    const realCreateOpp = twenty.createOpportunity.bind(twenty);
    twenty.createOpportunity = async () => {
      throw new Error("Twenty POST opportunities HTTP 503: unavailable");
    };

    const first = await runRelayPass(makeDeps(store, twenty), 25);
    expect(first.failed).toBe(1);
    expect(twenty.people).toHaveLength(1);
    expect(twenty.opportunities).toHaveLength(0);

    twenty.createOpportunity = realCreateOpp;
    const second = await runRelayPass(makeDeps(store, twenty), 25);
    expect(second.done).toBe(1);
    expect(twenty.people).toHaveLength(1); // no duplicate person
    expect(twenty.opportunities).toHaveLength(1);
    expect(twenty.opportunities[0].pointOfContactId).toBe(twenty.people[0].id);
  });

  it("omits brandLine for an unmapped tenant instead of guessing", async () => {
    const store = new FakeStore([makeEvent()], { "tenant-1": "mystery-tenant" });
    const twenty = new FakeTwenty();
    const report = await runRelayPass(makeDeps(store, twenty), 25);

    expect(report.done).toBe(1);
    expect(twenty.opportunities[0]).not.toHaveProperty("brandLine");
  });

  // Ayham, 2026-09-01: "WhatsApp leads started from #1, now #30; inbound calls
  // also started from #1, now #16 — so there are duplicated numbers."
  //
  // Both series land on the SAME rental board, so they must share that board's
  // counter. The call relay was drawing from the sales counter because its
  // DEFAULT route is sales — but the card it writes is decided per tenant, and
  // a rental brand's call is a rental card. The number must follow the card,
  // not the relay's default.
  it("numbers a rental call from the RENTAL counter, not the relay's default", async () => {
    const store = new FakeStore([makeEvent({ tenantId: "tenant-rent" })], { "tenant-rent": "cardiwan" });
    const defaultTwenty = new FakeTwenty();
    const rentalTwenty = new FakeTwenty();
    const deps = makeDeps(store, defaultTwenty);
    deps.nextLeadNumber = async () => 500;               // the sales counter
    const WITH_NUMBER = new Set([...ALL_FIELDS, "leadNumber"]);
    deps.routeForTenant = async () => ({
      twenty: rentalTwenty,
      opportunityFields: WITH_NUMBER,
      newStage: "NEW_REQUEST",
      nextLeadNumber: async () => 31,                    // the rental board's own
    });

    await runRelayPass(deps, 25);

    expect(rentalTwenty.opportunities[0].leadNumber).toBe("31");
    expect(rentalTwenty.opportunities[0].name).toMatch(/^#31 /);
  });

  it("falls back to the relay's counter when a route does not carry one", async () => {
    const store = new FakeStore([makeEvent({ tenantId: "tenant-rent" })], { "tenant-rent": "cardiwan" });
    const twenty = new FakeTwenty();
    const deps = makeDeps(store, twenty);
    deps.nextLeadNumber = async () => 500;
    deps.routeForTenant = async () => ({
      twenty,
      opportunityFields: new Set([...ALL_FIELDS, "leadNumber"]),
      newStage: "NEW_REQUEST",
    });

    await runRelayPass(deps, 25);

    expect(twenty.opportunities[0].leadNumber).toBe("500");
  });

  it("routes a rental tenant's call to the rental instance, not the default one", async () => {
    const store = new FakeStore([makeEvent({ tenantId: "tenant-rent" })], { "tenant-rent": "cardiwan" });
    const defaultTwenty = new FakeTwenty();
    const rentalTwenty = new FakeTwenty();
    const deps = makeDeps(store, defaultTwenty);
    deps.routeForTenant = async (tenantId) =>
      tenantId === "tenant-rent"
        ? { twenty: rentalTwenty, opportunityFields: ALL_FIELDS, newStage: "NEW_REQUEST" }
        : { twenty: defaultTwenty, opportunityFields: ALL_FIELDS, newStage: "NEW" };

    const report = await runRelayPass(deps, 25);

    expect(report).toMatchObject({ claimed: 1, done: 1, failed: 0, dead: 0 });
    expect(rentalTwenty.opportunities).toHaveLength(1);
    expect(rentalTwenty.people).toHaveLength(1);
    expect(defaultTwenty.opportunities).toHaveLength(0);
    expect(defaultTwenty.people).toHaveLength(0);
    expect(rentalTwenty.opportunities[0].brandLine).toBe("cardiwan");
    // The rental workspace renamed its pipeline stages and 400s on `NEW`.
    expect(rentalTwenty.opportunities[0].stage).toBe("NEW_REQUEST");
  });

  it("patches the recording onto an already-relayed opportunity (late file_link event)", async () => {
    const store = new FakeStore([
      makeEvent({ id: "evt-end", params: makeParams({ callId: "call-9", recordingUrl: null }) }),
      makeEvent({ id: "evt-rec", params: makeParams({ callId: "call-9", recordingUrl: "https://files.example/call-9.mp3" }) }),
    ]);
    const twenty = new FakeTwenty();
    const report = await runRelayPass(makeDeps(store, twenty), 25);

    expect(report).toMatchObject({ claimed: 2, done: 2, failed: 0, dead: 0 });
    // One opportunity, not two — and it carries the late-arriving recording.
    expect(twenty.opportunities).toHaveLength(1);
    expect(twenty.opportunities[0].recording).toMatchObject({
      primaryLinkUrl: "https://files.example/call-9.mp3",
    });
    expect(store.rows.every((r) => r.status === "done")).toBe(true);
  });

  // The exact sequence of Babek's 2026-08-10 11:47 call, which reached the
  // board as an empty "Missed call": the first notification knows nothing but
  // the number, the second brings the talk time, the file and the campaign.
  it("assembles ONE complete card out of the two notifications of a real call", async () => {
    const store = new FakeStore([
      makeEvent({
        id: "evt-end",
        params: makeParams({ callId: "207557522", duration: 0, recordingUrl: null, metadata: { scenario: "Отдел продаж" } }),
      }),
      makeEvent({
        id: "evt-rec",
        params: makeParams({
          callId: "207557522",
          duration: 16,
          recordingUrl: "https://app.callgear.ae/system/media/talk/207557522/4a1f/",
          metadata: { site: "easy-rent.ae", campaign: "Посты Ани", tags: ["Нецелевой контакт"] },
        }),
      }),
    ]);
    const twenty = new FakeTwenty();
    const report = await runRelayPass(makeDeps(store, twenty), 25);

    expect(report).toMatchObject({ claimed: 2, done: 2, failed: 0, dead: 0 });
    expect(twenty.opportunities).toHaveLength(1);
    const card = twenty.opportunities[0];
    expect(card.recording).toMatchObject({ primaryLinkUrl: "https://app.callgear.ae/system/media/talk/207557522/4a1f/" });
    expect(card.callDurationSeconds).toBe(16);
    expect(card.stageDetail).toBe("Answered call"); // it was picked up, after all
    expect(card.callSource).toBe("Отдел продаж"); // first source wins, never clobbered
    expect(card.phoneTail9).toBe("501234567");
  });

  it("never overwrites a recording that is already set", async () => {
    const store = new FakeStore([
      makeEvent({ id: "evt-end", params: makeParams({ callId: "call-10", recordingUrl: "https://files.example/first.mp3" }) }),
      makeEvent({ id: "evt-rec", params: makeParams({ callId: "call-10", recordingUrl: "https://files.example/second.mp3" }) }),
    ]);
    const twenty = new FakeTwenty();
    await runRelayPass(makeDeps(store, twenty), 25);

    expect(twenty.opportunities).toHaveLength(1);
    expect((twenty.opportunities[0].recording as { primaryLinkUrl: string }).primaryLinkUrl).toBe(
      "https://files.example/first.mp3"
    );
  });

  it("fails transiently when the tenant's instance is unconfigured — never falls back", async () => {
    const store = new FakeStore([makeEvent({ tenantId: "tenant-rent" })], { "tenant-rent": "cardiwan" });
    const defaultTwenty = new FakeTwenty();
    const deps = makeDeps(store, defaultTwenty);
    deps.routeForTenant = async () => ({ error: "Twenty instance 'rental' not configured" });

    const report = await runRelayPass(deps, 25);

    expect(report).toMatchObject({ claimed: 1, done: 0, failed: 1, dead: 0 });
    expect(defaultTwenty.opportunities).toHaveLength(0);
    expect(store.rows[0].status).toBe("failed");
    expect(store.rows[0].error).toContain("not configured");
  });
});

// Cards created just after midnight were named "… 2026-09-01 24:28". Every
// midnight-hour card in the relay log, across five separate days, carried a 24.
//
// `hour12: false` is not a 24-hour clock: on homebrew node@20 — the Node the
// production beats actually run — it selects the h24 cycle, which numbers the
// midnight hour 24. Newer Node returns 00 either way, so this test passes
// without the fix on a modern laptop and fails on the box. That gap is the
// point: verify on the runtime that ships.
describe("callTimestamp — the midnight hour is 00, never 24", () => {
  it("00:28 Dubai is 00:28, not 24:28", () => {
    expect(callTimestamp("2026-08-31T20:28:00Z")).toBe("2026-09-01 00:28");
  });

  it("the minute before midnight still belongs to the old day", () => {
    expect(callTimestamp("2026-08-31T19:59:00Z")).toBe("2026-08-31 23:59");
  });
});

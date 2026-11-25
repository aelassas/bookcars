// CallGear recording transcriber tests. No network, no DB, no live
// whisper/ollama: the TranscriberStore / RecordingDownloader / WhisperRunner /
// TranscriberTwenty adapter interfaces are faked in memory, and the model is
// a fixed function — the pure validators and the orchestration are exercised
// exactly as in production.
import { describe, expect, it } from "vitest";
import {
  buildAnalysisPrompt,
  buildTranscriptNoteBody,
  parseCallAnalysis,
  recordingDestPath,
  recordingExtension,
  runTranscriberPass,
  safeCallIdStem,
  transcriptNoteTitle,
  isPlaceholderName,
  type CallAnalysis,
  type CallCardFacts,
  type EligibleCall,
  type RecordingDownloader,
  type RoutedTenant,
  type StoredCallSummary,
  type TranscriberDeps,
  type TranscriberStore,
  type TranscriberTwenty,
  type TranscriptProgressPatch,
  type WhisperRunner,
} from "./transcriber";
import type { CallGearCallFinishedParams } from "./types";

const TRANSCRIPT =
  "Agent: good afternoon, TAKE Auto, how can I help you? " +
  "Customer: salam, I want to rent a Nissan Patrol for one week. " +
  "Agent: sure, we have it at 500 AED per day. " +
  "Customer: my budget is 3000 AED maximum, can you do a deal?";

const VALID_ANALYSIS_JSON = JSON.stringify({
  summary: "Customer wants to rent a Nissan Patrol for a week within a 3000 AED budget.",
  callerIntent: "weekly rental enquiry",
  budgetAed: 3000,
  carOfInterest: "Nissan Patrol",
  customerName: "Salem",
  carYear: "2024",
  rentalDays: 7,
  neededFrom: "tomorrow",
  quotedPriceAed: 500,
  whatsappConfirmed: true,
  language: "arabic",
  urgency: "warm",
  agentTalkRatioEstimate: 0.4,
  outcomeHint: "Agent to confirm availability and call back.",
  evidence: ["I want to rent a Nissan Patrol for one week", "my budget is 3000 AED maximum"],
});

function makeParams(overrides: Partial<CallGearCallFinishedParams> = {}): CallGearCallFinishedParams {
  return {
    callId: "call-1",
    startTime: "2026-08-08T10:15:00.000Z",
    endTime: "2026-08-08T10:17:17.000Z",
    duration: 137,
    direction: "inbound",
    from: "+971501234567",
    to: "+97142000000",
    recordingUrl: "http://100.121.35.35:8099/recordings/call-1.mp3",
    agent: { id: "agent-1", name: "Mariam Saleh" },
    ...overrides,
  };
}

function makeEvent(overrides: Partial<EligibleCall> = {}): EligibleCall {
  const params = overrides.params === undefined ? makeParams() : overrides.params;
  return {
    eventId: "evt-1",
    tenantId: "tenant-1",
    callId: params?.callId ?? "call-1",
    recordingUrl: params?.recordingUrl ?? "http://100.121.35.35:8099/recordings/call-1.mp3",
    params,
    transcriptRowId: null,
    recordingPath: null,
    transcriptText: null,
    summaryJson: null,
    ...overrides,
  };
}

// ─── In-memory fakes ────────────────────────────────────────────────────────

class FakeStore implements TranscriberStore {
  eligible: EligibleCall[];
  /** Every mutation, in order — the dry-run test asserts this stays empty. */
  mutations: string[] = [];
  /** tenantIds seen by the last findEligible call. */
  lastClaimTenantIds: string[] = [];
  rows = new Map<string, { status: string; error: string | null; patch: TranscriptProgressPatch }>();
  private seq = 0;

  constructor(eligible: EligibleCall[]) {
    this.eligible = eligible;
  }
  async findEligible(tenantIds: string[], batchSize: number): Promise<EligibleCall[]> {
    this.lastClaimTenantIds = tenantIds;
    return this.eligible.filter((e) => tenantIds.includes(e.tenantId)).slice(0, batchSize);
  }
  async beginJob(tenantId: string, event: EligibleCall): Promise<string | null> {
    this.mutations.push(`beginJob:${event.callId}`);
    const rowId = event.transcriptRowId ?? `row-${++this.seq}`;
    this.rows.set(rowId, { status: "processing", error: null, patch: {} });
    return rowId;
  }
  async saveProgress(tenantId: string, rowId: string, patch: TranscriptProgressPatch): Promise<void> {
    this.mutations.push(`saveProgress:${rowId}:${Object.keys(patch).join(",")}`);
    const row = this.rows.get(rowId);
    if (row) row.patch = { ...row.patch, ...patch };
  }
  async markDone(tenantId: string, rowId: string, note?: string): Promise<void> {
    this.mutations.push(`markDone:${rowId}${note ? `:${note}` : ""}`);
    const row = this.rows.get(rowId);
    if (row) {
      row.status = "done";
      row.error = note ?? null;
    }
  }
  async markError(tenantId: string, rowId: string, error: string): Promise<void> {
    this.mutations.push(`markError:${rowId}:${error}`);
    const row = this.rows.get(rowId);
    if (row) {
      row.status = "error";
      row.error = error;
    }
  }
  onlyRow() {
    return [...this.rows.values()][0];
  }
}

class FakeDownloader implements RecordingDownloader {
  calls: { url: string; destPath: string }[] = [];
  /** When set, the NEXT download throws this, then clears (one bad link). */
  error: Error | null = null;
  async download(url: string, destPath: string): Promise<void> {
    this.calls.push({ url, destPath });
    if (this.error) {
      const e = this.error;
      this.error = null;
      throw e;
    }
  }
}

class FakeWhisper implements WhisperRunner {
  calls: string[] = [];
  text = TRANSCRIPT;
  language: string | null = "ar";
  async transcribe(audioPath: string) {
    this.calls.push(audioPath);
    return { text: this.text, language: this.language };
  }
}

class FakeTwenty implements TranscriberTwenty {
  opportunities = new Map<string, { id: string; pointOfContactId: string | null }>();
  notes: { title: string; body: string; opportunityId: string; personId: string | null }[] = [];
  async findOpportunityByExternalId(externalId: string) {
    return this.opportunities.get(externalId) ?? null;
  }
  async createNoteWithTargets(input: {
    title: string;
    body: string;
    opportunityId: string;
    personId: string | null;
  }): Promise<string> {
    this.notes.push(input);
    return `note-${this.notes.length}`;
  }
  /** Recordings filed as attachments, in call order. */
  attachments: {
    opportunityId: string;
    personId: string | null;
    noteId: string | null;
    filePath: string;
    name: string;
  }[] = [];
  /** When set, the NEXT attachRecording throws this, then clears. */
  attachError: Error | null = null;
  async attachRecording(input: {
    opportunityId: string;
    personId: string | null;
    noteId: string | null;
    filePath: string;
    name: string;
  }) {
    if (this.attachError) {
      const e = this.attachError;
      this.attachError = null;
      throw e;
    }
    this.attachments.push(input);
    return "attached" as const;
  }
  /** What the card ends up showing, keyed by opportunity id. */
  cardSummaries = new Map<string, string>();
  cardFacts = new Map<string, CallCardFacts>();
  async patchOpportunitySummary(opportunityId: string, summary: string, facts?: CallCardFacts) {
    this.cardSummaries.set(opportunityId, summary);
    if (facts) this.cardFacts.set(opportunityId, facts);
    return "written" as const;
  }
  /** Names written onto the person, keyed by person id. */
  namedPeople = new Map<string, string>();
  async namePersonIfUnnamed(personId: string, name: string) {
    this.namedPeople.set(personId, name);
    return "named" as const;
  }
}

function makeDeps(overrides: {
  events?: EligibleCall[];
  twenty?: FakeTwenty;
  noteTitles?: Set<string>;
  complete?: (system: string, user: string) => Promise<string>;
  dryRun?: boolean;
  downloader?: FakeDownloader;
  whisper?: FakeWhisper;
  extraTenants?: RoutedTenant[];
  onCardStamped?: TranscriberDeps["onCardStamped"];
}) {
  const store = new FakeStore(overrides.events ?? [makeEvent()]);
  const downloader = overrides.downloader ?? new FakeDownloader();
  const whisper = overrides.whisper ?? new FakeWhisper();
  const twenty = overrides.twenty ?? new FakeTwenty();
  const tenant: RoutedTenant = {
    tenantId: "tenant-1",
    slug: "take-auto",
    twenty,
    noteTitles: overrides.noteTitles ?? new Set(),
    complete: overrides.complete ?? (async () => VALID_ANALYSIS_JSON),
  };
  const deps: TranscriberDeps = {
    store,
    downloader,
    whisper,
    tenants: [tenant, ...(overrides.extraTenants ?? [])],
    recordingsDir: "/tmp/recordings",
    dryRun: overrides.dryRun ?? false,
    ...(overrides.onCardStamped ? { onCardStamped: overrides.onCardStamped } : {}),
  };
  return { deps, store, downloader, whisper, twenty, tenant };
}

// ─── Pure validation ────────────────────────────────────────────────────────

describe("parseCallAnalysis", () => {
  it("accepts a valid strict-JSON answer with verbatim evidence", () => {
    const result = parseCallAnalysis(VALID_ANALYSIS_JSON, TRANSCRIPT);
    expect(result).not.toBeNull();
    expect(result?.budgetAed).toBe(3000);
    expect(result?.carOfInterest).toBe("Nissan Patrol");
    expect(result?.language).toBe("arabic");
    expect(result?.evidence).toHaveLength(2);
  });

  it("keeps the booking facts a manager acts on", () => {
    const r = parseCallAnalysis(VALID_ANALYSIS_JSON, TRANSCRIPT);
    expect(r).toMatchObject({
      customerName: "Salem",
      carYear: "2024",
      rentalDays: 7,
      neededFrom: "tomorrow",
      quotedPriceAed: 500,
      whatsappConfirmed: true,
    });
  });

  it("drops an off-shape fact instead of losing the whole analysis", () => {
    // A model answering "2022 days" has confused the model year with the
    // duration. Losing that one fact is right; losing the summary is not.
    const bent = JSON.parse(VALID_ANALYSIS_JSON);
    bent.rentalDays = 2022;
    bent.quotedPriceAed = "not a number";
    bent.customerName = "   ";
    bent.whatsappConfirmed = "maybe";
    const r = parseCallAnalysis(JSON.stringify(bent), TRANSCRIPT);
    expect(r).not.toBeNull();
    expect(r?.rentalDays).toBeNull();
    expect(r?.quotedPriceAed).toBeNull();
    expect(r?.customerName).toBeNull();
    expect(r?.whatsappConfirmed).toBeNull();
    expect(r?.summary).toContain("Nissan Patrol");
  });

  it("survives a model that omits the optional facts entirely", () => {
    const bare = JSON.parse(VALID_ANALYSIS_JSON);
    // budgetAed / agentTalkRatioEstimate included: omitting them used to read
    // as "present but invalid" (undefined !== null) and kill the analysis —
    // the 2026-09-06 regression that left cards with raw transcripts only.
    for (const k of ["customerName", "carYear", "rentalDays", "neededFrom", "quotedPriceAed", "whatsappConfirmed", "budgetAed", "agentTalkRatioEstimate"]) {
      delete bare[k];
    }
    expect(parseCallAnalysis(JSON.stringify(bare), TRANSCRIPT)).not.toBeNull();
  });

  it("tolerates ```json fences around the object", () => {
    const fenced = "```json\n" + VALID_ANALYSIS_JSON + "\n```";
    expect(parseCallAnalysis(fenced, TRANSCRIPT)).not.toBeNull();
  });

  it("rejects malformed JSON", () => {
    expect(parseCallAnalysis("not json at all", TRANSCRIPT)).toBeNull();
  });

  it("rejects an off-enum language", () => {
    const bad = JSON.parse(VALID_ANALYSIS_JSON);
    bad.language = "urdu";
    expect(parseCallAnalysis(JSON.stringify(bad), TRANSCRIPT)).toBeNull();
  });

  it("rejects empty evidence (the write gate)", () => {
    const bad = JSON.parse(VALID_ANALYSIS_JSON);
    bad.evidence = [];
    expect(parseCallAnalysis(JSON.stringify(bad), TRANSCRIPT)).toBeNull();
  });

  it("rejects invented evidence — quotes must be verbatim substrings", () => {
    const bad = JSON.parse(VALID_ANALYSIS_JSON);
    bad.evidence = ["the customer demanded a free Lamborghini"];
    expect(parseCallAnalysis(JSON.stringify(bad), TRANSCRIPT)).toBeNull();
  });

  it("drops one unquotable line but keeps a reading the rest still anchors", () => {
    // The live G63 call: four verbatim quotes, one stitched with an ellipsis
    // out of two separate lines. Discarding every extracted fact over that
    // ellipsis is how a perfect read became a wall of raw transcript.
    const mixed = JSON.parse(VALID_ANALYSIS_JSON);
    mixed.evidence = [
      "I want to rent a Nissan Patrol for one week",
      "I want a helicopter as well and a free driver",
    ];
    const r = parseCallAnalysis(JSON.stringify(mixed), TRANSCRIPT);
    expect(r).not.toBeNull();
    expect(r?.evidence).toEqual(["I want to rent a Nissan Patrol for one week"]);
    expect(r?.rentalDays).toBe(7);
  });

  it("accepts an ellipsis-joined quote only when every part is verbatim", () => {
    const joined = JSON.parse(VALID_ANALYSIS_JSON);
    joined.evidence = ["I want to rent a Nissan Patrol for one week ... my budget is 3000 AED maximum"];
    expect(parseCallAnalysis(JSON.stringify(joined), TRANSCRIPT)).not.toBeNull();

    const halfInvented = JSON.parse(VALID_ANALYSIS_JSON);
    halfInvented.evidence = ["I want to rent a Nissan Patrol for one week ... and pay nothing at all"];
    expect(parseCallAnalysis(JSON.stringify(halfInvented), TRANSCRIPT)).toBeNull();
  });

  it("still refuses a reading with no real anchor left", () => {
    const bad = JSON.parse(VALID_ANALYSIS_JSON);
    bad.evidence = ["the customer demanded a free Lamborghini", "   "];
    expect(parseCallAnalysis(JSON.stringify(bad), TRANSCRIPT)).toBeNull();
  });

  it("rejects a negative budget and an out-of-range talk ratio", () => {
    const badBudget = JSON.parse(VALID_ANALYSIS_JSON);
    badBudget.budgetAed = -5;
    expect(parseCallAnalysis(JSON.stringify(badBudget), TRANSCRIPT)).toBeNull();
    const badRatio = JSON.parse(VALID_ANALYSIS_JSON);
    badRatio.agentTalkRatioEstimate = 1.7;
    expect(parseCallAnalysis(JSON.stringify(badRatio), TRANSCRIPT)).toBeNull();
  });

  it("accepts nulls for the optional fields", () => {
    const sparse = JSON.parse(VALID_ANALYSIS_JSON);
    sparse.budgetAed = null;
    sparse.carOfInterest = null;
    sparse.agentTalkRatioEstimate = null;
    expect(parseCallAnalysis(JSON.stringify(sparse), TRANSCRIPT)).not.toBeNull();
  });
});

describe("buildAnalysisPrompt", () => {
  it("hands the transcript to the model as the evidence-gate sourceText", () => {
    const prompt = buildAnalysisPrompt(makeParams(), TRANSCRIPT);
    expect(prompt.sourceText).toBe(TRANSCRIPT);
    expect(prompt.user).toContain(TRANSCRIPT);
    expect(prompt.user).toContain("duration=137s");
    expect(prompt.user).toContain("agent=Mariam Saleh");
  });
});

describe("buildTranscriptNoteBody", () => {
  const analysis = parseCallAnalysis(VALID_ANALYSIS_JSON, TRANSCRIPT) as CallAnalysis;
  it("carries the key fields and the evidence quotes", () => {
    const body = buildTranscriptNoteBody(analysis, TRANSCRIPT);
    expect(body).toContain("Summary: Customer wants to rent a Nissan Patrol");
    expect(body).toContain("Budget: 3000 AED");
    expect(body).toContain("Car of interest: Nissan Patrol");
    expect(body).toContain("> I want to rent a Nissan Patrol for one week");
    expect(body).toContain("Agent talk ratio: ~40%");
  });
  it("truncates the transcript to ~4000 chars and the whole body to 8000", () => {
    const long = "x".repeat(10_000);
    const body = buildTranscriptNoteBody(analysis, long);
    expect(body.length).toBeLessThanOrEqual(8000);
    expect(body).not.toContain("x".repeat(4001));
  });
});

describe("path helpers", () => {
  it("derives the extension from the URL and defaults to mp3", () => {
    expect(recordingExtension("http://x/rec/a.wav?token=1")).toBe("wav");
    expect(recordingExtension("http://x/rec/a")).toBe("mp3");
  });
  it("sanitizes callIds that could break a filesystem path", () => {
    expect(safeCallIdStem("ab/../../etc/passwd")).toBe("ab_.._.._etc_passwd");
    expect(safeCallIdStem("...")).toBe("call");
  });
  it("builds <base>/<slug>/<callId>.<ext>", () => {
    expect(recordingDestPath("/rec", "take-auto", "call 1", "http://x/a.mp3")).toBe(
      "/rec/take-auto/call_1.mp3"
    );
  });
});

describe("transcriptNoteTitle", () => {
  it("is the note idempotency key", () => {
    expect(transcriptNoteTitle("callgear:call-1")).toBe("Call transcript · callgear:call-1");
  });
});

// ─── Orchestration ──────────────────────────────────────────────────────────

describe("runTranscriberPass", () => {
  it("runs the full pipeline: claim → download → whisper → analyse → note", async () => {
    const { deps, store, downloader, whisper, twenty } = makeDeps({});
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: "person-1" });

    const counts = await runTranscriberPass(deps, 5);

    expect(counts).toMatchObject({ claimed: 1, notesWritten: 1, failed: 0 });
    // Claim went to the eligible tenant only.
    expect(store.lastClaimTenantIds).toEqual(["tenant-1"]);
    // Download hit the per-tenant cache path.
    expect(downloader.calls[0].destPath).toBe("/tmp/recordings/take-auto/call-1.mp3");
    expect(whisper.calls).toEqual(["/tmp/recordings/take-auto/call-1.mp3"]);
    // The note: idempotent title, analysis body, targets to opp + person.
    expect(twenty.notes).toHaveLength(1);
    expect(twenty.notes[0].title).toBe("Call transcript · callgear:call-1");
    expect(twenty.notes[0].opportunityId).toBe("opp-1");
    expect(twenty.notes[0].personId).toBe("person-1");
    expect(twenty.notes[0].body).toContain("Budget: 3000 AED");
    // …and the same read lands ON the card, so nobody has to open a tab to
    // learn what the caller wanted.
    const card = twenty.cardSummaries.get("opp-1");
    expect(card).toBeDefined();
    expect(card).toContain("Budget: 3000 AED");
    expect(card).not.toContain("Transcript:"); // the full text stays in the note
    // …and the recording itself is filed as an attachment on the card, the
    // person AND the transcript note (owner 2026-08-26: calls saved as files).
    expect(twenty.attachments).toHaveLength(1);
    expect(twenty.attachments[0]).toMatchObject({
      opportunityId: "opp-1",
      personId: "person-1",
      noteId: "note-1",
      filePath: "/tmp/recordings/take-auto/call-1.mp3",
      name: "call-1.mp3",
    });
    // The row got every step persisted and ended done.
    const row = store.onlyRow();
    expect(row.status).toBe("done");
    expect(row.patch.recordingPath).toBe("/tmp/recordings/take-auto/call-1.mp3");
    expect(row.patch.transcriptText).toBe(TRANSCRIPT);
    const summary = row.patch.summaryJson as StoredCallSummary;
    expect(summary.budgetAed).toBe(3000);
    expect(summary.whisperLanguage).toBe("ar");
  });

  it("rescues a locally-rejected analysis via the fallback model", async () => {
    // The 9B answering the strict-schema prompt with "{}" is a model weakness,
    // not a call weakness — the same transcript reads fine by a stronger model.
    const { deps, store, twenty } = makeDeps({ complete: async () => "{}" });
    deps.fallbackComplete = async () => VALID_ANALYSIS_JSON;
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: "person-1" });

    const counts = await runTranscriberPass(deps, 5);

    expect(counts).toMatchObject({ claimed: 1, notesWritten: 1, analysedByFallback: 1, skippedNoEvidence: 0 });
    expect(twenty.notes[0]?.body).toContain("Budget: 3000 AED");
    expect(store.onlyRow().status).toBe("done");
  });

  it("a failing fallback never invents an analysis", async () => {
    const { deps, store, twenty } = makeDeps({ complete: async () => "{}" });
    deps.fallbackComplete = async () => {
      throw new Error("deepseek down");
    };
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: "person-1" });

    const counts = await runTranscriberPass(deps, 5);

    expect(counts).toMatchObject({ claimed: 1, notesWritten: 0, analysedByFallback: 0, skippedNoEvidence: 1 });
    expect(store.onlyRow().status).toBe("done"); // parked with the reason, not retry-looped
  });

  it("pings the manager with the exact card summary once the card is stamped", async () => {
    const pings: { tenantSlug: string | null; callId: string; summary: string }[] = [];
    const { deps, twenty } = makeDeps({
      onCardStamped: async (input) => {
        pings.push({ tenantSlug: input.tenantSlug, callId: input.callId, summary: input.summary });
      },
    });
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: "person-1" });

    await runTranscriberPass(deps, 5);

    expect(pings).toHaveLength(1);
    expect(pings[0].callId).toBe("call-1");
    expect(pings[0].tenantSlug).toBe("take-auto");
    // The ping carries what the card carries — never a second opinion.
    expect(pings[0].summary).toBe(twenty.cardSummaries.get("opp-1"));
  });

  it("pings the verbatim fallback too, and a ping failure never fails the call", async () => {
    const invented = JSON.stringify({
      ...JSON.parse(VALID_ANALYSIS_JSON),
      evidence: ["a quote that never happened in this call"],
    });
    const pings: string[] = [];
    const { deps, store, twenty } = makeDeps({
      complete: async () => invented,
      onCardStamped: async (input) => {
        pings.push(input.summary);
        throw new Error("notify pipeline down");
      },
    });
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: null });

    const counts = await runTranscriberPass(deps, 5);

    expect(counts.skippedNoEvidence).toBe(1);
    expect(counts.failed).toBe(0); // the throwing ping did not contaminate the pass
    expect(pings).toHaveLength(1);
    expect(pings[0]).toContain("No AI read for this call");
    expect(store.onlyRow().status).toBe("done");
  });

  it("dry-run pings nobody", async () => {
    const pings: string[] = [];
    const { deps, twenty } = makeDeps({
      dryRun: true,
      onCardStamped: async (input) => {
        pings.push(input.summary);
      },
    });
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: null });

    await runTranscriberPass(deps, 5);

    expect(pings).toHaveLength(0);
  });

  it("skips the note when its title already exists (idempotency)", async () => {
    const { deps, store, twenty } = makeDeps({
      noteTitles: new Set(["Call transcript · callgear:call-1"]),
    });
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: null });

    const counts = await runTranscriberPass(deps, 5);

    expect(counts.skippedExistingNote).toBe(1);
    expect(counts.notesWritten).toBe(0);
    expect(twenty.notes).toHaveLength(0);
    expect(store.onlyRow().status).toBe("done");
  });

  it("stores the transcript but writes no note when there is no opportunity", async () => {
    const { deps, store, twenty } = makeDeps({});

    const counts = await runTranscriberPass(deps, 5);

    expect(counts.skippedNoOpportunity).toBe(1);
    expect(twenty.notes).toHaveLength(0);
    const row = store.onlyRow();
    expect(row.status).toBe("done");
    expect(row.error).toContain("no Twenty opportunity");
    expect(row.patch.transcriptText).toBe(TRANSCRIPT);
    expect(row.patch.summaryJson).toBeTruthy();
  });

  it("evidence gate: an invented quote means no note, row parked done with reason", async () => {
    const invented = JSON.stringify({
      ...JSON.parse(VALID_ANALYSIS_JSON),
      evidence: ["a quote that never happened in this call"],
    });
    const { deps, store, twenty } = makeDeps({ complete: async () => invented });
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: null });

    const counts = await runTranscriberPass(deps, 5);

    expect(counts.skippedNoEvidence).toBe(1);
    expect(counts.failed).toBe(0);
    expect(twenty.notes).toHaveLength(0);
    const row = store.onlyRow();
    expect(row.status).toBe("done");
    expect(row.error).toContain("evidence gate");
    expect(row.patch.transcriptText).toBe(TRANSCRIPT);
  });

  it("a failed download marks the row error and never kills the pass", async () => {
    const downloader = new FakeDownloader();
    downloader.error = new Error("recording download HTTP 404");
    const events = [makeEvent(), makeEvent({ eventId: "evt-2", params: makeParams({ callId: "call-2", recordingUrl: "http://x/call-2.mp3" }) })];
    const { deps, store, twenty } = makeDeps({ events, downloader });
    twenty.opportunities.set("callgear:call-2", { id: "opp-2", pointOfContactId: null });

    const counts = await runTranscriberPass(deps, 5);

    expect(counts.claimed).toBe(2);
    expect(counts.failed).toBe(1);
    expect(counts.firstError).toContain("HTTP 404");
    // The second call still completed — one row's failure is contained.
    expect(counts.notesWritten).toBe(1);
    expect(twenty.notes[0].title).toBe("Call transcript · callgear:call-2");
    expect(store.mutations.some((m) => m.startsWith("markError:"))).toBe(true);
  });

  it("dry-run writes nothing: no store mutations, no Twenty notes", async () => {
    const { deps, store, downloader, whisper, twenty } = makeDeps({ dryRun: true });
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: "person-1" });

    const counts = await runTranscriberPass(deps, 5);

    // The full read path ran…
    expect(counts.notesWritten).toBe(1);
    expect(downloader.calls).toHaveLength(1);
    expect(whisper.calls).toHaveLength(1);
    // …but nothing was persisted anywhere.
    expect(store.mutations).toEqual([]);
    expect(twenty.notes).toHaveLength(0);
    expect(twenty.attachments).toHaveLength(0);
  });

  it("resumes from a stored transcript without re-downloading or re-analysing", async () => {
    const stored: StoredCallSummary = {
      ...(JSON.parse(VALID_ANALYSIS_JSON) as CallAnalysis),
      whisperLanguage: "ar",
    };
    const event = makeEvent({
      transcriptRowId: "row-9",
      recordingPath: "/tmp/recordings/take-auto/call-1.mp3",
      transcriptText: TRANSCRIPT,
      summaryJson: stored,
    });
    let modelCalls = 0;
    const { deps, store, downloader, whisper, twenty } = makeDeps({
      events: [event],
      complete: async () => {
        modelCalls++;
        return VALID_ANALYSIS_JSON;
      },
    });
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: null });

    const counts = await runTranscriberPass(deps, 5);

    expect(counts.notesWritten).toBe(1);
    expect(downloader.calls).toHaveLength(0);
    expect(whisper.calls).toHaveLength(0);
    expect(modelCalls).toBe(0);
    expect(store.onlyRow().status).toBe("done");
  });

  it("honours the batch cap and ignores events of unrouted tenants", async () => {
    const events = [
      makeEvent(),
      makeEvent({ eventId: "evt-other", tenantId: "tenant-2", params: makeParams({ callId: "call-9" }) }),
    ];
    const { deps, twenty } = makeDeps({ events });
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: null });

    const counts = await runTranscriberPass(deps, 5);

    // tenant-2 is not in deps.tenants (its instance/model is unconfigured) —
    // its event is never claimed, never processed.
    expect(counts.claimed).toBe(1);
    expect(counts.notesWritten).toBe(1);
  });

  it("empty whisper output is a retryable failure, not a silent skip", async () => {
    const whisper = new FakeWhisper();
    whisper.text = "";
    const { deps, store } = makeDeps({ whisper });

    const counts = await runTranscriberPass(deps, 5);

    expect(counts.failed).toBe(1);
    const row = store.onlyRow();
    expect(row.status).toBe("error");
    expect(row.error).toContain("empty transcript");
  });
});

describe("recording attachment", () => {
  it("an attach failure never fails the call — note, card and row still land", async () => {
    const { deps, store, twenty } = makeDeps({});
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: "person-1" });
    twenty.attachError = new Error("Twenty POST /metadata HTTP 500");

    const counts = await runTranscriberPass(deps, 5);

    expect(counts.notesWritten).toBe(1);
    expect(counts.failed).toBe(0);
    expect(twenty.notes).toHaveLength(1);
    expect(twenty.cardSummaries.get("opp-1")).toBeDefined();
    expect(store.onlyRow().status).toBe("done");
  });

  it("a rerun with an existing note still files the recording (heals a crashed pass)", async () => {
    const { deps, twenty } = makeDeps({
      noteTitles: new Set(["Call transcript · callgear:call-1"]),
    });
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: "person-1" });

    const counts = await runTranscriberPass(deps, 5);

    expect(counts.skippedExistingNote).toBe(1);
    expect(twenty.notes).toHaveLength(0);
    expect(twenty.attachments).toHaveLength(1);
    // No fresh note was created, so the file targets the card + person only.
    expect(twenty.attachments[0].noteId).toBeNull();
    expect(twenty.attachments[0].opportunityId).toBe("opp-1");
  });

  it("no opportunity, no attachment — but the fallback path still files it when the card exists", async () => {
    // No opportunity at all: nothing to target.
    const noOpp = makeDeps({});
    const countsA = await runTranscriberPass(noOpp.deps, 5);
    expect(countsA.skippedNoOpportunity).toBe(1);
    expect(noOpp.twenty.attachments).toHaveLength(0);

    // Evidence-gate rejection: the card gets the verbatim words AND the audio.
    const invented = JSON.stringify({
      ...JSON.parse(VALID_ANALYSIS_JSON),
      evidence: ["a quote that never happened in this call"],
    });
    const rejected = makeDeps({ complete: async () => invented });
    rejected.twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: null });
    const countsB = await runTranscriberPass(rejected.deps, 5);
    expect(countsB.skippedNoEvidence).toBe(1);
    expect(rejected.twenty.attachments).toHaveLength(1);
    expect(rejected.twenty.attachments[0].noteId).toBeNull(); // no note in this path
  });
});

describe("isPlaceholderName", () => {
  it("recognises the labels nobody chose", () => {
    expect(isPlaceholderName("")).toBe(true);
    expect(isPlaceholderName("+…586833004")).toBe(true);
    // Bitrix notification text, imported as if it were a person.
    expect(isPlaceholderName("Пропущенный лид по звонку с 971586833004 из Callgear")).toBe(true);
    expect(isPlaceholderName("Inbound call +971501234567")).toBe(true);
  });

  it("never overrules a name a human would recognise", () => {
    expect(isPlaceholderName("Ahmed")).toBe(false);
    expect(isPlaceholderName("Садыгов Бабек")).toBe(false);
    expect(isPlaceholderName("PT Investments LLC")).toBe(false);
  });
});

describe("re-analysis reaches the card", () => {
  it("updates the card even when the transcript note already exists", async () => {
    // A better prompt must improve the cards we ALREADY have; the note is
    // append-only history, the card is current state.
    const twenty = new FakeTwenty();
    twenty.opportunities.set("callgear:call-1", { id: "opp-1", pointOfContactId: "person-1" });
    const { deps, twenty: t } = makeDeps({
      twenty,
      noteTitles: new Set(["Call transcript · callgear:call-1"]),
      events: [makeEvent({ transcriptText: TRANSCRIPT })],
    });
    const counts = await runTranscriberPass(deps, 10);

    expect(counts.skippedExistingNote).toBe(1);
    expect(t.notes).toHaveLength(0);            // no duplicate note
    expect(t.cardSummaries.get("opp-1")).toContain("Nissan Patrol");
    expect(t.cardFacts.get("opp-1")).toMatchObject({ rentalDays: 7, neededFrom: "tomorrow" });
    expect(t.namedPeople.get("person-1")).toBe("Salem");
  });
});

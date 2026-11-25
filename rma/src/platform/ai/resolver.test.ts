// AI resolver — unit tests. NO live ollama, Twenty or DB: the model is a
// canned function, Twenty is an in-memory fake recording its writes, and the
// source is a stub. The live wiring (drizzle source, LocalProvider HTTP) is
// exercised by the runner, not here.
import { describe, expect, it } from "vitest";
import type { TwentyClient } from "@/platform/integrations/twenty/client";
import { twentyInstanceForTenantSlug, type TwentyInstanceKey } from "@/platform/integrations/twenty/instance";
import { brandLineForTenantSlug } from "@/platform/integrations/twenty/mirror";
import {
  LANGUAGE_SEGMENT_CODE,
  aiResolverNoteTitle,
  buildResolverPrompt,
  casePhoneTail,
  parseResolverResult,
  runResolverPass,
  scopedDealExternalId,
  type ResolverCase,
  type ResolverCallMeta,
  type ResolverMessage,
  type ResolverSource,
} from "./resolver";

// ─── Fakes ──────────────────────────────────────────────────────────────────

type Rec = Record<string, unknown>;

function createFakeTwenty(seed: { noteTitles?: string[]; people?: Rec[]; opportunities?: Rec[] } = {}) {
  const stores: Record<string, Rec[]> = {
    notes: (seed.noteTitles ?? []).map((title, i) => ({ id: `note-${i}`, title })),
    noteTargets: [],
    people: (seed.people ?? []).map((p, i) => ({ id: `person-${i}`, ...p })),
    opportunities: (seed.opportunities ?? []).map((o, i) => ({ id: `opp-${i}`, ...o })),
  };
  const writes = {
    batchCreate: [] as { objectPath: string; records: Rec[] }[],
    patch: [] as { path: string; body: Rec }[],
  };
  let seq = 0;

  const client: TwentyClient = {
    mode: "mock",
    async get<T = unknown>(path: string): Promise<T> {
      const [objectPath, id] = path.split("/");
      const row = (stores[objectPath] ?? []).find((r) => r.id === id) ?? null;
      const singular =
        objectPath === "people"
          ? "person"
          : objectPath === "opportunities"
            ? "opportunity"
            : objectPath.replace(/s$/, "");
      return { data: { [singular]: row } } as T;
    },
    async post<T = unknown>(): Promise<T> {
      throw new Error("not used by the resolver");
    },
    async patch<T = unknown>(path: string, body: unknown): Promise<T> {
      writes.patch.push({ path, body: body as Rec });
      const [objectPath, id] = path.split("/");
      const row = (stores[objectPath] ?? []).find((r) => r.id === id);
      if (row) Object.assign(row, body as Rec);
      return {} as T;
    },
    async delete<T = unknown>(): Promise<T> {
      throw new Error("the resolver never deletes");
    },
    async uploadFile() {
      throw new Error("the resolver never uploads files");
    },
    async *listAll<T = Rec>(objectPath: string): AsyncGenerator<T, void, unknown> {
      for (const row of stores[objectPath] ?? []) yield row as T;
    },
    async batchCreate<T = Rec>(objectPath: string, records: Rec[]): Promise<T[]> {
      writes.batchCreate.push({ objectPath, records });
      return records.map((r) => {
        const row = { id: `fake-${++seq}`, ...r };
        (stores[objectPath] ??= []).push(row);
        return row as T;
      });
    },
    metadata: {
      listObjects: async () => [],
      listFields: async () => [],
      createObject: async () => {
        throw new Error("the resolver never touches metadata");
      },
      createField: async () => {
        throw new Error("the resolver never touches metadata");
      },
    },
  };
  return { client, stores, writes };
}

function createFakeSource(opts: {
  cases: ResolverCase[];
  messagesByTail?: Record<string, ResolverMessage[]>;
  callsByTail?: Record<string, ResolverCallMeta[]>;
}) {
  const saved: Date[] = [];
  const source: ResolverSource = {
    loadCheckpoint: async () => null,
    saveCheckpoint: async (at) => {
      saved.push(at);
    },
    scanCases: async (_since, limit) => opts.cases.slice(0, limit),
    loadMessages: async (tail) => opts.messagesByTail?.[tail] ?? [],
    loadCallEvents: async (tail) => opts.callsByTail?.[tail] ?? [],
  };
  return { source, saved };
}

const TAIL = "501234567";

function kase(overrides: Partial<ResolverCase> = {}): ResolverCase {
  return {
    dealId: "deal-uuid-1",
    scopedExternalId: "deal:1001",
    phoneTail: TAIL,
    stage: "Выяснение потребности",
    car: null,
    valueAed: 30000,
    touchedAt: new Date("2026-08-07T10:00:00Z"),
    ...overrides,
  };
}

const MESSAGES: ResolverMessage[] = [
  {
    direction: "inbound",
    customerName: "Иван",
    body: "Здравствуйте, хочу арендовать Nissan Patrol на месяц",
    createdAt: new Date("2026-08-07T09:00:00Z"),
  },
  {
    direction: "outbound",
    customerName: null,
    body: "Добрый день! Patrol доступен, 9000 AED в месяц",
    createdAt: new Date("2026-08-07T09:05:00Z"),
  },
  {
    direction: "inbound",
    customerName: "Иван",
    body: "Мой бюджет 8500, можно забронировать на завтра?",
    createdAt: new Date("2026-08-07T09:10:00Z"),
  },
];

const GOOD_OUTPUT = JSON.stringify({
  language: "russian",
  intent: "monthly rental of a Nissan Patrol",
  carInterest: "Nissan Patrol",
  budgetAed: 8500,
  urgency: "hot",
  nextAction: "Confirm tomorrow's booking",
  evidence: ["хочу арендовать Nissan Patrol на месяц", "Мой бюджет 8500"],
});

function goodCompleter(output: string = GOOD_OUTPUT) {
  const calls: { system: string; user: string }[] = [];
  const complete = async (system: string, user: string) => {
    calls.push({ system, user });
    return output;
  };
  return { complete, calls };
}

// ─── Pure helpers ───────────────────────────────────────────────────────────

describe("aiResolverNoteTitle / scopedDealExternalId", () => {
  it("builds the idempotency title in the mirror's note style", () => {
    expect(aiResolverNoteTitle("deal:1001")).toBe("AI Resolver · deal:1001");
    expect(aiResolverNoteTitle("cardiwan/deal:42")).toBe("AI Resolver · cardiwan/deal:42");
  });

  it("scopes the deal external id exactly like the mirror", () => {
    expect(scopedDealExternalId("1001", null)).toBe("deal:1001");
    expect(scopedDealExternalId("1001", "cardiwan")).toBe("cardiwan/deal:1001");
  });
});

describe("LANGUAGE_SEGMENT_CODE", () => {
  it("maps resolver languages to the Twenty SELECT codes, unknown unmappable", () => {
    expect(LANGUAGE_SEGMENT_CODE.english).toBe("ENGLISH_SPEAKING");
    expect(LANGUAGE_SEGMENT_CODE.russian).toBe("RUSSIAN_SPEAKING");
    expect(LANGUAGE_SEGMENT_CODE.arabic).toBe("ARABIC_SPEAKING");
    expect(LANGUAGE_SEGMENT_CODE.unknown).toBeUndefined();
  });
});

describe("buildResolverPrompt", () => {
  it("packs deal fields, a chronological transcript and call metadata", () => {
    const prompt = buildResolverPrompt(kase({ car: "Nissan Patrol" }), MESSAGES, [
      {
        direction: "inbound",
        durationSeconds: 187,
        agentName: "Azat",
        recordingUrl: "https://rec.example/1",
        at: new Date("2026-08-07T08:00:00Z"),
      },
    ]);
    // Strict-JSON + evidence contract is stated to the model.
    expect(prompt.system).toContain("JSON");
    expect(prompt.system).toContain("VERBATIM");
    // Deal fields are in the user prompt.
    expect(prompt.user).toContain("stage=Выяснение потребности");
    expect(prompt.user).toContain("car=Nissan Patrol");
    expect(prompt.user).toContain("value=30000");
    // Transcript oldest-first, outbound labelled Sales.
    const first = prompt.user.indexOf("Иван: Здравствуйте");
    const second = prompt.user.indexOf("Sales: Добрый день");
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    // Call metadata line.
    expect(prompt.user).toContain("inbound call, 187s");
    expect(prompt.user).toContain("agent Azat");
    // sourceText is exactly the transcript the evidence gate checks against.
    expect(prompt.sourceText).toContain("Мой бюджет 8500, можно забронировать на завтра?");
    expect(prompt.sourceText).not.toContain("Recent calls");
  });
});

describe("parseResolverResult", () => {
  const source = "Иван: хочу арендовать Nissan Patrol на месяц\nИван: Мой бюджет 8500";

  it("accepts a well-formed answer, fences tolerated", () => {
    const result = parseResolverResult("```json\n" + GOOD_OUTPUT + "\n```", source);
    expect(result).not.toBeNull();
    expect(result?.language).toBe("russian");
    expect(result?.urgency).toBe("hot");
    expect(result?.budgetAed).toBe(8500);
    expect(result?.carInterest).toBe("Nissan Patrol");
    expect(result?.evidence).toHaveLength(2);
  });

  it("rejects malformed JSON", () => {
    expect(parseResolverResult("not json at all", source)).toBeNull();
    expect(parseResolverResult("{unclosed", source)).toBeNull();
  });

  it("rejects off-enum values", () => {
    const bad = (patch: Rec) =>
      parseResolverResult(JSON.stringify({ ...JSON.parse(GOOD_OUTPUT), ...patch }), source);
    expect(bad({ language: "spanish" })).toBeNull();
    expect(bad({ urgency: "urgent" })).toBeNull();
  });

  it("rejects missing/empty required strings and bad budget types", () => {
    const bad = (patch: Rec) =>
      parseResolverResult(JSON.stringify({ ...JSON.parse(GOOD_OUTPUT), ...patch }), source);
    expect(bad({ intent: "" })).toBeNull();
    expect(bad({ nextAction: "  " })).toBeNull();
    expect(bad({ budgetAed: "8500" })).toBeNull();
    expect(bad({ carInterest: 42 })).toBeNull();
  });

  it("rejects empty evidence — no quote, no write", () => {
    const bad = (evidence: unknown) =>
      parseResolverResult(JSON.stringify({ ...JSON.parse(GOOD_OUTPUT), evidence }), source);
    expect(bad([])).toBeNull();
    expect(bad(null)).toBeNull();
    expect(bad(["  "])).toBeNull();
  });

  it("rejects evidence the model invented (not a verbatim substring)", () => {
    const out = JSON.stringify({
      ...JSON.parse(GOOD_OUTPUT),
      evidence: ["the customer definitely wants a Ferrari"],
    });
    expect(parseResolverResult(out, source)).toBeNull();
  });
});

// ─── The pass ───────────────────────────────────────────────────────────────

function seededTwenty() {
  return createFakeTwenty({
    people: [{ phoneTail9: TAIL, brandLine: "takeauto", languageSegment: null }],
    opportunities: [{ externalId: "deal:1001", brandLine: "takeauto", carModels: null }],
  });
}

describe("runResolverPass", () => {
  it("writes the note, person languageSegment and opportunity carModels (commit)", async () => {
    const twenty = seededTwenty();
    const { source, saved } = createFakeSource({
      cases: [kase()],
      messagesByTail: { [TAIL]: MESSAGES },
    });
    const { complete, calls } = goodCompleter();

    const counts = await runResolverPass(
      { client: twenty.client, source, complete, brandLine: "takeauto" },
      { dryRun: false }
    );

    expect(counts.scanned).toBe(1);
    expect(counts.resolved).toBe(1);
    expect(counts.notesWritten).toBe(1);
    expect(counts.personsEnriched).toBe(1);
    expect(counts.opportunitiesEnriched).toBe(1);
    expect(counts.failed).toBe(0);
    expect(calls).toHaveLength(1);

    // Note + BOTH targets (opportunity and person) created.
    const noteWrite = twenty.writes.batchCreate.find((w) => w.objectPath === "notes");
    expect(noteWrite?.records[0]?.title).toBe("AI Resolver · deal:1001");
    const targetWrite = twenty.writes.batchCreate.find((w) => w.objectPath === "noteTargets");
    const targets = targetWrite?.records ?? [];
    expect(targets.some((r) => r.targetOpportunityId === "opp-0")).toBe(true);
    expect(targets.some((r) => r.targetPersonId === "person-0")).toBe(true);
    // Evidence is quoted in the note body.
    const markdown = (noteWrite?.records[0]?.bodyV2 as { markdown: string }).markdown;
    expect(markdown).toContain("Мой бюджет 8500");

    // Rails: only the two enrichment patches, nothing else.
    expect(twenty.writes.patch).toEqual([
      { path: "people/person-0", body: { languageSegment: "RUSSIAN_SPEAKING" } },
      { path: "opportunities/opp-0", body: { carModels: "Nissan Patrol" } },
    ]);

    // Checkpoint advanced past the scanned case.
    expect(saved).toEqual([new Date("2026-08-07T10:00:00Z")]);
  });

  it("DRY-RUN writes nothing and does not move the checkpoint", async () => {
    const twenty = seededTwenty();
    const { source, saved } = createFakeSource({
      cases: [kase()],
      messagesByTail: { [TAIL]: MESSAGES },
    });
    const { complete } = goodCompleter();

    const counts = await runResolverPass(
      { client: twenty.client, source, complete, brandLine: "takeauto" },
      { dryRun: true }
    );

    expect(counts.notesWritten).toBe(1); // counted as intended, like the mirror
    expect(counts.personsEnriched).toBe(1);
    expect(twenty.writes.batchCreate).toHaveLength(0);
    expect(twenty.writes.patch).toHaveLength(0);
    expect(saved).toHaveLength(0);
  });

  it("skips a case whose note title already exists — no model call, no writes", async () => {
    const twenty = createFakeTwenty({
      noteTitles: ["AI Resolver · deal:1001"],
      people: [{ phoneTail9: TAIL, brandLine: "takeauto" }],
      opportunities: [{ externalId: "deal:1001", brandLine: "takeauto" }],
    });
    const { source } = createFakeSource({ cases: [kase()], messagesByTail: { [TAIL]: MESSAGES } });
    const { complete, calls } = goodCompleter();

    const counts = await runResolverPass(
      { client: twenty.client, source, complete, brandLine: "takeauto" },
      { dryRun: false }
    );

    expect(counts.skippedExisting).toBe(1);
    expect(counts.resolved).toBe(0);
    expect(calls).toHaveLength(0);
    expect(twenty.writes.batchCreate).toHaveLength(0);
  });

  it("rejects model output without valid evidence — counted, never written", async () => {
    const twenty = seededTwenty();
    const { source } = createFakeSource({ cases: [kase()], messagesByTail: { [TAIL]: MESSAGES } });
    const { complete } = goodCompleter(
      JSON.stringify({ ...JSON.parse(GOOD_OUTPUT), evidence: ["invented quote"] })
    );

    const counts = await runResolverPass(
      { client: twenty.client, source, complete, brandLine: "takeauto" },
      { dryRun: false }
    );

    expect(counts.skippedNoEvidence).toBe(1);
    expect(counts.resolved).toBe(0);
    expect(twenty.writes.batchCreate).toHaveLength(0);
    expect(twenty.writes.patch).toHaveLength(0);
  });

  it("skips a case with no conversation at all — no model call spent", async () => {
    const twenty = seededTwenty();
    const { source } = createFakeSource({ cases: [kase()], messagesByTail: {} });
    const { complete, calls } = goodCompleter();

    const counts = await runResolverPass(
      { client: twenty.client, source, complete, brandLine: "takeauto" },
      { dryRun: false }
    );

    expect(counts.skippedNoEvidence).toBe(1);
    expect(calls).toHaveLength(0);
  });

  it("a model failure on one case never kills the pass", async () => {
    const twenty = createFakeTwenty({
      people: [{ phoneTail9: TAIL, brandLine: "takeauto" }],
      opportunities: [
        { externalId: "deal:1001", brandLine: "takeauto" },
        { externalId: "deal:1002", brandLine: "takeauto" },
      ],
    });
    const { source } = createFakeSource({
      cases: [kase(), kase({ dealId: "deal-uuid-2", scopedExternalId: "deal:1002" })],
      messagesByTail: { [TAIL]: MESSAGES },
    });
    let n = 0;
    const complete = async () => {
      n++;
      if (n === 1) throw new Error("model endpoint timed out");
      return GOOD_OUTPUT;
    };

    const counts = await runResolverPass(
      { client: twenty.client, source, complete, brandLine: "takeauto" },
      { dryRun: false }
    );

    expect(counts.scanned).toBe(2);
    expect(counts.failed).toBe(1);
    expect(counts.resolved).toBe(1);
    expect(counts.notesWritten).toBe(1);
    expect(counts.firstError).toContain("timed out");
  });

  it("never overwrites a hand-set languageSegment or a filled carModels", async () => {
    const twenty = createFakeTwenty({
      people: [{ phoneTail9: TAIL, brandLine: "takeauto", languageSegment: "ENGLISH_SPEAKING" }],
      opportunities: [{ externalId: "deal:1001", brandLine: "takeauto", carModels: "Toyota Camry" }],
    });
    const { source } = createFakeSource({ cases: [kase()], messagesByTail: { [TAIL]: MESSAGES } });
    const { complete } = goodCompleter();

    const counts = await runResolverPass(
      { client: twenty.client, source, complete, brandLine: "takeauto" },
      { dryRun: false }
    );

    expect(counts.notesWritten).toBe(1); // the note still lands
    expect(counts.personsEnriched).toBe(0);
    expect(counts.opportunitiesEnriched).toBe(0);
    expect(twenty.writes.patch).toHaveLength(0);
    expect(twenty.stores.people[0]?.languageSegment).toBe("ENGLISH_SPEAKING");
    expect(twenty.stores.opportunities[0]?.carModels).toBe("Toyota Camry");
  });

  it("does not write languageSegment when language resolves unknown", async () => {
    const twenty = seededTwenty();
    const { source } = createFakeSource({ cases: [kase()], messagesByTail: { [TAIL]: MESSAGES } });
    const { complete } = goodCompleter(
      JSON.stringify({ ...JSON.parse(GOOD_OUTPUT), language: "unknown" })
    );

    const counts = await runResolverPass(
      { client: twenty.client, source, complete, brandLine: "takeauto" },
      { dryRun: false }
    );

    expect(counts.resolved).toBe(1);
    expect(counts.personsEnriched).toBe(0);
    expect(twenty.writes.patch.some((p) => p.path.startsWith("people/"))).toBe(false);
  });

  it("skips deals with no Twenty presence (unmirrored / platform-native)", async () => {
    const twenty = seededTwenty();
    const { source } = createFakeSource({
      cases: [kase({ scopedExternalId: null }), kase({ scopedExternalId: "deal:9999" })],
      messagesByTail: { [TAIL]: MESSAGES },
    });
    const { complete, calls } = goodCompleter();

    const counts = await runResolverPass(
      { client: twenty.client, source, complete, brandLine: "takeauto" },
      { dryRun: false }
    );

    expect(counts.skippedNoTarget).toBe(2);
    expect(calls).toHaveLength(0);
    expect(twenty.writes.batchCreate).toHaveLength(0);
  });

  it("routes each tenant into its OWN Twenty instance — no shared client", async () => {
    // Same wiring the runner does: slug → instance key → that instance's client.
    const perInstance = new Map<TwentyInstanceKey, ReturnType<typeof createFakeTwenty>>([
      ["default", createFakeTwenty({
        people: [{ phoneTail9: TAIL, brandLine: "takeauto" }],
        opportunities: [{ externalId: "deal:1001", brandLine: "takeauto" }],
      })],
      ["rental", createFakeTwenty({
        people: [{ phoneTail9: TAIL, brandLine: "cardiwan" }],
        opportunities: [{ externalId: "cardiwan/deal:2002", brandLine: "cardiwan" }],
      })],
    ]);
    const tenants = [
      { slug: "take-auto", cases: [kase()] },
      { slug: "cardiwan", cases: [kase({ scopedExternalId: "cardiwan/deal:2002" })] },
    ];
    const { complete } = goodCompleter();

    for (const t of tenants) {
      const key = twentyInstanceForTenantSlug(t.slug);
      expect(key).toBe(t.slug === "cardiwan" ? "rental" : "default");
      const twenty = perInstance.get(key)!;
      const { source } = createFakeSource({ cases: t.cases, messagesByTail: { [TAIL]: MESSAGES } });
      const counts = await runResolverPass(
        { client: twenty.client, source, complete, brandLine: brandLineForTenantSlug(t.slug) },
        { dryRun: false }
      );
      expect(counts.notesWritten).toBe(1);
    }

    // The sales note landed ONLY in the sales workspace, the rental note ONLY
    // in the rental one — brand-scoped indexes never cross-file.
    const sales = perInstance.get("default")!;
    const rental = perInstance.get("rental")!;
    expect(sales.stores.notes.map((n) => n.title)).toEqual(["AI Resolver · deal:1001"]);
    expect(rental.stores.notes.map((n) => n.title)).toEqual(["AI Resolver · cardiwan/deal:2002"]);
  });

  it("caps the scan at the per-pass batch", async () => {
    const twenty = seededTwenty();
    const many = Array.from({ length: 30 }, (_, i) =>
      kase({ dealId: `d-${i}`, scopedExternalId: `deal:${1000 + i}` })
    );
    const { source } = createFakeSource({ cases: many, messagesByTail: { [TAIL]: MESSAGES } });
    const { complete } = goodCompleter();

    const counts = await runResolverPass(
      { client: twenty.client, source, complete, brandLine: "takeauto" },
      { dryRun: true, batch: 25 }
    );

    expect(counts.scanned).toBe(25);
  });
});

describe("casePhoneTail", () => {
  // 0067: easyrent deals have deal.lead_id NULL (237/237 measured) — the
  // linked customer's phone is the fallback path to a tail9, and without it
  // the whole tenant fell through the evidence gate.

  it("prefers the lead phone when it yields a usable tail", () => {
    expect(casePhoneTail("+971 50 123 4567", "+971 55 999 0000")).toBe("501234567");
  });

  it("falls back to the customer phone when the lead phone is null or junk", () => {
    expect(casePhoneTail(null, "+971 55 999 0000")).toBe("559990000");
    expect(casePhoneTail("", "971559990000")).toBe("559990000");
    // Too few digits to trust a match — treated as absent.
    expect(casePhoneTail("12345", "+971 55 999 0000")).toBe("559990000");
  });

  it("is null only when neither side carries a trustworthy number", () => {
    expect(casePhoneTail(null, null)).toBeNull();
    expect(casePhoneTail(undefined, "123")).toBeNull();
  });
});

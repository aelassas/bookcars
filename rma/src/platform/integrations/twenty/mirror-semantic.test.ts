// Tests for the mirror's semantic projection: the Bitrix fields the original
// import dropped — deal COMMENTS → note, UF labels → opportunity fields,
// social URL → person LINKS, return-customer/language → person, MOVED_* →
// stageEvent. All runs go through the in-memory MOCK TwentyClient — no network.
import { describe, expect, it } from "vitest";
import { createTwentyClient, type TwentyClient } from "./client";
import {
  aiSummaryNoteTitle,
  planMirrorRecord,
  runMirror,
  stageEventExternalId,
  type MirrorEntity,
  type MirrorSource,
  type MirrorSourceRow,
  type MirrorStateRow,
  type MirrorStateStore,
} from "./mirror";

// ─── In-memory fakes (same pattern as mirror.test.ts) ───────────────────────

class MemSource implements MirrorSource {
  constructor(private data: Record<MirrorEntity, MirrorSourceRow[]>) {
    for (const entity of Object.keys(this.data) as MirrorEntity[]) {
      this.data[entity].sort((a, b) => (a.externalId < b.externalId ? -1 : 1));
    }
  }
  list(
    entity: MirrorEntity,
    q: { afterExternalId: string | null; limit: number }
  ): Promise<MirrorSourceRow[]> {
    const rows = this.data[entity].filter(
      (r) => q.afterExternalId === null || r.externalId > q.afterExternalId
    );
    return Promise.resolve(rows.slice(0, q.limit));
  }
}

class MemState implements MirrorStateStore {
  rows = new Map<MirrorEntity, MirrorStateRow>();
  load(entity: MirrorEntity): Promise<MirrorStateRow | null> {
    return Promise.resolve(this.rows.get(entity) ?? null);
  }
  save(row: MirrorStateRow): Promise<void> {
    this.rows.set(row.entity, structuredClone(row));
    return Promise.resolve();
  }
}

const AFTER_CUTOFF = new Date("2026-08-10T00:00:00Z");
const SINCE = new Date("2024-01-01T00:00:00Z");

function contact(id: string, over: Partial<MirrorSourceRow> = {}): MirrorSourceRow {
  return {
    externalId: id,
    name: `Person ${id}`,
    phone: `+9715012345${id.padStart(2, "0")}`,
    source: "whatsapp",
    modifiedAt: AFTER_CUTOFF,
    ...over,
  };
}

function dealRow(id: string, over: Partial<MirrorSourceRow> = {}): MirrorSourceRow {
  return {
    externalId: id,
    name: `BX-${id} lease`,
    status: "lost",
    stage: "closed",
    stageDetail: "Закрытая сделка",
    modifiedAt: AFTER_CUTOFF,
    ...over,
  };
}

function sourceOf(
  contacts: MirrorSourceRow[] = [],
  leads: MirrorSourceRow[] = [],
  deals: MirrorSourceRow[] = []
): MemSource {
  return new MemSource({ contacts, leads, deals });
}

async function allRows(client: TwentyClient, objectPath: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for await (const row of client.listAll<Record<string, unknown>>(objectPath)) out.push(row);
  return out;
}

// ─── Field projection (pure plan) ────────────────────────────────────────────

describe("planMirrorRecord semantic fields", () => {
  it("puts the resolved workspaceMember on ownerId when the owner email maps", () => {
    const planned = planMirrorRecord(
      "deals",
      dealRow("1", { lossReason: "Не отвечает" }),
      new Date("2023-01-01"),
      "default",
      "member-azat-1"
    );
    expect(planned.payload.ownerId).toBe("member-azat-1");
  });

  it("omits ownerId when the owner email has no member on this instance", () => {
    const planned = planMirrorRecord(
      "deals",
      dealRow("1", { lossReason: "Не отвечает" }),
      new Date("2023-01-01"),
      "default",
      null
    );
    expect("ownerId" in planned.payload).toBe(false);
  });

  it("carries lossReason as an ASCII option code and carModels verbatim onto the opportunity", () => {
    const planned = planMirrorRecord(
      "deals",
      dealRow("1", { lossReason: "Не отвечает", carModels: "Kia Cerato; Kia K5" }),
      SINCE
    );
    expect(planned.payload.lossReason).toBe("NO_ANSWER");
    expect(planned.payload.carModels).toBe("Kia Cerato; Kia K5");
  });

  it("omits the semantic keys when the portal row has none — never blanks", () => {
    const planned = planMirrorRecord("deals", dealRow("1"), SINCE);
    expect("lossReason" in planned.payload).toBe(false);
    expect("carModels" in planned.payload).toBe(false);
  });

  it("projects a contact's socialUrl as the socialProfile LINKS composite", () => {
    const planned = planMirrorRecord(
      "contacts",
      contact("9", { socialUrl: "https://instagram.com/natchswathi" }),
      SINCE
    );
    expect(planned.payload.socialProfile).toEqual({
      primaryLinkUrl: "https://instagram.com/natchswathi",
      primaryLinkLabel: "instagram.com/natchswathi",
      secondaryLinks: [],
    });
  });

  it("mines the social URL out of a lead's raw SOURCE_DESCRIPTION", () => {
    const planned = planMirrorRecord(
      "leads",
      {
        externalId: "5",
        name: "Natch",
        phone: "+971529876501",
        status: "new",
        sourceDescription: "came from https://instagram.com/natchswathi, via ads",
        modifiedAt: AFTER_CUTOFF,
      },
      SINCE
    );
    expect(planned.payload.socialProfile).toMatchObject({
      primaryLinkUrl: "https://instagram.com/natchswathi",
    });
  });

  it("leaves socialProfile OUT when there is no URL", () => {
    const planned = planMirrorRecord("contacts", contact("10"), SINCE);
    expect("socialProfile" in planned.payload).toBe(false);
  });
});

// ─── Deal COMMENTS → Twenty note ─────────────────────────────────────────────

describe("deal COMMENTS → note", () => {
  const richDeal = dealRow("301", {
    sourceComments: "Клиент заинтересован в лизинге с выкупом. Модели: Mercedes G63 2022",
  });

  it("creates one note targeted at the opportunity — and never a second one", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const state = new MemState();
    const source = sourceOf([], [], [richDeal]);

    const first = await runMirror(source, state, client, {});
    expect(first.entities.deals?.notes).toBe(1);

    const notes = await allRows(client, "notes");
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe(aiSummaryNoteTitle("deal:301"));
    expect((notes[0].bodyV2 as { markdown: string }).markdown).toContain("Mercedes G63");

    // The note is attached to the opportunity the mirror created for the deal.
    const targets = await allRows(client, "noteTargets");
    expect(targets).toHaveLength(1);
    const [opp] = await allRows(client, "opportunities");
    expect(targets[0].noteId).toBe(notes[0].id);
    expect(targets[0].targetOpportunityId).toBe(opp.id);

    // Second full run: the title index turns the note into a no-op.
    const second = await runMirror(source, state, client, {});
    expect(second.entities.deals?.notes ?? 0).toBe(0);
    expect(await allRows(client, "notes")).toHaveLength(1);
  });

  it("creates no note for a deal without COMMENTS", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const report = await runMirror(sourceOf([], [], [dealRow("302")]), new MemState(), client, {});
    expect(report.entities.deals?.notes ?? 0).toBe(0);
    expect(await allRows(client, "notes")).toHaveLength(0);
  });
});

// ─── MOVED_* → stageEvent ────────────────────────────────────────────────────

describe("MOVED_* → stageEvent", () => {
  const movedAt = new Date("2026-07-30T08:00:00.000Z");
  const movedDeal = dealRow("401", {
    stageDetail: "КП отправлено",
    previousStageDetail: "Выявление потребности",
    sourceMovedAt: movedAt,
    sourceMovedById: "12",
  });

  it("writes one stageEvent per observed transition, idempotent by externalId", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const state = new MemState();
    const source = sourceOf([], [], [movedDeal]);

    const first = await runMirror(source, state, client, {});
    expect(first.entities.deals?.stageEvents).toBe(1);

    const events = await allRows(client, "stageEvents");
    expect(events).toHaveLength(1);
    expect(events[0].externalId).toBe(stageEventExternalId("deal:401", movedAt));
    expect(events[0].externalId).toBe(`deal:401:${movedAt.toISOString()}`);
    expect(events[0].fromStage).toBe("Выявление потребности");
    expect(events[0].toStage).toBe("КП отправлено");
    expect(events[0].changedAt).toBe(movedAt.toISOString());
    expect(events[0].changedBy).toBe("12");
    const [opp] = await allRows(client, "opportunities");
    expect(events[0].opportunityId).toBe(opp.id);

    // Second run: the transition is already recorded — nothing new.
    const second = await runMirror(source, state, client, {});
    expect(second.entities.deals?.stageEvents ?? 0).toBe(0);
    expect(await allRows(client, "stageEvents")).toHaveLength(1);
  });

  it("a LATER move of the same deal is a NEW event (the key carries MOVED_TIME)", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const state = new MemState();
    await runMirror(sourceOf([], [], [movedDeal]), state, client, {});
    const later = new Date("2026-08-01T08:00:00.000Z");
    await runMirror(sourceOf([], [], [{ ...movedDeal, sourceMovedAt: later }]), state, client, {});
    expect(await allRows(client, "stageEvents")).toHaveLength(2);
  });

  it("no MOVED_TIME → no stageEvent", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const report = await runMirror(sourceOf([], [], [dealRow("402")]), new MemState(), client, {});
    expect(report.entities.deals?.stageEvents ?? 0).toBe(0);
  });
});

// ─── Deal-carried person traits ──────────────────────────────────────────────

describe("deal traits → person", () => {
  // Deliberately NOT one of the mock client's seeded tails (501234567 /
  // 529876543) — a shared tail would phone-match the seeded person instead.
  const phone = "+971561112223";

  it("patches the phone-matched person with language, returnCustomer and social", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const source = sourceOf(
      [contact("51", { phone })],
      [],
      [
        dealRow("51", {
          phone,
          languageSegment: "Русскоязычные",
          returnCustomer: true,
          sourceDescription: "https://instagram.com/natchswathi",
        }),
      ]
    );

    const report = await runMirror(source, new MemState(), client, {});
    expect(report.entities.deals?.personEnriched).toBe(1);

    const people = await allRows(client, "people");
    const person = people.find((p) => p.externalId === "contact:51");
    expect(person?.languageSegment).toBe("RUSSIAN_SPEAKING");
    expect(person?.returnCustomer).toBe(true);
    expect(person?.socialProfile).toMatchObject({ primaryLinkUrl: "https://instagram.com/natchswathi" });
  });

  it("does NOT propagate returnCustomer=false — 'N' is Bitrix's default, no signal", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const source = sourceOf(
      [contact("52", { phone })],
      [],
      [dealRow("52", { phone, returnCustomer: false })]
    );
    const report = await runMirror(source, new MemState(), client, {});
    expect(report.entities.deals?.personEnriched ?? 0).toBe(0);
    const person = (await allRows(client, "people")).find((p) => p.externalId === "contact:52");
    expect(person && "returnCustomer" in person).toBe(false);
  });

  it("scopes the note/stageEvent keys by brand like every other externalId", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const source = sourceOf(
      [],
      [],
      [
        dealRow("61", {
          brandLine: "takeauto",
          sourceComments: "summary",
          sourceMovedAt: new Date("2026-07-30T08:00:00.000Z"),
        }),
      ]
    );
    await runMirror(source, new MemState(), client, { brandLine: "takeauto" });
    const [note] = await allRows(client, "notes");
    expect(note.title).toBe(aiSummaryNoteTitle("takeauto/deal:61"));
    const [event] = await allRows(client, "stageEvents");
    expect(event.externalId).toBe(
      stageEventExternalId("takeauto/deal:61", new Date("2026-07-30T08:00:00.000Z"))
    );
  });
});

// ─── Dry run ─────────────────────────────────────────────────────────────────

describe("dryRun side effects", () => {
  it("counts notes/stageEvents/enrichments but writes nothing", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const source = sourceOf(
      [contact("71", { phone: "+971501234571" })],
      [],
      [
        dealRow("71", {
          phone: "+971501234571",
          sourceComments: "summary",
          sourceMovedAt: new Date("2026-07-30T08:00:00.000Z"),
          languageSegment: "Арабы",
        }),
      ]
    );
    const report = await runMirror(source, new MemState(), client, { dryRun: true });
    expect(report.entities.deals?.notes).toBe(1);
    expect(report.entities.deals?.stageEvents).toBe(1);
    // The person exists only as a would-be create in dry-run, so the
    // enrichment has no resolved target and is not counted.
    expect(await allRows(client, "notes")).toHaveLength(0);
    expect(await allRows(client, "stageEvents")).toHaveLength(0);
  });
});

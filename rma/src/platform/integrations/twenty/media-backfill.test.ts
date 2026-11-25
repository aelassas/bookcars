// Media backfill tests (media-backfill.ts), aggregated day-note shape. No
// network, no DB: the drizzle surface is a call-ordered stub (checkpoint →
// messages → checkpoint write) and Twenty is the in-memory mock client seeded
// with two people (phoneTail9 "501234567" and "529876543").
import { describe, expect, it } from "vitest";
import { createTwentyClient, type TwentyClient } from "./client";
import { noteLine, waNoteTitle } from "./day-note";
import { backfillWaMediaToTwenty } from "./media-backfill";
import { noteTitle } from "./push-message";

const PERSON_TAIL = "501234567";
const CHECKPOINT = "2026-08-20T00:00:00.000Z";
const AT = new Date("2026-08-21T10:00:00.000Z");
const MEDIA_BYTES = Buffer.from([1, 2, 3, 4]);

const DAY_TITLE = waNoteTitle("971501234567");
const LEGACY_TITLE = noteTitle("inbound", "Sheraz", AT);

interface FakeMessage {
  id: string;
  direction: string;
  from: string;
  fromPn: string | null;
  to: string | null;
  customerName: string | null;
  body: string;
  mediaPath: string | null;
  createdAt: Date;
}

function waMessage(over: Partial<FakeMessage> = {}): FakeMessage {
  return {
    id: over.id ?? `msg-${Math.random().toString(36).slice(2, 8)}`,
    direction: "inbound",
    from: "+971501234567",
    fromPn: null,
    to: "babek",
    customerName: "Sheraz",
    body: "7th September - 14th september",
    mediaPath: "wa/babek/eid.jpg",
    createdAt: AT,
    ...over,
  };
}

/** Call-ordered drizzle stub: checkpoint select, message page, execute. */
function fakeDb(messages: FakeMessage[]) {
  const selectResults: unknown[][] = [
    [{ counts: { checkpoint: CHECKPOINT } }],
    messages,
  ];
  let i = 0;
  const db = {
    select: () => {
      const rows = selectResults[i++] ?? [];
      return {
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(rows),
            orderBy: () => ({ limit: () => Promise.resolve(rows) }),
          }),
        }),
      };
    },
    execute: () => Promise.resolve({}),
  };
  return db as unknown as Parameters<typeof backfillWaMediaToTwenty>[0];
}

async function allRows(client: TwentyClient, objectPath: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for await (const row of client.listAll<Record<string, unknown>>(objectPath)) out.push(row);
  return out;
}

/** Mock client pre-loaded with one open deal for the seeded person's number. */
async function clientWithDeal(): Promise<{ client: TwentyClient; dealId: string }> {
  const client = createTwentyClient({ mode: "mock" });
  const [deal] = await client.batchCreate<Record<string, unknown>>("opportunities", [
    { name: "Rental +971501234567", stage: "NEW", phoneTail9: PERSON_TAIL, brandLine: "takeauto" },
  ]);
  return { client, dealId: deal.id as string };
}

/** Pre-create a note the way the OLD per-message projector wrote it. */
async function seedLegacyNote(client: TwentyClient, personId: string): Promise<string> {
  const [note] = await client.batchCreate<Record<string, unknown>>("notes", [
    { title: LEGACY_TITLE, bodyV2: { markdown: "old body", blocknote: null } },
  ]);
  await client.batchCreate("noteTargets", [{ noteId: note.id as string, targetPersonId: personId }]);
  return note.id as string;
}

/** Pre-create an aggregated day note the way the NEW sync writes it. */
async function seedDayNote(client: TwentyClient, personId: string): Promise<string> {
  const [note] = await client.batchCreate<Record<string, unknown>>("notes", [
    {
      title: DAY_TITLE,
      bodyV2: { markdown: "[💬 WhatsApp +971501234567](https://web.whatsapp.com/send?phone=971501234567)", blocknote: null },
    },
  ]);
  await client.batchCreate("noteTargets", [{ noteId: note.id as string, targetPersonId: personId }]);
  return note.id as string;
}

/**
 * The mock client's get() ignores filter params and returns the whole store.
 * Real Twenty applies title[eq] / name[eq] — this wrapper makes the mock
 * honest about the TWO filters this module relies on, so multi-note and
 * multi-attachment scenarios dedupe correctly.
 */
function withRealFilters(client: TwentyClient): TwentyClient {
  const realGet = client.get.bind(client);
  return {
    ...client,
    async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
      const res = await realGet<T>(path, params);
      const filter = typeof params?.filter === "string" ? params.filter : "";
      const wantedTitle = /title\[eq\]:"([^"]*)"/.exec(filter)?.[1];
      const wantedName = /name\[eq\]:"([^"]*)"/.exec(filter)?.[1];
      if (wantedTitle !== undefined || wantedName !== undefined) {
        const data = (res as { data?: Record<string, unknown> }).data ?? {};
        for (const key of Object.keys(data)) {
          if (!Array.isArray(data[key])) continue;
          let rows = data[key] as Record<string, unknown>[];
          if (wantedTitle !== undefined) rows = rows.filter((r) => r.title === wantedTitle);
          if (wantedName !== undefined) rows = rows.filter((r) => r.name === wantedName);
          data[key] = rows;
        }
      }
      return res;
    },
  };
}

const OPTS = { since: new Date(CHECKPOINT), max: 100, commit: true };

describe("backfillWaMediaToTwenty — attach-only mode (createNotes OFF)", () => {
  it("attaches onto the aggregated day note when that is what exists", async () => {
    const { client, dealId } = await clientWithDeal();
    const noteId = await seedDayNote(client, "mock-person-1");
    const report = await backfillWaMediaToTwenty(fakeDb([waMessage()]), "tenant-1", "take-auto", {
      ...OPTS,
      client: withRealFilters(client),
      readMedia: async () => MEDIA_BYTES,
    });

    expect(report).toMatchObject({ read: 1, attached: 1, noNote: 0, failed: 0 });
    const [att] = await allRows(client, "attachments");
    expect(att).toMatchObject({ name: "eid.jpg", targetNoteId: noteId, targetOpportunityId: dealId });
    expect(await allRows(client, "notes")).toHaveLength(1); // never creates
  });

  it("falls back to the legacy per-message note when no day note exists", async () => {
    const { client } = await clientWithDeal();
    const legacyId = await seedLegacyNote(client, "mock-person-1");
    const report = await backfillWaMediaToTwenty(fakeDb([waMessage()]), "tenant-1", "take-auto", {
      ...OPTS,
      client: withRealFilters(client),
      readMedia: async () => MEDIA_BYTES,
    });

    expect(report).toMatchObject({ attached: 1, noNote: 0 });
    const [att] = await allRows(client, "attachments");
    expect(att.targetNoteId).toBe(legacyId);
  });

  it("no note in EITHER shape → skipped, nothing written", async () => {
    const { client } = await clientWithDeal();
    const report = await backfillWaMediaToTwenty(fakeDb([waMessage()]), "tenant-1", "take-auto", {
      ...OPTS,
      client: withRealFilters(client),
      readMedia: async () => MEDIA_BYTES,
    });

    expect(report).toMatchObject({ read: 1, noNote: 1, attached: 0, notesCreated: 0 });
    expect(await allRows(client, "notes")).toHaveLength(0);
    expect(await allRows(client, "attachments")).toHaveLength(0);
  });

  it("a re-run does not re-upload the file (name+person dedupe)", async () => {
    const { client } = await clientWithDeal();
    await seedDayNote(client, "mock-person-1");
    const filtered = withRealFilters(client);
    await backfillWaMediaToTwenty(fakeDb([waMessage()]), "tenant-1", "take-auto", {
      ...OPTS,
      client: filtered,
      readMedia: async () => MEDIA_BYTES,
    });
    const second = await backfillWaMediaToTwenty(fakeDb([waMessage()]), "tenant-1", "take-auto", {
      ...OPTS,
      client: filtered,
      readMedia: async () => MEDIA_BYTES,
    });

    expect(second).toMatchObject({ attached: 0, alreadyAttached: 1 });
    expect(await allRows(client, "attachments")).toHaveLength(1);
  });
});

describe("backfillWaMediaToTwenty — createNotes (aggregated replay)", () => {
  it("a TEXT-ONLY message becomes a line on the (person, day) note, no attachment", async () => {
    const { client } = await clientWithDeal();
    const report = await backfillWaMediaToTwenty(
      fakeDb([waMessage({ mediaPath: null })]),
      "tenant-1",
      "take-auto",
      { ...OPTS, createNotes: true, client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ notesCreated: 1, linesWritten: 1, attached: 0, failed: 0 });
    const [note] = await allRows(client, "notes");
    expect(note.title).toBe(DAY_TITLE);
    const markdown = (note.bodyV2 as { markdown: string }).markdown;
    expect(markdown).toContain("https://web.whatsapp.com/send?phone=971501234567");
    expect(markdown).toContain(noteLine("inbound", AT, "7th September - 14th september"));
    expect(await allRows(client, "noteTargets")).toHaveLength(2);
    expect(await allRows(client, "attachments")).toHaveLength(0);
  });

  it("a VOICE message lands its transcript line AND attaches the audio", async () => {
    const { client } = await clientWithDeal();
    const report = await backfillWaMediaToTwenty(
      fakeDb([waMessage({ mediaPath: "wa/babek/voice.ogg", body: "[voice] I need the car tomorrow" })]),
      "tenant-1",
      "take-auto",
      { ...OPTS, createNotes: true, client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ notesCreated: 1, linesWritten: 1, attached: 1, skippedKind: 0 });
    const [note] = await allRows(client, "notes");
    // Ayham 2026-08-30: clickable, not transcribed — the audio is the record.
    expect((note.bodyV2 as { markdown: string }).markdown).toContain("🎙 Voice · [🔗 Listen](");
    expect((note.bodyV2 as { markdown: string }).markdown).not.toContain("I need the car tomorrow");
    const [att] = await allRows(client, "attachments");
    expect(att).toMatchObject({ name: "voice.ogg", targetNoteId: note.id });
  });

  it("a message the OLD projector already wrote is not replayed — but its media attaches", async () => {
    const { client } = await clientWithDeal();
    const legacyId = await seedLegacyNote(client, "mock-person-1");
    const report = await backfillWaMediaToTwenty(fakeDb([waMessage()]), "tenant-1", "take-auto", {
      ...OPTS,
      createNotes: true,
      client: withRealFilters(client),
      readMedia: async () => MEDIA_BYTES,
    });

    expect(report).toMatchObject({ alreadyProjected: 1, notesCreated: 0, linesWritten: 0, attached: 1 });
    expect(await allRows(client, "notes")).toHaveLength(1); // the legacy one, no day note
    const [att] = await allRows(client, "attachments");
    expect(att.targetNoteId).toBe(legacyId);
  });

  it("a re-run over the same range does not duplicate lines or files", async () => {
    const { client } = await clientWithDeal();
    const filtered = withRealFilters(client);
    await backfillWaMediaToTwenty(fakeDb([waMessage()]), "tenant-1", "take-auto", {
      ...OPTS,
      createNotes: true,
      client: filtered,
      readMedia: async () => MEDIA_BYTES,
    });
    const second = await backfillWaMediaToTwenty(fakeDb([waMessage()]), "tenant-1", "take-auto", {
      ...OPTS,
      createNotes: true,
      client: filtered,
      readMedia: async () => MEDIA_BYTES,
    });

    expect(second).toMatchObject({ notesCreated: 0, notesAppended: 0, alreadyAttached: 1, attached: 0 });
    const notes = await allRows(client, "notes");
    expect(notes).toHaveLength(1);
    const markdown = (notes[0].bodyV2 as { markdown: string }).markdown;
    expect(markdown.split("7th September - 14th september").length - 1).toBe(1);
    expect(await allRows(client, "attachments")).toHaveLength(1);
  });

  it("a mixed conversation replays into ONE note: text, voice and a document photo", async () => {
    const { client, dealId } = await clientWithDeal();
    const at = (h: number) => new Date(AT.getTime() + h * 3_600_000);
    const report = await backfillWaMediaToTwenty(
      fakeDb([
        waMessage({ id: "m1", mediaPath: null, body: "7th September - 14th september", createdAt: at(0) }),
        waMessage({ id: "m2", mediaPath: "wa/babek/voice.ogg", body: "[voice] ok", createdAt: at(1) }),
        waMessage({ id: "m3", mediaPath: "wa/babek/eid.jpg", body: "my id", createdAt: at(2) }),
      ]),
      "tenant-1",
      "take-auto",
      { ...OPTS, createNotes: true, client: withRealFilters(client), readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({
      read: 3,
      notesCreated: 1,
      linesWritten: 3,
      attached: 2, // voice + photo
      failed: 0,
    });
    const notes = await allRows(client, "notes");
    expect(notes).toHaveLength(1);
    const markdown = (notes[0].bodyV2 as { markdown: string }).markdown;
    expect(markdown).toContain("7th September - 14th september");
    expect(markdown).toContain("🎙 Voice · [🔗 Listen](");
    expect(markdown).toContain("my id");
    const atts = await allRows(client, "attachments");
    expect(atts).toHaveLength(2);
    for (const att of atts) {
      expect(att.targetNoteId).toBe(notes[0].id);
      expect(att.targetOpportunityId).toBe(dealId);
    }
  });

  it("a message with no person match stays skipped — people are never created", async () => {
    const { client } = await clientWithDeal();
    const report = await backfillWaMediaToTwenty(
      fakeDb([waMessage({ from: "+971559990000" })]),
      "tenant-1",
      "take-auto",
      { ...OPTS, createNotes: true, client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ noPerson: 1, notesCreated: 0, attached: 0 });
    expect(await allRows(client, "people")).toHaveLength(2); // just the mock seeds
    expect(await allRows(client, "notes")).toHaveLength(0);
  });

  it("dry-run counts what it WOULD write and writes nothing", async () => {
    const { client } = await clientWithDeal();
    const report = await backfillWaMediaToTwenty(fakeDb([waMessage()]), "tenant-1", "take-auto", {
      since: new Date(CHECKPOINT),
      max: 100,
      commit: false,
      createNotes: true,
      client,
      readMedia: async () => MEDIA_BYTES,
    });

    expect(report).toMatchObject({ mode: "DRY-RUN", notesCreated: 1, linesWritten: 1, attached: 1 });
    expect(await allRows(client, "notes")).toHaveLength(0);
    expect(await allRows(client, "attachments")).toHaveLength(0);
  });

  it("a VIDEO row lands its line but never its file", async () => {
    const { client } = await clientWithDeal();
    const report = await backfillWaMediaToTwenty(
      fakeDb([waMessage({ mediaPath: "wa/babek/clip.mp4", body: "video of the scratch" })]),
      "tenant-1",
      "take-auto",
      { ...OPTS, createNotes: true, client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ notesCreated: 1, linesWritten: 1, attached: 0, skippedKind: 1 });
    expect(await allRows(client, "notes")).toHaveLength(1);
    expect(await allRows(client, "attachments")).toHaveLength(0);
  });
});

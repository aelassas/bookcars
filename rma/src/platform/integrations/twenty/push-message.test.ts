// WhatsApp → Twenty projector tests (push-message.ts), aggregated day-note
// shape. No network, no DB: the drizzle surface is a call-ordered stub
// (tenant → checkpoint → messages → checkpoint write) and Twenty is the
// in-memory mock client seeded with two people (phoneTail9 "501234567" and
// "529876543").
import { describe, expect, it } from "vitest";
import { createTwentyClient, type TwentyClient } from "./client";
import { dayHeader, ensureContinuousNote, noteLine, waNoteTitle } from "./day-note";
import { syncWaMessagesToTwenty } from "./push-message";
import { buildThreadNote, type LeadThread } from "./wa-lead-relay";

// The mock's seeded people this suite files everything under.
const PERSON1_PHONE = "+971501234567";
const PERSON2_PHONE = "+971529876543";
const CHECKPOINT = "2026-08-20T00:00:00.000Z";
const AT = new Date("2026-08-21T10:00:00.000Z");
const MEDIA_BYTES = Buffer.from([1, 2, 3, 4]);

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
    from: PERSON1_PHONE,
    fromPn: null,
    to: "babek",
    customerName: "Ahmed",
    body: "Here is my Emirates ID",
    mediaPath: null,
    createdAt: AT,
    ...over,
  };
}

/** Call-ordered drizzle stub: tenant slug, checkpoint row, message page, execute. */
function fakeDb(messages: FakeMessage[], slug = "take-auto", lidPhones: Record<string, string> = {}) {
  const selectResults: unknown[][] = [
    [{ slug }],
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
    // The only raw-SQL readers are the wa_identity lid lookup (consumes rows)
    // and the checkpoint save (ignores the result), so one shape serves both.
    execute: () =>
      Promise.resolve({
        rows: Object.entries(lidPhones).map(([lid, phone]) => ({ lid, phone })),
      }),
  };
  return db as unknown as Parameters<typeof syncWaMessagesToTwenty>[0];
}

async function allRows(client: TwentyClient, objectPath: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for await (const row of client.listAll<Record<string, unknown>>(objectPath)) out.push(row);
  return out;
}

/** Mock client pre-loaded with one open deal for person 1's number. */
async function clientWithDeal(withDeal = true): Promise<{ client: TwentyClient; dealId: string | null }> {
  const client = createTwentyClient({ mode: "mock" });
  if (!withDeal) return { client, dealId: null };
  const [deal] = await client.batchCreate<Record<string, unknown>>("opportunities", [
    { name: "Rental +971501234567", stage: "NEW", phoneTail9: "501234567", brandLine: "takeauto" },
  ]);
  return { client, dealId: deal.id as string };
}

/**
 * The mock client's get() ignores filter params and returns the whole store.
 * With more than one day note in play that breaks find-or-create (every
 * lookup "finds" the first note). Real Twenty applies title[eq] — this
 * wrapper makes the mock honest about the ONE filter this module relies on.
 */
function withNoteTitleFilter(client: TwentyClient): TwentyClient {
  const realGet = client.get.bind(client);
  return {
    ...client,
    async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
      const res = await realGet<T>(path, params);
      if (path === "notes" && typeof params?.filter === "string") {
        const wanted = /title\[eq\]:"([^"]*)"/.exec(params.filter)?.[1];
        if (wanted !== undefined) {
          const data = (res as { data?: Record<string, unknown> }).data ?? {};
          for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) {
              data[key] = (data[key] as Record<string, unknown>[]).filter((r) => r.title === wanted);
            }
          }
        }
      }
      return res;
    },
  };
}

const TITLE = waNoteTitle("971501234567");

describe("syncWaMessagesToTwenty — @lid fallback", () => {
  const LID = "250744519274552@lid";

  it("an outbound reply to a @lid resolves via wa_identity instead of dropping", async () => {
    const { client } = await clientWithDeal();
    const report = await syncWaMessagesToTwenty(
      fakeDb(
        [waMessage({ direction: "outbound", from: LID, to: "babek", customerName: null, body: "Sure, see you at 5" })],
        "take-auto",
        { [LID]: PERSON1_PHONE }
      ),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 1, noPerson: 0, notesCreated: 1, failed: 0 });
    const [note] = await allRows(client, "notes");
    expect(note.title).toBe(TITLE);
    const markdown = (note.bodyV2 as { markdown: string }).markdown;
    expect(markdown).toContain(noteLine("outbound", AT, "Sure, see you at 5"));
  });

  it("a lid nobody knows still drops as noPerson (never guessed)", async () => {
    const { client } = await clientWithDeal();
    const report = await syncWaMessagesToTwenty(
      fakeDb([
        waMessage({ direction: "outbound", from: LID, to: "babek", customerName: null, body: "Sure, see you at 5" }),
      ]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 0, noPerson: 1, notesCreated: 0, failed: 0 });
    expect(await allRows(client, "notes")).toHaveLength(0);
  });
});

describe("syncWaMessagesToTwenty — aggregated day notes", () => {
  it("one note per (person, day): a media message lands line + attachment on it", async () => {
    const { client, dealId } = await clientWithDeal();
    const report = await syncWaMessagesToTwenty(
      fakeDb([waMessage({ mediaPath: "wa/babek/eid.jpg" })]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({
      read: 1,
      messagesProjected: 1,
      notesCreated: 1,
      notesAppended: 0,
      mediaAttached: 1,
      mediaFailed: 0,
      failed: 0,
    });

    const [note] = await allRows(client, "notes");
    expect(note.title).toBe(TITLE);
    const markdown = (note.bodyV2 as { markdown: string }).markdown;
    // wa.me deep-link header, then the chronological line.
    expect(markdown).toContain("https://web.whatsapp.com/send?phone=971501234567");
    expect(markdown).toContain(noteLine("inbound", AT, "Here is my Emirates ID", "Ahmed"));

    const targets = await allRows(client, "noteTargets");
    expect(targets).toHaveLength(2);
    expect(targets.some((t) => t.targetOpportunityId === dealId)).toBe(true);

    const [att] = await allRows(client, "attachments");
    expect(att).toMatchObject({
      name: "eid.jpg",
      targetNoteId: note.id,
      targetOpportunityId: dealId,
    });
    expect(typeof att.targetPersonId).toBe("string");
  });

  it("one batch, same person + day: a SINGLE note carries both lines", async () => {
    const { client } = await clientWithDeal();
    const at2 = new Date(AT.getTime() + 5 * 60_000);
    const report = await syncWaMessagesToTwenty(
      fakeDb([
        waMessage({ id: "m1", body: "7th September - 14th september" }),
        waMessage({ id: "m2", body: "I will send my ID", createdAt: at2 }),
      ]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 2, notesCreated: 1, failed: 0 });
    const notes = await allRows(client, "notes");
    expect(notes).toHaveLength(1);
    const markdown = (notes[0].bodyV2 as { markdown: string }).markdown;
    expect(markdown).toContain("7th September - 14th september");
    expect(markdown).toContain("I will send my ID");
  });

  it("a second batch the same day APPENDS to the note instead of creating one", async () => {
    const { client } = await clientWithDeal();
    await syncWaMessagesToTwenty(fakeDb([waMessage({ id: "m1", body: "first message" })]), "tenant-1", {
      client,
      readMedia: async () => MEDIA_BYTES,
    });

    const at2 = new Date(AT.getTime() + 30 * 60_000);
    const second = await syncWaMessagesToTwenty(
      fakeDb([waMessage({ id: "m2", body: "second message", createdAt: at2 })]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(second).toMatchObject({ messagesProjected: 1, notesCreated: 0, notesAppended: 1 });
    const notes = await allRows(client, "notes");
    expect(notes).toHaveLength(1);
    const markdown = (notes[0].bodyV2 as { markdown: string }).markdown;
    expect(markdown).toContain("first message");
    expect(markdown).toContain("second message");
  });

  it("a re-walked batch does NOT duplicate lines (line-level idempotency)", async () => {
    // Crash between append and checkpoint: the next pass re-reads the same
    // row. The line is already in the note — nothing is appended.
    const { client } = await clientWithDeal();
    const msg = waMessage({ id: "m1", body: "same message" });
    await syncWaMessagesToTwenty(fakeDb([msg]), "tenant-1", { client, readMedia: async () => MEDIA_BYTES });
    const again = await syncWaMessagesToTwenty(fakeDb([msg]), "tenant-1", {
      client,
      readMedia: async () => MEDIA_BYTES,
    });

    expect(again).toMatchObject({ notesCreated: 0, notesAppended: 0, messagesProjected: 1 });
    const notes = await allRows(client, "notes");
    expect(notes).toHaveLength(1);
    const markdown = (notes[0].bodyV2 as { markdown: string }).markdown;
    expect(markdown.split("same message").length - 1).toBe(1);
  });

  it("two customers the same day get two SEPARATE notes (phone in the title key)", async () => {
    const { client } = await clientWithDeal();
    const filtered = withNoteTitleFilter(client);
    const report = await syncWaMessagesToTwenty(
      fakeDb([
        waMessage({ id: "m1", body: "from ahmed" }),
        waMessage({ id: "m2", from: PERSON2_PHONE, customerName: "Maria", body: "from maria" }),
      ]),
      "tenant-1",
      { client: filtered, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 2, notesCreated: 2 });
    const notes = await allRows(client, "notes");
    expect(notes).toHaveLength(2);
    const ahmed = notes.find((n) => n.title === TITLE);
    const maria = notes.find((n) => n.title === waNoteTitle("971529876543"));
    expect((ahmed?.bodyV2 as { markdown: string }).markdown).toContain("from ahmed");
    expect((ahmed?.bodyV2 as { markdown: string }).markdown).not.toContain("from maria");
    expect((maria?.bodyV2 as { markdown: string }).markdown).toContain("from maria");
  });

  it("one customer across TWO days gets ONE note, split by day headers", async () => {
    const { client } = await clientWithDeal();
    const filtered = withNoteTitleFilter(client);
    const NEXT_DAY = new Date("2026-08-22T09:30:00.000Z");
    // Self-consistent regardless of the runner's timezone: the assertion uses
    // the same dayKey() the pipeline does, and only requires the two to differ.
    expect(dayHeader(AT)).not.toBe(dayHeader(NEXT_DAY));

    const report = await syncWaMessagesToTwenty(
      fakeDb([
        waMessage({ id: "d1", body: "first day message", createdAt: AT }),
        waMessage({ id: "d2", body: "second day message", createdAt: NEXT_DAY }),
      ]),
      "tenant-1",
      { client: filtered, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 2, notesCreated: 1 });
    const notes = await allRows(client, "notes");
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe(TITLE); // no date in the title any more
    const md = (notes[0].bodyV2 as { markdown: string }).markdown;
    expect(md).toContain(dayHeader(AT));
    expect(md).toContain(dayHeader(NEXT_DAY));
    expect(md).toContain("first day message");
    expect(md).toContain("second day message");
  });

  it("re-running the same two days appends nothing (idempotent across headers)", async () => {
    const { client } = await clientWithDeal();
    const filtered = withNoteTitleFilter(client);
    const NEXT_DAY = new Date("2026-08-22T09:30:00.000Z");
    const rows = [
      waMessage({ id: "d1", body: "first day message", createdAt: AT }),
      waMessage({ id: "d2", body: "second day message", createdAt: NEXT_DAY }),
    ];
    await syncWaMessagesToTwenty(fakeDb(rows), "tenant-1", {
      client: filtered,
      readMedia: async () => MEDIA_BYTES,
    });
    const second = await syncWaMessagesToTwenty(fakeDb(rows), "tenant-1", {
      client: filtered,
      readMedia: async () => MEDIA_BYTES,
    });

    expect(second).toMatchObject({ notesCreated: 0, notesAppended: 0 });
    expect(await allRows(client, "notes")).toHaveLength(1);
  });

  it("a voice note uploads as an attachment AND keeps its transcript line", async () => {
    const { client } = await clientWithDeal();
    const report = await syncWaMessagesToTwenty(
      fakeDb([waMessage({ body: "[voice] I need the car tomorrow", mediaPath: "wa/babek/voice.ogg" })]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 1, mediaAttached: 1, mediaFailed: 0 });
    const [note] = await allRows(client, "notes");
    // Ayham 2026-08-30: clickable, not transcribed — the audio is the record.
    expect((note.bodyV2 as { markdown: string }).markdown).toContain("🎙 Voice · [🔗 Listen](");
    expect((note.bodyV2 as { markdown: string }).markdown).not.toContain("I need the car tomorrow");
    const [att] = await allRows(client, "attachments");
    expect(att).toMatchObject({ name: "voice.ogg", targetNoteId: note.id });
  });

  it("a video lands its line but never its file", async () => {
    const { client } = await clientWithDeal();
    const report = await syncWaMessagesToTwenty(
      fakeDb([waMessage({ body: "video of the scratch", mediaPath: "wa/babek/clip.mp4" })]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 1, mediaAttached: 0, mediaFailed: 0 });
    expect(await allRows(client, "notes")).toHaveLength(1);
    expect(await allRows(client, "attachments")).toHaveLength(0);
  });

  it("a missing file on disk does not fail the note", async () => {
    const { client } = await clientWithDeal();
    const report = await syncWaMessagesToTwenty(
      fakeDb([waMessage({ mediaPath: "wa/babek/gone.jpg" })]),
      "tenant-1",
      { client, readMedia: async () => null }
    );

    expect(report).toMatchObject({ messagesProjected: 1, failed: 0, mediaAttached: 0, mediaFailed: 0 });
    expect(await allRows(client, "notes")).toHaveLength(1);
    expect(await allRows(client, "attachments")).toHaveLength(0);
  });

  it("a failed attachment upload does NOT sink the note (counted separately)", async () => {
    const { client } = await clientWithDeal();
    const failing: TwentyClient = {
      ...client,
      uploadFile: () => Promise.reject(new Error("Twenty PUT file-upload HTTP 500: boom")),
    };
    const report = await syncWaMessagesToTwenty(
      fakeDb([waMessage({ mediaPath: "wa/babek/eid.jpg" })]),
      "tenant-1",
      { client: failing, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 1, failed: 0, mediaAttached: 0, mediaFailed: 1 });
    expect(report.mediaFirstError).toContain("HTTP 500");
    expect(await allRows(client, "notes")).toHaveLength(1);
    expect(await allRows(client, "noteTargets")).toHaveLength(2);
  });

  it("no attachment is attempted when the NOTE create failed (note-first ordering)", async () => {
    const base = (await clientWithDeal()).client;
    let uploads = 0;
    const client: TwentyClient = {
      ...base,
      batchCreate: <T,>(objectPath: string, records: Record<string, unknown>[]): Promise<T[]> => {
        if (objectPath === "notes") return Promise.reject(new Error("Twenty POST batch/notes HTTP 400: bad"));
        return base.batchCreate<T>(objectPath, records);
      },
      uploadFile: (input) => {
        uploads++;
        return base.uploadFile(input);
      },
    };
    const report = await syncWaMessagesToTwenty(
      fakeDb([waMessage({ mediaPath: "wa/babek/eid.jpg" })]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 0, failed: 1, mediaAttached: 0 });
    expect(uploads).toBe(0);
    expect(await allRows(base, "attachments")).toHaveLength(0);
  });

  it("attaches to person + note only when no deal matches the number", async () => {
    const { client } = await clientWithDeal(false);
    const report = await syncWaMessagesToTwenty(
      fakeDb([waMessage({ mediaPath: "wa/babek/eid.jpg" })]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 1, mediaAttached: 1, noDeal: 1 });
    const [att] = await allRows(client, "attachments");
    expect(att).not.toHaveProperty("targetOpportunityId");
    expect(typeof att.targetNoteId).toBe("string");
    expect(await allRows(client, "noteTargets")).toHaveLength(1);
  });

  it("a number with no person is skipped — one in-memory lookup, no note", async () => {
    const { client } = await clientWithDeal();
    const report = await syncWaMessagesToTwenty(
      fakeDb([waMessage({ from: "+971559990000" })]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ noPerson: 1, messagesProjected: 0, notesCreated: 0 });
    expect(await allRows(client, "notes")).toHaveLength(0);
  });
});

describe("syncWaMessagesToTwenty — outbound rows (the agent-reply fix)", () => {
  const outbound = (over: Partial<FakeMessage>) =>
    waMessage({ direction: "outbound", customerName: null, body: "Sure, the car is free", ...over });

  it("post-fix shape: `to` carries the customer phone → files like inbound", async () => {
    const { client } = await clientWithDeal();
    const report = await syncWaMessagesToTwenty(
      fakeDb([outbound({ from: "971501234567@s.whatsapp.net", to: "971501234567" })]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 1, notesCreated: 1, noPerson: 0 });
    const [note] = await allRows(client, "notes");
    expect(note.title).toBe(TITLE);
    // Outbound arrow on the line.
    // Owner 2026-08-30: every line names its side — C: client, A: us.
    expect((note.bodyV2 as { markdown: string }).markdown).toContain("→ A: Sure, the car is free");
  });

  it("legacy shape: `to` is the brand slug but `from` is a phone JID → fallback files it", async () => {
    const { client } = await clientWithDeal();
    const report = await syncWaMessagesToTwenty(
      fakeDb([outbound({ from: "971501234567@s.whatsapp.net", to: "cardiwan" })]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 1, notesCreated: 1, noPerson: 0 });
    expect(await allRows(client, "notes")).toHaveLength(1);
  });

  it("a @lid in `from` must NEVER produce a tail — the row stays noPerson", async () => {
    // normalizePhone would strip the lid to 15 garbage digits; the fallback
    // goes through phoneFromPhoneJid, which refuses anything but a plain
    // phone JID. (History is healed by fix-outbound-wa-to.ts, not by
    // pretending a lid is a number.)
    const { client } = await clientWithDeal();
    const report = await syncWaMessagesToTwenty(
      fakeDb([outbound({ from: "184486545334403@lid", to: "cardiwan" })]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ noPerson: 1, messagesProjected: 0, notesCreated: 0 });
    expect(await allRows(client, "notes")).toHaveLength(0);
  });

  it("inbound and outbound from one customer share ONE day note", async () => {
    const { client } = await clientWithDeal();
    const at2 = new Date(AT.getTime() + 5 * 60_000);
    const report = await syncWaMessagesToTwenty(
      fakeDb([
        waMessage({ id: "m1", body: "is the car free?" }),
        outbound({ id: "m2", from: "971501234567@s.whatsapp.net", to: "cardiwan", createdAt: at2 }),
      ]),
      "tenant-1",
      { client, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ messagesProjected: 2, notesCreated: 1 });
    const notes = await allRows(client, "notes");
    expect(notes).toHaveLength(1);
    const markdown = (notes[0].bodyV2 as { markdown: string }).markdown;
    expect(markdown).toContain("← C: is the car free?");
    expect(markdown).toContain("→ A: Sure, the car is free");
  });
});

describe("two writers, ONE note (2026-08-29 — card #593's three-note split)", () => {
  // The wa-lead-relay and this pipe both write the same customer's
  // conversation. They share the day-note identity (title + line format), so
  // whichever lands second must APPEND to the existing note, and lines both
  // producers saw must not duplicate.
  it("the relay's thread note appends to the note this pipe created", async () => {
    const { client, dealId } = await clientWithDeal();
    const filtered = withNoteTitleFilter(client);
    await syncWaMessagesToTwenty(fakeDb([waMessage({ id: "m1", body: "Here is my Emirates ID" })]), "tenant-1", {
      client: filtered,
      readMedia: async () => MEDIA_BYTES,
    });
    const [target] = await allRows(client, "noteTargets");
    const personId = target.targetPersonId as string;

    // The relay's view of the same thread: the message push already filed
    // plus one newer line (it only ever carries INBOUND lines).
    const at2 = new Date(AT.getTime() + 30 * 60_000);
    const relayThread: LeadThread = {
      key: "501234567",
      digits: "971501234567",
      channel: "whatsapp",
      participantName: "Ahmed",
      sourceContext: null,
      contextChannel: null,
      lineSlug: "babek-rent",
      lines: [
        { body: "Here is my Emirates ID", at: AT },
        { body: "and one more question", at: at2 },
      ],
      lastActivityAt: at2,
    };
    const note = buildThreadNote(relayThread, null);
    // Same call the relay's postThreadNote makes.
    const res = await ensureContinuousNote(client, {
      titleFor: (p) => (p <= 1 ? note.title : `${note.title} · #${p}`),
      digits: note.digits,
      lines: note.lines,
      personId,
      opportunityId: dealId,
      commit: true,
    });

    expect(res.created).toBe(false);
    expect(res.appended).toBe(1); // only the genuinely new line
    const notes = await allRows(client, "notes");
    expect(notes).toHaveLength(1);
    const markdown = (notes[0].bodyV2 as { markdown: string }).markdown;
    expect(markdown.split("Here is my Emirates ID").length - 1).toBe(1);
    expect(markdown).toContain("and one more question");
  });

  it("the relay creates the note when it lands FIRST; push then appends to it", async () => {
    const { client, dealId } = await clientWithDeal();
    const filtered = withNoteTitleFilter(client);
    const relayThread: LeadThread = {
      key: "501234567",
      digits: "971501234567",
      channel: "whatsapp",
      participantName: "Ahmed",
      sourceContext: null,
      contextChannel: null,
      lineSlug: "babek-rent",
      lines: [{ body: "Here is my Emirates ID", at: AT }],
      lastActivityAt: AT,
    };
    const note = buildThreadNote(relayThread, null);
    const first = await ensureContinuousNote(client, {
      titleFor: (p) => (p <= 1 ? note.title : `${note.title} · #${p}`),
      digits: note.digits,
      lines: note.lines,
      personId: null,
      opportunityId: dealId,
      commit: true,
    });
    expect(first.created).toBe(true);

    const report = await syncWaMessagesToTwenty(
      fakeDb([
        waMessage({ id: "m1", body: "Here is my Emirates ID" }),
        waMessage({ id: "m2", body: "second message", createdAt: new Date(AT.getTime() + 30 * 60_000) }),
      ]),
      "tenant-1",
      { client: filtered, readMedia: async () => MEDIA_BYTES }
    );

    expect(report).toMatchObject({ notesCreated: 0, notesAppended: 1 });
    const notes = await allRows(client, "notes");
    expect(notes).toHaveLength(1);
    const markdown = (notes[0].bodyV2 as { markdown: string }).markdown;
    expect(markdown.split("Here is my Emirates ID").length - 1).toBe(1);
    expect(markdown).toContain("second message");
  });
});

// Tests for the Bitrix24 → Twenty mirror (Task C): idempotency, cutoff,
// dry-run, crash resume via twenty_mirror_state, and reconcile counts.
// All runs go through the in-memory MOCK TwentyClient — no network.
import { describe, expect, it } from "vitest";
import { createTwentyClient, type TwentyClient } from "./client";
import {
  runMirror,
  planMirrorRecord,
  brandLineForLine,
  brandLineForTenantSlug,
  buildTwentyIndex,
  type MirrorEntity,
  type MirrorSource,
  type MirrorSourceRow,
  type MirrorStateRow,
  type MirrorStateStore,
} from "./mirror";
import { reconcileEntityRows, scanTwentySide } from "./reconcile";

// ─── In-memory fakes for the two narrow DB surfaces ─────────────────────────

class MemSource implements MirrorSource {
  constructor(private data: Record<MirrorEntity, MirrorSourceRow[]>) {
    // The real adapter pages ORDER BY external_id; the fake must match or
    // cursor resume is untestable.
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
  savedSnapshots = 0;
  load(entity: MirrorEntity): Promise<MirrorStateRow | null> {
    return Promise.resolve(this.rows.get(entity) ?? null);
  }
  save(row: MirrorStateRow): Promise<void> {
    this.savedSnapshots++;
    this.rows.set(row.entity, structuredClone(row));
    return Promise.resolve();
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const AFTER_CUTOFF = new Date("2026-08-10T00:00:00Z"); // default cutoff is 2024-01-01

function contact(id: string, over: Partial<MirrorSourceRow> = {}): MirrorSourceRow {
  return {
    externalId: id,
    name: `Person Number${id}`,
    phone: `+9715012345${id.padStart(2, "0")}`,
    email: `person${id}@example.com`,
    source: "whatsapp",
    notes: null,
    modifiedAt: AFTER_CUTOFF,
    ...over,
  };
}

function leadRow(id: string, over: Partial<MirrorSourceRow> = {}): MirrorSourceRow {
  return {
    externalId: id,
    name: `Lead Person${id}`,
    phone: `+9715298765${id.padStart(2, "0")}`,
    email: null,
    status: "new",
    stageDetail: "Новая заявка",
    source: "WEBFORM",
    notes: null,
    modifiedAt: AFTER_CUTOFF,
    ...over,
  };
}

function dealRow(id: string, over: Partial<MirrorSourceRow> = {}): MirrorSourceRow {
  return {
    externalId: id,
    name: `BX-${id} rental`,
    status: "open",
    stage: "quote",
    stageDetail: "КП отправлено",
    value: 50000,
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

async function countObjects(client: TwentyClient, objectPath: string): Promise<number> {
  let n = 0;
  for await (const _row of client.listAll(objectPath)) n++;
  return n;
}

async function allRows(client: TwentyClient, objectPath: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for await (const row of client.listAll<Record<string, unknown>>(objectPath)) out.push(row);
  return out;
}

// The mock seeds 2 people and 0 opportunities.
const SEEDED_PEOPLE = 2;

// ─── Idempotency (acceptance criterion) ─────────────────────────────────────

describe("idempotency", () => {
  it("a second full run creates zero new records", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const state = new MemState();
    const source = sourceOf(
      [contact("101"), contact("102"), contact("103")],
      [leadRow("201"), leadRow("202")],
      [dealRow("301"), dealRow("302")]
    );

    const first = await runMirror(source, state, client, {});
    expect(first.entities.contacts?.created).toBe(3);
    expect(first.entities.leads?.created).toBe(2);
    expect(first.entities.deals?.created).toBe(2);
    expect(await countObjects(client, "people")).toBe(SEEDED_PEOPLE + 5);
    expect(await countObjects(client, "opportunities")).toBe(2);

    // Second run: every entity is "done", so this is a FRESH full pass —
    // the upsert-by-externalId index must turn everything into updates.
    const second = await runMirror(source, state, client, {});
    expect(second.entities.contacts?.created).toBe(0);
    expect(second.entities.leads?.created).toBe(0);
    expect(second.entities.deals?.created).toBe(0);
    expect(second.entities.contacts?.updated).toBe(3);
    expect(second.entities.leads?.updated).toBe(2);
    expect(second.entities.deals?.updated).toBe(2);
    expect(await countObjects(client, "people")).toBe(SEEDED_PEOPLE + 5);
    expect(await countObjects(client, "opportunities")).toBe(2);
  });

  it("a lead and a contact with the SAME phone converge on one Twenty person", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const sharedPhone = "+971507777888";
    const source = sourceOf(
      [contact("401", { phone: sharedPhone })],
      [leadRow("402", { phone: sharedPhone })], // different Bitrix id, same human
      []
    );

    await runMirror(source, new MemState(), client, {});
    // One created by contacts, the lead PATCHES it via the phoneTail9 fallback.
    expect(await countObjects(client, "people")).toBe(SEEDED_PEOPLE + 1);
  });
});

// ─── Cutoff ─────────────────────────────────────────────────────────────────

describe("cutoff", () => {
  it("rows older than `since` are dropped with reason before_cutoff", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const source = sourceOf(
      [
        contact("501", { modifiedAt: new Date("2023-06-01T00:00:00Z") }), // stale (pre-2024 archive)
        contact("502"), // fresh (AFTER_CUTOFF)
      ],
      [],
      []
    );

    const report = await runMirror(source, new MemState(), client, {});
    expect(report.entities.contacts?.read).toBe(2);
    expect(report.entities.contacts?.admitted).toBe(1);
    expect(report.entities.contacts?.dropped.before_cutoff).toBe(1);
    expect(report.entities.contacts?.created).toBe(1);
    expect(await countObjects(client, "people")).toBe(SEEDED_PEOPLE + 1);
  });

  it("a contact with NO activity signal (epoch stamp) is refused, not admitted", () => {
    // The contacts source has no honest date of its own: it borrows activity
    // from the message log and from phone-matched leads, and stamps the epoch
    // when it finds NEITHER. That epoch must land on the refusing side of the
    // gate — this is the whole reason the source does not pass null.
    const planned = planMirrorRecord(
      "contacts",
      contact("601", { modifiedAt: new Date(0) }),
      new Date("2024-01-01T00:00:00Z")
    );
    expect(planned.admitted).toBe(false);
    expect(planned.dropReason).toBe("before_cutoff");
  });

  it("a null modifiedAt is ADMITTED — why the source stamps the epoch instead", () => {
    // record.ts deliberately keeps dateless rows rather than guessing. That is
    // right for Bitrix payloads and wrong for our dateless contacts, so the
    // source must never hand null through for them.
    const planned = planMirrorRecord(
      "contacts",
      contact("602", { modifiedAt: null }),
      new Date("2024-01-01T00:00:00Z")
    );
    expect(planned.admitted).toBe(true);
  });

  it("honors an explicit --since override", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const source = sourceOf([contact("503", { modifiedAt: new Date("2026-07-15T00:00:00Z") })], [], []);
    // With a July cutoff the same row is admitted.
    const report = await runMirror(source, new MemState(), client, {
      since: new Date("2026-07-01T00:00:00Z"),
    });
    expect(report.entities.contacts?.admitted).toBe(1);
    expect(report.entities.contacts?.dropped.before_cutoff ?? 0).toBe(0);
  });
});

// ─── Dry run ────────────────────────────────────────────────────────────────

describe("dryRun", () => {
  it("writes nothing to Twenty and nothing to the state store", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const state = new MemState();
    const source = sourceOf([contact("601"), contact("602")], [], [dealRow("603")]);

    const report = await runMirror(source, state, client, { dryRun: true });

    expect(report.dryRun).toBe(true);
    // Counts describe what WOULD happen…
    expect(report.entities.contacts?.created).toBe(2);
    expect(report.entities.deals?.created).toBe(1);
    // …but nothing moved.
    expect(await countObjects(client, "people")).toBe(SEEDED_PEOPLE);
    expect(await countObjects(client, "opportunities")).toBe(0);
    expect(state.rows.size).toBe(0);
    expect(state.savedSnapshots).toBe(0);
  });
});

// ─── Resume after a crash ───────────────────────────────────────────────────

describe("resume", () => {
  it("resumes from twenty_mirror_state cursor with counts intact", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const state = new MemState();
    const source = sourceOf(
      [contact("1"), contact("2"), contact("3"), contact("4"), contact("5")],
      [],
      []
    );

    // "Crash": maxRecords stops the run mid-entity — state stays "running".
    const crashed = await runMirror(source, state, client, { maxRecords: 2 });
    expect(crashed.entities.contacts?.read).toBe(2);
    expect(crashed.entities.contacts?.created).toBe(2);
    const interrupted = state.rows.get("contacts");
    expect(interrupted?.status).toBe("running");
    expect(interrupted?.cursor).toBe("2");

    // Resume: continues at externalId > "2", carrying the old counts forward.
    const resumed = await runMirror(source, state, client, {});
    expect(resumed.entities.contacts?.read).toBe(5); // 2 (restored) + 3 (new)
    expect(resumed.entities.contacts?.created).toBe(5);
    expect(state.rows.get("contacts")?.status).toBe("done");

    // Exactly five mirrored people, no duplicates by externalId.
    const people = await allRows(client, "people");
    const mirrored = people.filter((p) => typeof p.externalId === "string");
    expect(mirrored).toHaveLength(5);
    expect(new Set(mirrored.map((p) => p.externalId)).size).toBe(5);
  });
});

// ─── Reconcile ──────────────────────────────────────────────────────────────

describe("reconcile", () => {
  it("reports per-entity counts against Twenty after a mirror run", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const contacts = [contact("701"), contact("702")];
    const leads = [leadRow("801")];
    const deals = [dealRow("901"), dealRow("902")];
    await runMirror(sourceOf(contacts, leads, deals), new MemState(), client, {});

    const twenty = await scanTwentySide(client);
    expect(twenty.contacts.count).toBe(2);
    expect(twenty.leads.count).toBe(1);
    expect(twenty.deals.count).toBe(2);

    const contactLine = reconcileEntityRows("contacts", contacts, twenty.contacts);
    expect(contactLine.sourceRows).toBe(2);
    expect(contactLine.admitted).toBe(2);
    expect(contactLine.inTwenty).toBe(2);
    expect(contactLine.alreadyMirrored).toBe(2);
    expect(contactLine.pending).toBe(0);

    // One deal is deliberately NOT in Twenty (mirror backlog).
    const dealLine = reconcileEntityRows("deals", [...deals, dealRow("903")], twenty.deals);
    expect(dealLine.admitted).toBe(3);
    expect(dealLine.alreadyMirrored).toBe(2);
    expect(dealLine.pending).toBe(1);
  });

  it("surfaces normalize verdicts: junk phone and before-cutoff rows", () => {
    const rows = [
      contact("711", { phone: "123" }), // too short to be a number
      contact("712", { modifiedAt: new Date("2020-01-01T00:00:00Z") }), // stale
      contact("713"),
    ];
    const line = reconcileEntityRows("contacts", rows, { externalIds: new Set(), count: 0 });
    expect(line.sourceRows).toBe(3);
    expect(line.admitted).toBe(2); // stale row refused, junk-phone row admitted
    expect(line.dropped.before_cutoff).toBe(1);
    expect(line.verdicts["phone:too_short"]).toBe(1);
    expect(line.pending).toBe(2); // nothing in Twenty yet
  });
});

// ─── Mapping details ────────────────────────────────────────────────────────

describe("planMirrorRecord mapping", () => {
  it("maps deal status/stage onto the live workspace's opportunity stages", () => {
    const since = new Date("2026-08-01T00:00:00Z");
    const stageOf = (over: Partial<MirrorSourceRow>) =>
      planMirrorRecord("deals", dealRow("1", over), since).payload.stage;

    expect(stageOf({ status: "won" })).toBe("CUSTOMER");
    expect(stageOf({ status: "won", stage: "inquiry" })).toBe("CUSTOMER");
    expect(stageOf({ status: "open", stage: "inquiry", stageDetail: null })).toBe("NEW");
    expect(stageOf({ status: "open", stage: "quote", stageDetail: null })).toBe("SCREENING");
    expect(stageOf({ status: "open", stage: "contract", stageDetail: null })).toBe("MEETING");
    expect(stageOf({ status: "open", stage: "handover", stageDetail: null })).toBe("PROPOSAL");
    // Fine-grained Bitrix stage name beats the coarse column.
    expect(stageOf({ status: "open", stage: "inquiry", stageDetail: "Договор подписан" })).toBe(
      "PROPOSAL"
    );
  });

  it("puts dead deals in LOST, never back at the top of the funnel", () => {
    // Before the Lost column existed these were omitted, and Twenty's default
    // presented 58,259 long-dead deals to the team as "New".
    const since = new Date("2024-01-01T00:00:00Z");
    const overs: Partial<MirrorSourceRow>[] = [
      { status: "lost" },
      { status: "lost", stage: "closed" },
      // Closed without a terminal status: the work stopped, so it is not a
      // CUSTOMER (that would fabricate revenue) and not NEW either.
      { status: "open", stage: "closed", stageDetail: null },
    ];
    for (const over of overs) {
      const payload = planMirrorRecord("deals", dealRow("1", over), since).payload;
      expect(payload.stage).toBe("LOST");
    }
  });

  it("writes lead stageDetail and the lead:bitrix24 source tag", () => {
    const planned = planMirrorRecord(
      "leads",
      leadRow("42", { stageDetail: "Качественный лид" }),
      new Date("2026-08-01T00:00:00Z")
    );
    expect(planned.payload.externalSource).toBe("lead:bitrix24");
    expect(planned.payload.stageDetail).toBe("Качественный лид");
    expect(planned.phoneTail9).toBe("529876542"); // last 9 digits of +971529876542
  });

  it("hands Twenty the calling code SEPARATELY from the national number", () => {
    // Live failure, 2026-08-01: non-AE numbers went out as full international
    // digits in the number field; Twenty's libphonenumber refused 2,209 of
    // them outright ("Provided phone number is invalid 201060622228").
    const planned = planMirrorRecord(
      "contacts",
      contact("80", { phone: "+201060622228" }),
      new Date("2024-01-01T00:00:00Z")
    );
    expect(planned.payload.phones).toMatchObject({
      primaryPhoneNumber: "1060622228",
      primaryPhoneCallingCode: "+20",
      primaryPhoneCountryCode: "EG",
    });
  });

  it("carries numbers whose country code our old table could not split", () => {
    // Turkey was one of 793 numbers the 2026-08-02 leads run could not split
    // and Twenty rejected outright.
    const planned = planMirrorRecord(
      "contacts",
      contact("81", { phone: "+905534862145" }),
      new Date("2024-01-01T00:00:00Z")
    );
    expect(planned.payload.phones).toMatchObject({
      primaryPhoneNumber: "5534862145",
      primaryPhoneCallingCode: "+90",
      primaryPhoneCountryCode: "TR",
    });
  });

  it("never labels a nameless record 'Unknown' — falls back to phone/id", () => {
    const planned = planMirrorRecord(
      "contacts",
      contact("77", { name: null, email: null }),
      new Date("2026-08-01T00:00:00Z")
    );
    const name = planned.payload.name as { firstName: string };
    expect(name.firstName).not.toMatch(/unknown/i);
    expect(planned.verdictKeys).toContain("empty_name");
  });
});

// ─── Admission refusal: no identity ─────────────────────────────────────────

describe("no_identity", () => {
  it("drops a contact with neither a name nor a usable phone", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const source = sourceOf(
      [
        contact("901", { name: null, phone: null, email: null }), // no identity at all
        contact("902", { name: null, email: null, phone: "+971509999888" }), // no name, valid phone — passes
        contact("903", { phone: null }), // name, no phone — passes
      ],
      [],
      []
    );

    const report = await runMirror(source, new MemState(), client, {});
    expect(report.entities.contacts?.read).toBe(3);
    expect(report.entities.contacts?.admitted).toBe(2);
    expect(report.entities.contacts?.dropped.no_identity).toBe(1);
    expect(report.entities.contacts?.created).toBe(2);
    expect(await countObjects(client, "people")).toBe(SEEDED_PEOPLE + 2);
  });

  it("drops a lead with neither a name nor a usable phone", () => {
    const planned = planMirrorRecord(
      "leads",
      leadRow("41", { name: null, phone: null, stageDetail: null }),
      new Date("2026-08-01T00:00:00Z")
    );
    expect(planned.admitted).toBe(false);
    expect(planned.dropReason).toBe("no_identity");
  });
});

// ─── Within-run dedupe (index feedback after create) ────────────────────────

describe("within-run dedupe", () => {
  it("a poisoned batch does not misalign index registration — no duplicates later in the run", async () => {
    const base = createTwentyClient({ mode: "mock" });
    // Contact 2 is poisoned: any batch containing it is rejected, so the run
    // drops into the per-record fallback where the poisoned record fails
    // alone. The OLD registration code matched batch echoes to creates by
    // POSITION, so contact 3's id landed under contact 2's keys and contact 3
    // itself became unfindable — the lead below then duplicated it.
    const client: TwentyClient = {
      ...base,
      batchCreate: <T,>(objectPath: string, records: Record<string, unknown>[]): Promise<T[]> => {
        if (records.some((r) => r.externalId === "contact:2")) {
          return Promise.reject(new Error('Invalid value "xxx" for field "phones"'));
        }
        return base.batchCreate<T>(objectPath, records);
      },
    };
    const sharedPhone = "+971507777888";
    const source = sourceOf(
      [contact("1"), contact("2"), contact("3", { phone: sharedPhone })],
      [leadRow("9", { phone: sharedPhone })], // same person as contact 3, later pass
      []
    );

    const report = await runMirror(source, new MemState(), client, {});
    expect(report.entities.contacts?.failed).toBe(1);
    expect(report.entities.contacts?.created).toBe(2);
    // The lead must PATCH the person contact 3 just created.
    expect(report.entities.leads?.created).toBe(0);
    expect(report.entities.leads?.updated).toBe(1);
    expect(await countObjects(client, "people")).toBe(SEEDED_PEOPLE + 2);
  });
});

// ─── Twenty-side index ──────────────────────────────────────────────────────

describe("buildTwentyIndex", () => {
  it("excludes soft-deleted Twenty records (deletedAt) from the upsert index", async () => {
    const base = createTwentyClient({ mode: "mock" });
    const rows: Record<string, unknown>[] = [
      { id: "alive-1", externalId: "contact:1", phoneTail9: "501111111", deletedAt: null },
      {
        id: "dead-1",
        externalId: "contact:2",
        phoneTail9: "502222222",
        deletedAt: "2026-07-01T00:00:00.000Z",
      },
    ];
    const client: TwentyClient = {
      ...base,
      listAll: async function* <T,>(): AsyncGenerator<T, void, unknown> {
        for (const row of rows) yield row as T;
      },
    };

    const index = await buildTwentyIndex(client, "people");
    expect(index.byExternalId.get("contact:1")).toBe("alive-1");
    expect(index.byExternalId.has("contact:2")).toBe(false);
    expect(index.byPhoneTail9.get("501111111")).toBe("alive-1");
    expect(index.byPhoneTail9.has("502222222")).toBe(false);
  });
});

// ─── Brand line (who-sees-what) ─────────────────────────────────────────────

describe("brandLine", () => {
  it("maps each Bitrix portal to its business line", () => {
    expect(brandLineForTenantSlug("take-auto")).toBe("takeauto");
    expect(brandLineForTenantSlug("cardiwan")).toBe("cardiwan");
    expect(brandLineForTenantSlug("easyrent")).toBe("easyrent");
    // ETM is the legal entity behind the EasyRent brand, not a company of
    // its own — its records belong to easyrent.
    expect(brandLineForTenantSlug("etm")).toBe("easyrent");
  });

  it("refuses to guess a line for an unknown tenant", () => {
    // Fails CLOSED: a brand-less record is visible only to Executive, which is
    // the safe direction. Guessing would leak a rental client into sales.
    expect(brandLineForTenantSlug("unknown-portal")).toBeNull();
    expect(brandLineForTenantSlug(null)).toBeNull();
    expect(brandLineForTenantSlug(undefined)).toBeNull();
  });

  it("stamps the line onto people and opportunities", () => {
    const person = planMirrorRecord(
      "contacts",
      contact("90", { brandLine: "cardiwan" }),
      new Date("2024-01-01T00:00:00Z")
    );
    expect(person.payload.brandLine).toBe("cardiwan");

    const opp = planMirrorRecord(
      "deals",
      dealRow("91", { brandLine: "easyrent" }),
      new Date("2024-01-01T00:00:00Z")
    );
    expect(opp.payload.brandLine).toBe("easyrent");
  });

  it("OMITS the field when the line is unknown — never blanks it", () => {
    // An empty string would match no predicate AND wipe a value set by hand.
    const planned = planMirrorRecord(
      "contacts",
      contact("92", { brandLine: null }),
      new Date("2024-01-01T00:00:00Z")
    );
    expect(planned.payload).not.toHaveProperty("brandLine");
  });
});

// ─── Failure accounting ─────────────────────────────────────────────────────

describe("failedReasons", () => {
  it("tallies rejections by kind instead of keeping only the first", async () => {
    // firstError is set ONCE and survives a resume, so a run can collect
    // hundreds of new failures while still showing a stale message from hours
    // earlier. That is exactly what hid the cause of 222 rejections on the
    // 2026-08-02 leads run.
    const client = createTwentyClient({ mode: "mock" });
    const realCreate = client.batchCreate.bind(client);
    let n = 0;
    client.batchCreate = async (path: string, payloads: Record<string, unknown>[]) => {
      // Reject every odd record with a Twenty-shaped validation error.
      if (path === "people" && payloads.length === 1 && n++ % 2 === 0) {
        throw new Error(
          `Twenty POST batch/people HTTP 400: {"statusCode":400,"messages":["Provided phone number is invalid 971500000${n}"],"code":"INVALID_PHONE_NUMBER"}`
        );
      }
      if (path === "people" && payloads.length > 1) throw new Error("batch poisoned");
      return realCreate(path, payloads);
    };

    const report = await runMirror(
      sourceOf([contact("901"), contact("902"), contact("903"), contact("904")], [], []),
      new MemState(),
      client,
      {}
    );

    const reasons = report.entities.contacts?.failedReasons ?? {};
    // The per-record phone number is stripped, so every rejection of the same
    // kind collapses onto ONE line with a count.
    expect(Object.keys(reasons)).toEqual([
      "create/INVALID_PHONE_NUMBER: Provided phone number is invalid <number>",
    ]);
    expect(Object.values(reasons)[0]).toBe(report.entities.contacts?.failed);
    expect(report.entities.contacts?.failed).toBeGreaterThan(1);
  });
});

// ─── Cross-brand collisions ─────────────────────────────────────────────────

describe("brand-scoped phone matching", () => {
  it("a lead from another brand does NOT patch — and re-brand — an existing person", async () => {
    // The three portals share 1,346 phone numbers. Workspace-wide matching
    // would make a Cardiwan lead take over the take-auto person of the same
    // number and re-brand it, deleting that client from the sales team's
    // world without a trace.
    const client = createTwentyClient({ mode: "mock" });
    const sharedPhone = "+971509998877";

    await runMirror(
      sourceOf([contact("801", { phone: sharedPhone, brandLine: "takeauto" })], [], []),
      new MemState(),
      client,
      { brandLine: "takeauto" }
    );
    const after1 = await allRows(client, "people");
    const sales = after1.find((p) => (p.externalId as string) === "takeauto/contact:801");
    expect(sales?.brandLine).toBe("takeauto");

    // Same human, different portal.
    await runMirror(
      sourceOf([], [leadRow("802", { phone: sharedPhone, brandLine: "cardiwan" })], []),
      new MemState(),
      client,
      { brandLine: "cardiwan" }
    );

    const after2 = await allRows(client, "people");
    const stillSales = after2.find((p) => (p.externalId as string) === "takeauto/contact:801");
    const rental = after2.find((p) => (p.externalId as string) === "cardiwan/lead:802");

    // The sales record is untouched…
    expect(stillSales?.brandLine).toBe("takeauto");
    // …and the rental side got its OWN record rather than stealing that one.
    expect(rental).toBeDefined();
    expect(rental?.brandLine).toBe("cardiwan");
    expect(rental?.id).not.toBe(stillSales?.id);
  });

  it("within one brand, the same phone still converges on one person", async () => {
    const client = createTwentyClient({ mode: "mock" });
    const phone = "+971501112233";
    await runMirror(
      sourceOf(
        [contact("803", { phone, brandLine: "takeauto" })],
        [leadRow("804", { phone, brandLine: "takeauto" })],
        []
      ),
      new MemState(),
      client,
      { brandLine: "takeauto" }
    );
    expect(await countObjects(client, "people")).toBe(SEEDED_PEOPLE + 1);
  });
});

describe("externalId carries the brand", () => {
  it("the same Bitrix id in two portals produces two different keys", () => {
    // Each portal numbers its records from scratch: contact 12345 exists in
    // all three and means three different people. Measured 2026-08-03 against
    // the ids already in Twenty, 71% of Cardiwan's contacts and 93% of
    // EasyRent's collide with take-auto — without the brand in the key,
    // mirroring rental would have hijacked 21,632 sales contacts and reported
    // it as "updated".
    const sales = planMirrorRecord(
      "contacts",
      contact("12345", { brandLine: "takeauto" }),
      new Date("2024-01-01T00:00:00Z")
    );
    const rental = planMirrorRecord(
      "contacts",
      contact("12345", { brandLine: "cardiwan" }),
      new Date("2024-01-01T00:00:00Z")
    );
    expect(sales.externalId).toBe("takeauto/contact:12345");
    expect(rental.externalId).toBe("cardiwan/contact:12345");
    expect(sales.externalId).not.toBe(rental.externalId);
  });

  it("keeps the entity namespace inside the brand", () => {
    // The original collision this key solved: a lead and a contact sharing a
    // Bitrix id. Adding the brand must not lose that.
    const asContact = planMirrorRecord(
      "contacts",
      contact("77", { brandLine: "cardiwan" }),
      new Date("2024-01-01T00:00:00Z")
    );
    const asLead = planMirrorRecord(
      "leads",
      leadRow("77", { brandLine: "cardiwan" }),
      new Date("2024-01-01T00:00:00Z")
    );
    expect(asContact.externalId).toBe("cardiwan/contact:77");
    expect(asLead.externalId).toBe("cardiwan/lead:77");
  });
});

// A line can sit on one tenant while belonging to another BRAND. Owner,
// 2026-08-31: "Ali is CARDIWAN, he is not easyrent". His line's slug
// (babek-rent-2) and its tenant (easyrent) are both historical accidents of
// which handset was paired when; moving the tenant would make the importer
// re-file 8063 archived messages as new rows, so the brand is overridden here
// instead — the card gets the right brand, the archive stays put.
describe("brandLineForLine — the line can override its tenant's brand", () => {
  it("files Ali's line under Cardiwan despite the easyrent tenant", () => {
    expect(brandLineForLine("babek-rent-2", "easyrent")).toBe("cardiwan");
  });

  it("leaves Babek's own lines on EasyRent", () => {
    expect(brandLineForLine("babek-rent", "easyrent")).toBe("easyrent");
    expect(brandLineForLine("babek-rent-3", "easyrent")).toBe("easyrent");
  });

  it("falls back to the tenant for every unlisted line", () => {
    expect(brandLineForLine("cardiwan", "cardiwan")).toBe("cardiwan");
    expect(brandLineForLine("azat-takeauto", "take-auto")).toBe("takeauto");
    expect(brandLineForLine(null, "easyrent")).toBe("easyrent");
    expect(brandLineForLine("unknown-line", "easyrent")).toBe("easyrent");
  });

  it("an unknown tenant still mirrors without a brand", () => {
    expect(brandLineForLine(null, "nope")).toBeNull();
  });
});

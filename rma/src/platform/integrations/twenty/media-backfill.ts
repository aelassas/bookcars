/**
 * media-backfill.ts — replay WhatsApp history onto Twenty cards.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * The projector (push-message.ts) drops a message as `noPerson` when the
 * number matches nobody in Twenty AT SYNC TIME, and the checkpoint then moves
 * past it forever. A customer whose card was created later (person "Sheraz",
 * created 2026-08-21 08:31; his "7th September - 14th september" messages
 * from before that) therefore has no conversation on the card even though the
 * person exists NOW.
 *
 * ── TWO MODES ───────────────────────────────────────────────────────────────
 * attach-only (createNotes OFF): walks MEDIA rows only; for each, finds the
 * note the message belongs to — the aggregated (person, day) note first,
 * then the legacy per-message note (pre-2026-08-21 shape) — and attaches the
 * file to it (+ person + deal). Never creates a note.
 *
 * --create-notes: walks EVERY WhatsApp row with a body (parity with the
 * projector) and replays the conversation into the AGGREGATED day notes —
 * the same (person, day) shape the live sync writes, via the same
 * ensureDayNote() (see day-note.ts). A message that already has a LEGACY
 * per-message note is counted alreadyProjected and left alone (its media
 * still attaches, onto the legacy note). Voice rows contribute their
 * transcript line; the audio file itself attaches too (kind policy governs
 * attachments only; video stays skipped). People are NEVER created: no
 * person match → skipped, one in-memory index lookup, zero HTTP.
 *
 * Dedupe: note identity is the exact title (day-note.ts documents why the
 * phone is in it); append skips lines already present, so a re-run over the
 * same range re-reads but does not duplicate; attachments are checked by
 * name+person before upload.
 */
import { and, asc, eq, gt, isNotNull, sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { message, twentyMirrorState } from "@/platform/db/schema";
import { getTwentyClientForTenantSlug, type TwentyClient } from "./client";
import { fetchOpportunitiesForTails } from "./deal-link";
import {
  dayHeader,
  dayKey,
  ensureWaNote,
  filterSafe,
  findNoteByTitle,
  messageNoteLine,
  waNoteTitle,
} from "./day-note";
import { brandLineForTenantSlug, buildTwentyIndex } from "./mirror";
import {
  attachWaMediaToTwenty,
  classifyWaMedia,
  mediaFileName,
  type MediaReader,
} from "./media-attachment";
import { noteTitle, waCustomerDigits, waCustomerTail } from "./push-message";

const ENTITY = "wa_media_backfill";

type PlatformDb = typeof platformDb;

export interface MediaBackfillReport {
  tenant: string;
  mode: "COMMIT" | "DRY-RUN";
  read: number;
  noPerson: number;
  /** Messages the OLD projector already wrote (legacy per-message note found). */
  alreadyProjected: number;
  /** Message lines added to aggregated day notes (dry run: would add). */
  linesWritten: number;
  /** Aggregated day notes created by this run (dry run: would create). */
  notesCreated: number;
  /** Existing day notes this run appended new lines to. */
  notesAppended: number;
  /** Attach-only mode: media row whose note exists in NEITHER title format. */
  noNote: number;
  /** Rows carrying media the kind policy never uploads (video/unknown/disk-gone). */
  skippedKind: number;
  alreadyAttached: number;
  attached: number;
  failed: number;
  firstError?: string;
  since?: string;
  upto?: string;
}

async function loadCheckpoint(db: PlatformDb, tenantId: string): Promise<Date | null> {
  const [row] = await db
    .select({ counts: twentyMirrorState.counts })
    .from(twentyMirrorState)
    .where(and(eq(twentyMirrorState.tenantId, tenantId), eq(twentyMirrorState.entity, ENTITY)))
    .limit(1);
  const ts = (row?.counts as { checkpoint?: string } | undefined)?.checkpoint;
  return ts ? new Date(ts) : null;
}

async function saveCheckpoint(db: PlatformDb, tenantId: string, at: Date): Promise<void> {
  await db.execute(sql`
    INSERT INTO twenty_mirror_state (tenant_id, entity, cursor, counts, status, updated_at)
    VALUES (${tenantId}, ${ENTITY}, '', ${JSON.stringify({ checkpoint: at.toISOString() })}::jsonb, 'running', now())
    ON CONFLICT (tenant_id, entity)
    DO UPDATE SET counts = ${JSON.stringify({ checkpoint: at.toISOString() })}::jsonb, updated_at = now()
  `);
}

type MessageRow = {
  id: string;
  direction: string | null;
  from: string | null;
  fromPn: string | null;
  to: string | null;
  customerName: string | null;
  body: string | null;
  mediaPath: string | null;
  createdAt: Date;
};

export async function backfillWaMediaToTwenty(
  db: PlatformDb,
  tenantId: string,
  slug: string,
  opts: {
    since: Date;
    max: number;
    commit: boolean;
    /** Replay the full conversation into aggregated day notes (not just media). */
    createNotes?: boolean;
    client?: TwentyClient;
    /** Test seam — defaults to reading WA_MEDIA_ROOT from disk. */
    readMedia?: MediaReader;
  }
): Promise<MediaBackfillReport> {
  const client = opts.client ?? getTwentyClientForTenantSlug(slug);
  const createNotes = opts.createNotes ?? false;
  const report: MediaBackfillReport = {
    tenant: slug,
    mode: opts.commit ? "COMMIT" : "DRY-RUN",
    read: 0,
    noPerson: 0,
    alreadyProjected: 0,
    linesWritten: 0,
    notesCreated: 0,
    notesAppended: 0,
    noNote: 0,
    skippedKind: 0,
    alreadyAttached: 0,
    attached: 0,
    failed: 0,
  };

  // A committed run checkpoints itself; the next run resumes from there.
  // --since only sets the floor for a tenant's FIRST run.
  const checkpoint = await loadCheckpoint(db, tenantId);
  const since = checkpoint ?? opts.since;

  const rows: MessageRow[] = await db
    .select({
      id: message.id,
      direction: message.direction,
      from: message.from,
      fromPn: message.fromPn,
      to: message.to,
      customerName: message.customerName,
      body: message.body,
      mediaPath: message.mediaPath,
      createdAt: message.createdAt,
    })
    .from(message)
    .where(
      and(
        eq(message.tenantId, tenantId),
        eq(message.channel, "whatsapp"),
        gt(message.createdAt, since),
        isNotNull(message.body),
        // Attach-only mode walks media rows alone. With createNotes the owner
        // wants the ENTIRE conversation replayed — parity with
        // syncWaMessagesToTwenty, which projects ANY row with a body.
        ...(createNotes ? [] : [isNotNull(message.mediaPath)])
      )
    )
    .orderBy(asc(message.createdAt))
    .limit(opts.max);

  if (rows.length === 0) return { ...report, since: since.toISOString() };

  const peopleIndex = await buildTwentyIndex(client, "people");
  const dealIndex = await fetchOpportunitiesForTails(
    client,
    rows.map(waCustomerTail).filter((t): t is string => t !== null),
    brandLineForTenantSlug(slug)
  );

  /** Attach one row's media to a note + person (+ deal), with name dedupe. */
  const attachRow = async (
    m: MessageRow,
    personId: string,
    dealId: string | null,
    noteId: string | null
  ): Promise<void> => {
    const name = mediaFileName(m.mediaPath as string);
    const existing = await client.get("attachments", {
      filter: `name[eq]:"${filterSafe(name)}",targetPersonId[eq]:"${personId}"`,
      limit: 1,
    });
    const data = (existing as { data?: Record<string, unknown> })?.data ?? {};
    if (Object.values(data).some((v) => Array.isArray(v) && v.length > 0)) {
      report.alreadyAttached++;
      return;
    }
    if (!opts.commit) {
      report.attached++; // dry run: would attach
      return;
    }
    const res = await attachWaMediaToTwenty(client, {
      mediaPath: m.mediaPath as string,
      personId,
      opportunityId: dealId,
      noteId,
      readMedia: opts.readMedia,
    });
    if (res.attached) report.attached++;
    else report.skippedKind++; // e.g. file vanished from disk since import
  };

  // ── Attach-only mode: media rows onto notes that already exist ────────────
  if (!createNotes) {
    for (const m of rows) {
      report.read++;
      if (!m.mediaPath || classifyWaMedia(m.mediaPath) !== "upload") {
        report.skippedKind++;
        continue;
      }
      const tail = waCustomerTail(m);
      const personId = tail ? peopleIndex.byPhoneTail9.get(tail) : undefined;
      if (!personId) {
        report.noPerson++;
        continue;
      }
      try {
        // The note the file belongs ON: the aggregated day note (new shape)
        // first, then the legacy per-message note the pre-aggregation
        // projector wrote. Neither → the projector never projected this
        // message and the file stays on disk.
        // Part 1 is the note that exists for anyone who has one at all; a
        // rollover customer may carry this row's LINE in a later part, but the
        // attachment's identity comes from person+deal+basename, so filing it
        // against part 1 costs nothing but the anchor it renders under.
        const note =
          (await findNoteByTitle(client, waNoteTitle(waCustomerDigits(m)))) ??
          (await findNoteByTitle(client, noteTitle(m.direction ?? "inbound", m.customerName, m.createdAt)));
        if (!note) {
          report.noNote++;
          continue;
        }
        const deal = tail ? dealIndex.get(tail) : undefined;
        await attachRow(m, personId, deal?.id ?? null, note.id);
      } catch (e) {
        report.failed++;
        report.firstError ??= `${m.id}: ${(e as Error).message.slice(0, 160)}`;
      }
    }
    const last = rows[rows.length - 1];
    if (opts.commit && last) await saveCheckpoint(db, tenantId, last.createdAt);
    return { ...report, since: since.toISOString(), upto: last?.createdAt.toISOString() };
  }

  // ── createNotes mode: replay the full conversation into day notes ─────────
  interface DayGroup {
    personId: string;
    dealId: string | null;
    digits: string;
    rows: MessageRow[];
  }
  const groups = new Map<string, DayGroup>();

  for (const m of rows) {
    report.read++;
    const tail = waCustomerTail(m);
    const personId = tail ? peopleIndex.byPhoneTail9.get(tail) : undefined;
    if (!personId) {
      report.noPerson++;
      continue;
    }
    const deal = tail ? dealIndex.get(tail) : undefined;
    try {
      // Already written by the OLD per-message projector? Then the line must
      // NOT be replayed into the day note (the card would show it twice) —
      // but its media may still be missing, and it belongs on that note.
      const legacy = await findNoteByTitle(
        client,
        noteTitle(m.direction ?? "inbound", m.customerName, m.createdAt)
      );
      if (legacy) {
        report.alreadyProjected++;
        if (m.mediaPath && classifyWaMedia(m.mediaPath) === "upload") {
          await attachRow(m, personId, deal?.id ?? null, legacy.id);
        }
        continue;
      }
      const key = personId; // continuous note per customer (2026-08-26)
      let g = groups.get(key);
      if (!g) {
        g = { personId, dealId: deal?.id ?? null, digits: waCustomerDigits(m), rows: [] };
        groups.set(key, g);
      }
      g.rows.push(m);
    } catch (e) {
      report.failed++;
      report.firstError ??= `${m.id}: ${(e as Error).message.slice(0, 160)}`;
    }
  }

  for (const g of groups.values()) {
    const ordered = [...g.rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const lines: string[] = [];
    let lastDay = "";
    for (const m of ordered) {
      const day = dayKey(m.createdAt);
      if (day !== lastDay) {
        lines.push(dayHeader(m.createdAt));
        lastDay = day;
      }
      const line = messageNoteLine(m);
      if (line) lines.push(line);
    }
    try {
      const note = await ensureWaNote(client, {
        lines,
        digits: g.digits,
        personId: g.personId,
        opportunityId: g.dealId,
        commit: opts.commit,
      });
      if (note.created) report.notesCreated++;
      else if (note.appended > 0) report.notesAppended++;
      report.linesWritten += g.rows.length;
      for (const m of g.rows) {
        if (!m.mediaPath) continue;
        if (classifyWaMedia(m.mediaPath) !== "upload") {
          report.skippedKind++; // video/unknown: line landed, file stays on disk
          continue;
        }
        await attachRow(m, g.personId, g.dealId, note.noteId);
      }
    } catch (e) {
      report.failed += g.rows.length;
      report.firstError ??= `${g.rows[0].id}: ${(e as Error).message.slice(0, 160)}`;
    }
  }

  const last = rows[rows.length - 1];
  if (opts.commit && last) await saveCheckpoint(db, tenantId, last.createdAt);
  return { ...report, since: since.toISOString(), upto: last?.createdAt.toISOString() };
}

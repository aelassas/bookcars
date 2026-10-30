import { and, asc, eq, gt, isNotNull, ne, sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { message, tenant, twentyMirrorState } from "@/platform/db/schema";
import { normalizePhone, MIN_PHONE_MATCH_DIGITS, phoneFromPhoneJid, PG_NON_DIGIT_RE } from "@/platform/messaging/phone";
import { getTwentyClientForTenantSlug, type TwentyClient } from "./client";
import { fetchOpportunitiesForTails } from "./deal-link";
import { dayHeader, dayKey, ensureWaNote, messageNoteLine, noteLine } from "./day-note";
import { resolveOwnerForLine, resolveOwnerForPhone } from "@/modules/board/owners";
import { brandLineForTenantSlug, buildTwentyIndex } from "./mirror";
import { attachWaMediaToTwenty, type MediaReader } from "./media-attachment";
import { formatDateTime } from "@/lib/format";

/**
 * WhatsApp → Twenty activity pipe (the last open wiring gap from the audit:
 * a person in Twenty saw no chat history).
 *
 * Deliberately NOT in the send path: this is a heartbeat-side sync that reads
 * our own `message` table (both directions) and projects each row into a
 * Twenty note linked to the matched person. Twenty being down/slow therefore
 * can never affect WhatsApp delivery — it only delays this projection.
 * Idempotency comes from a checkpoint in twenty_mirror_state (entity
 * "wa_messages") written AFTER each successful batch, plus the per-run
 * people index (phoneTail9 → person id) shared with the mirror.
 *
 * Since 2026-08-21 the projection is AGGREGATED: one note per (person,
 * calendar day) — see day-note.ts for the title format and the line-level
 * idempotency rule. A crash between a note append and the checkpoint save
 * can re-walk rows on the next pass; already-present lines are skipped, so
 * the residue is a re-read, not a duplicated conversation.
 *
 * Media: a row with media_path ("wa/<line>/<file>", observer-downloaded
 * document photos and voice notes) ALSO gets the file uploaded and filed as
 * a Twenty attachment on the same person/deal AND on the day's note — after
 * the note succeeds, never instead of it. Videos are skipped on purpose
 * (see media-attachment.ts).
 */

const ENTITY = "wa_messages";
const PAGE = 50;

type PlatformDb = typeof platformDb;

export interface WaSyncReport {
  read: number;
  /** Message lines that landed on a day note (dry run: would land). */
  messagesProjected: number;
  noPerson: number;
  /** Projected messages whose number ALSO matched an opportunity. */
  linkedToDeal: number;
  /** Projected messages whose number matched a person but no deal. */
  noDeal: number;
  /** Aggregated (person, day) notes created this run. */
  notesCreated: number;
  /** Existing day notes this run appended new lines to. */
  notesAppended: number;
  /** Media files uploaded and attached beside the note. */
  mediaAttached: number;
  /** Media that SHOULD have attached but the Twenty side failed. */
  mediaFailed: number;
  failed: number;
  firstError?: string;
  mediaFirstError?: string;
  checkpoint?: string;
  skipped?: string;
}

// LEGACY per-message title (pre-2026-08-21 shape). The live sync no longer
// writes these — notes are aggregated per (person, day), see day-note.ts —
// but the backfill still looks notes up by this exact format to recognize
// messages the projector wrote before the aggregation shipped.
export function noteTitle(direction: string, name: string | null, at: Date): string {
  const arrow = direction === "outbound" ? "→" : "←";
  const who = name ?? "клиент";
  return `WhatsApp ${arrow} ${who} · ${formatDateTime(at)}`;
}

/**
 * The customer number behind a message — decides both the person lookup and
 * which deals are worth asking Twenty about. Group rows (@g.us) name the ROOM
 * in from/to, not the customer: their only honest number is the participant
 * phone (from_pn), and a group row without one has no customer to file under.
 * Module-level and exported: the projector and the media backfill must key on
 * the SAME number or they file under different people.
 */
/**
 * The raw customer contact behind a message, normalized to digits — the
 * same selection rule as waCustomerTail (inbound sender / outbound
 * recipient / group participant), but unshortened: the note body's
 * WhatsApp deep link needs the full number, not the 9-digit tail.
 */
export function waCustomerDigits(m: {
  direction: string | null;
  to: string | null;
  from: string | null;
  fromPn: string | null;
}): string {
  const from = m.from ?? "";
  const group = from.endsWith("@g.us") || (m.to ?? "").endsWith("@g.us");
  const raw = m.direction === "outbound" ? (group ? null : m.to) : group ? m.fromPn : (m.fromPn ?? m.from);
  let digits = normalizePhone(raw);
  if (m.direction === "outbound" && !group && digits.length < MIN_PHONE_MATCH_DIGITS) {
    // Rows imported before 2026-08-22 stored the BRAND SLUG in `to`
    // ("cardiwan") — no digits at all. The remoteJid in `from` still
    // identifies the customer when it is a plain phone JID. A @lid must
    // NEVER produce a tail here: a lid is not a phone (normalizePhone would
    // happily strip it to 15 garbage digits).
    digits = phoneFromPhoneJid(m.from) ?? digits;
  }
  return digits;
}

export function waCustomerTail(m: {
  direction: string | null;
  to: string | null;
  from: string | null;
  fromPn: string | null;
}): string | null {
  const digits = waCustomerDigits(m);
  return digits.length < MIN_PHONE_MATCH_DIGITS ? null : digits.slice(-MIN_PHONE_MATCH_DIGITS);
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

export async function syncWaMessagesToTwenty(
  db: PlatformDb,
  tenantId: string,
  opts: {
    client?: TwentyClient;
    sinceDays?: number;
    dryRun?: boolean;
    maxMessages?: number;
    /** Test seam — defaults to reading WA_MEDIA_ROOT from disk. */
    readMedia?: MediaReader;
  } = {}
): Promise<WaSyncReport> {
  // The tenant decides WHICH Twenty deployment this projection targets —
  // rental brands live on a different instance with a different key. A
  // single shared client is how rental WhatsApp was looked up against the
  // sales workspace, matched nobody, and was dropped as `noPerson`.
  const [t] = await db.select({ slug: tenant.slug }).from(tenant).where(eq(tenant.id, tenantId)).limit(1);
  const client = opts.client ?? getTwentyClientForTenantSlug(t?.slug);
  const report: WaSyncReport = {
    read: 0,
    messagesProjected: 0,
    noPerson: 0,
    linkedToDeal: 0,
    noDeal: 0,
    notesCreated: 0,
    notesAppended: 0,
    mediaAttached: 0,
    mediaFailed: 0,
    failed: 0,
  };
  const max = opts.maxMessages ?? 500;

  let checkpoint = await loadCheckpoint(db, tenantId);
  if (!checkpoint) {
    checkpoint = new Date(Date.now() - (opts.sinceDays ?? 3) * 86_400_000);
  }

  // People index once per run (phoneTail9 → person id), shared shape with the
  // mirror — a person mirrored by contacts/leads matches by phone.
  const peopleIndex = await buildTwentyIndex(client, "people");

  const rows = await db
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
        gt(message.createdAt, checkpoint),
        isNotNull(message.body),
        // "[no message]" rows are observer artefacts (view-once, reactions,
        // undecryptable events) — they carry no content and pollute notes.
        ne(message.body, "[no message]")
        // Group rows (@g.us) are INCLUDED: waCustomerTail keys them by the
        // participant phone (from_pn), so a known lead's group messages file
        // as notes exactly like their direct ones.
      )
    )
    .orderBy(asc(message.createdAt))
    .limit(max);

  if (rows.length === 0) return { ...report, checkpoint: checkpoint.toISOString() };

  // Deals for THIS BATCH's numbers only. A full crawl was the obvious shape
  // and the wrong one: the sales workspace holds 78,917 opportunities, which
  // is ~1,315 requests — 13 minutes added to a pass that runs on the minute
  // beat. Filtering server-side makes it ~4 requests for 200 messages.
  //
  // Brand-scoped: Cardiwan and EasyRent share this workspace AND share
  // customers, so an unscoped index files one brand's chat onto the other
  // brand's deal (27 of them, measured 2026-08-07).
  const dealIndex = await fetchOpportunitiesForTails(
    client,
    rows.map(waCustomerTail).filter((t): t is string => t !== null),
    brandLineForTenantSlug(t?.slug)
  );

  // ── 1. Bucket projectable rows by (person, calendar day) ─────────────────
  // One Twenty note per group instead of one per message (owner, 2026-08-21:
  // «can he just add into the notes without creating hundreds of inputs»).
  //
  // LID FALLBACK: most outbound rows now carry the customer's WhatsApp @lid
  // in `from`, and when `to` never resolved (pre-fix imports, identity gaps)
  // waCustomerTail comes back null and the reply would be DROPPED as noPerson
  // — the card then looks like the agent never answered (owner, 2026-08-24:
  // "the chats are being cut off"). wa_identity (observer-maintained) knows
  // the phone behind most lids, so those rows get one batch lookup here.
  const unresolvedLids = [
    ...new Set(
      rows
        .filter((m) => waCustomerTail(m) === null && (m.from ?? "").endsWith("@lid"))
        .map((m) => m.from as string)
    ),
  ];
  const lidPhones = new Map<string, string>();
  if (unresolvedLids.length > 0) {
    // An array interpolated into a drizzle sql`` template binds as ONE text
    // parameter, so `ANY(${array})` reached Postgres as `ANY(($1))` with a
    // plain string and every run died on "op ANY/ALL (array) requires array on
    // right side" — which killed the whole wa→twenty push, for all tenants,
    // from 2026-08-24 until 08-25. An explicit IN list binds one param per lid.
    const res = await db.execute(sql`
      SELECT lid, phone FROM wa_identity
      WHERE lid IN (${sql.join(
        unresolvedLids.map((l) => sql`${l}`),
        sql`, `
      )}) AND phone IS NOT NULL AND phone <> ''
    `);
    const lidRows = (res as unknown as { rows?: { lid: string; phone: string }[] }).rows ?? [];
    for (const r of lidRows) lidPhones.set(r.lid, r.phone);
  }
  interface DayGroup {
    personId: string;
    dealId: string | null;
    digits: string;
    rows: typeof rows;
  }
  const groups = new Map<string, DayGroup>();
  for (const m of rows) {
    report.read++;
    let tail = waCustomerTail(m);
    let digits = tail ? waCustomerDigits(m) : "";
    if (tail === null && m.from) {
      const d = normalizePhone(lidPhones.get(m.from) ?? null);
      if (d.length >= MIN_PHONE_MATCH_DIGITS) {
        tail = d.slice(-MIN_PHONE_MATCH_DIGITS);
        digits = d;
      }
    }
    const personId = tail ? peopleIndex.byPhoneTail9.get(tail) : undefined;
    if (!personId) {
      report.noPerson++;
      continue;
    }
    const deal = tail ? dealIndex.get(tail) : undefined;
    if (deal) report.linkedToDeal++;
    else report.noDeal++;
    // Keyed on the PERSON alone since 2026-08-26 — the day used to be part of
    // this key, which is what produced one note per customer per day.
    const key = personId;
    let g = groups.get(key);
    if (!g) {
      g = { personId, dealId: deal?.id ?? null, digits, rows: [] };
      groups.set(key, g);
    }
    g.rows.push(m);
  }

  // ── 2. Land each group's lines on the person's continuous note ───────────
  for (const g of groups.values()) {
    // Chronological, with a dayHeader whenever the calendar day turns over —
    // the lines themselves carry only HH:MM, so without this a year of chat
    // reads as an undated wall.
    const ordered = [...g.rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const lines: string[] = [];
    let lastDay = "";
    for (const m of ordered) {
      const day = dayKey(m.createdAt);
      if (day !== lastDay) {
        lines.push(dayHeader(m.createdAt));
        lastDay = day;
      }
      const speaker =
        (m.direction ?? "inbound") === "outbound"
          ? resolveOwnerForLine(m.to)?.name ?? resolveOwnerForPhone(m.from)?.name ?? null // the officer on that line/number wrote it
          : m.customerName ?? null;                 // the client's WhatsApp profile name
      const line = messageNoteLine(m, speaker);
      if (line) lines.push(line);
    }
    try {
      // NOTE-FIRST ordering is deliberate: attachments are only attempted
      // after the note exists, so a failed note never leaves an orphaned
      // file. A failed ATTACHMENT, conversely, must not sink the note — it is
      // counted on its own and the media backfill heals it later.
      const note = await ensureWaNote(client, {
        lines,
        digits: g.digits,
        personId: g.personId,
        opportunityId: g.dealId,
        commit: !opts.dryRun,
      });
      if (note.created) report.notesCreated++;
      else if (note.appended > 0) report.notesAppended++;
      if (!opts.dryRun && note.noteId) {
        for (const m of g.rows) {
          if (!m.mediaPath) continue;
          try {
            const media = await attachWaMediaToTwenty(client, {
              mediaPath: m.mediaPath,
              personId: g.personId,
              opportunityId: g.dealId,
              noteId: note.noteId,
              readMedia: opts.readMedia,
            });
            if (media.attached) report.mediaAttached++;
          } catch (me) {
            report.mediaFailed++;
            report.mediaFirstError ??= `${m.id}: ${(me as Error).message.slice(0, 160)}`;
          }
        }
      }
      report.messagesProjected += g.rows.length;
    } catch (e) {
      report.failed += g.rows.length;
      report.firstError ??= `${g.rows[0].id}: ${(e as Error).message.slice(0, 160)}`;
    }
  }

  const last = rows[rows.length - 1];
  if (!opts.dryRun && last) await saveCheckpoint(db, tenantId, last.createdAt);
  return { ...report, checkpoint: last?.createdAt.toISOString() };
}

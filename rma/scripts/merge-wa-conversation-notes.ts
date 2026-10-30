// merge-wa-conversation-notes.ts — ONE continuous WhatsApp note per customer
// ("WhatsApp · +<digits>"), reading like a WhatsApp conversation.
//
// Phase 1 (2026-08-29, owner/Ayham, card #593): fold every retired note
// stream into the day note — see "THE MERGE" below.
//
// Phase 2 (2026-08-29 PM, owner reviewed merged cards): HISTORICAL
// NORMALIZATION. The merged notes still read like machine output: QC-ish
// `Client · 2026-08-29 16:12: text` lines, an "Agent" mislabeled with the
// CLIENT's phone number, unnamed arrows, `[no message]` artefacts, verbose
// multi-line media descriptions, and — worst — the agent's OUTBOUND replies
// missing entirely on cards the day-pipe never projected (Khalil,
// +31640885107: the agent's 15:58–16:15 answers were absent).
//
// Per customer (tail9) the pass now:
//   1. MERGES the retired streams (qc/relay/legacy day notes) into the
//      canonical note — unchanged from phase 1;
//   2. BACKFILLS from the platform `message` table (the source of truth):
//      every two-way direct-chat row for the tail9 (same identity rule as
//      wa-lead-relay's loadRecentTwoWay), inserting lines the note lacks —
//      the missing outbound replies — and dropping `[no message]` rows;
//   3. RE-RENDERS every line as a chat bubble: `**— YYYY-MM-DD —**` day
//      headers, then `HH:MM ← ClientName: text` / `HH:MM → OfficerName: text`
//      (Dubai wall time). Client name: the rows' customer_name, else the
//      Twenty person's name, else the bare +phone. Officer name: the line in
//      use at that moment (inbound rows carry the line slug in `to`, outbound
//      media carries it in media_path, legacy outbound carries it in `to`) →
//      resolveOwnerForLine — never guessed when nothing identifies the line;
//   4. COMPACTS media to one line per item: `🎙 Voice — <transcript> ·
//      [🔗 Listen](url)`, `📷 Photo — <desc ≤80> · [🔗 View](url)`,
//      `📄 Document — …`. The link exists only when the FILE is on disk under
//      wa-observer/media (never invented); on --commit a file that has no
//      Twenty attachment yet is uploaded and attached to the note/person/deal
//      (deduped by basename+person). A voice/photo with neither file nor
//      transcript/description becomes one honest line —
//      `🎙 Voice note (unrecoverable — line was offline)` for the 08-26→08-29
//      dead-line window (WhatsApp media expired), `(unrecoverable)` elsewhere
//      — and is COUNTED for the report.
//
// Idempotent: the rendered body parses back into the same entries (the
// parser knows the named/media formats it emits), table rows re-derive
// deterministically, so a second run changes nothing.
//
// DRY-RUN BY DEFAULT. `--commit` to write. Twenty writes are direct SQL
// (psql via docker exec — no cache to invalidate); attachment uploads go
// through the Twenty REST API; message history reads the platform DB.
//
//   scripts/merge-wa-conversation-notes.ts                       # dry-run, rental
//   scripts/merge-wa-conversation-notes.ts --commit
//   scripts/merge-wa-conversation-notes.ts --only 640885107      # one customer
//   scripts/merge-wa-conversation-notes.ts --instance both --commit
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { db, pool } from "@/platform/db/client";
import { mediaFilePath, mediaUrl } from "@/platform/media/token";
import { BRAND_OWNERS, resolveOwnerForLine } from "@/modules/board/owners";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import { twentyInstanceForTenantSlug } from "@/platform/integrations/twenty/instance";
import {
  attachWaMediaToTwenty,
  classifyWaMedia,
  mediaFileName,
} from "@/platform/integrations/twenty/media-attachment";
import {
  canonText,
  dubaiMinute,
  flatText,
  parseMediaText,
  renderMediaLine,
  splitSpeaker,
  type MediaKind,
} from "@/platform/integrations/twenty/chat-line";

const INSTANCES: Record<string, { container: string; schema: string; key: "default" | "rental" }> = {
  sales: { container: "twenty-db-1", schema: "workspace_8fj54z04p0s0zrognxhkd2f0a", key: "default" },
  rental: { container: "twenty-rental-db-1", schema: "workspace_7tkxm1eeqb4iopvi5ica5vos4", key: "rental" },
};

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const instIdx = args.indexOf("--instance");
const instArg = instIdx >= 0 ? args[instIdx + 1] : "rental";
const targets = instArg === "both" ? Object.keys(INSTANCES) : [instArg];
if (!targets.every((t) => INSTANCES[t])) {
  console.error(`unknown --instance '${instArg}' (sales|rental|both)`);
  process.exit(1);
}
const onlyIdx = args.indexOf("--only");
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1] : null; // tail9 filter for inspection
const PRINT = args.includes("--print"); // dump the rewritten body (with --only)

/** Same cap day-note.ts NOTE_MAX_CHARS enforces on the live writers. */
const NOTE_MAX_CHARS = 60_000;
const QC_TITLE = "💬 Chat transcript (auto)";
/** The observer line(s) that were down 08-26→08-29 — media from that window
 *  was never downloaded and WhatsApp has long expired it. */
const DEAD_WINDOW = { from: "2026-08-26 00:00", to: "2026-08-30 00:00" }; // Dubai wall time

function psql(container: string, sqlText: string): string {
  return execSync(
    `docker exec -i ${container} psql -U postgres -d default -t -A -v ON_ERROR_STOP=1`,
    { input: sqlText, maxBuffer: 256 * 1024 * 1024, encoding: "utf8" }
  ).trim();
}

function psqlJson<T>(container: string, sqlText: string): T[] {
  const out = psql(container, `select coalesce(json_agg(row_to_json(t)), '[]') from (${sqlText}) t;`);
  return JSON.parse(out || "[]") as T[];
}

function esc(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

// ─── Note classification ────────────────────────────────────────────────────

interface NoteRow {
  id: string;
  title: string;
  markdown: string;
  createdAt: string;
}
interface TargetRow {
  noteId: string;
  targetPersonId: string | null;
  targetOpportunityId: string | null;
}

const DAY_TITLE = /^WhatsApp · \+(\d{9,15})(?: · (#\d+|\d{4}-\d{2}-\d{2}))?$/;
/** New-style stable relay title: `<label> · …<tail9>`. */
const RELAY_TITLE = /· …(\d{9})$/;
/** Pre-2026-08-26 per-pass relay title: `<label> · …<tail9> · N msg · …`. */
const RELAY_TITLE_OLD = /· …(\d{9}) · \d+ msg · /;
/** Streams that stay SEPARATE on purpose (the day-note pipe can't see them). */
const LIVE_RELAY_PREFIX = /^(WhatsApp group:|Telegram)/;

type NoteKind = "day" | "qc" | "relay";

export function classify(
  title: string
): { kind: NoteKind; tail9: string | null; digits: string | null; legacyDay: string | null } | null {
  const day = DAY_TITLE.exec(title);
  if (day) {
    return {
      kind: "day",
      tail9: day[1].slice(-9),
      digits: day[1],
      legacyDay: day[2] && day[2] !== "#" && /^\d{4}/.test(day[2]) ? day[2] : null,
    };
  }
  if (title === QC_TITLE) return { kind: "qc", tail9: null, digits: null, legacyDay: null };
  if (LIVE_RELAY_PREFIX.test(title)) return null;
  const relay = RELAY_TITLE.exec(title) ?? RELAY_TITLE_OLD.exec(title);
  if (relay) return { kind: "relay", tail9: relay[1], digits: null, legacyDay: null };
  return null;
}

/** media_path relpath → file on disk (box path via MEDIA_ROOTS.wa). */
function mediaFileExists(relpath: string): boolean {
  try {
    return existsSync(mediaFilePath(relpath));
  } catch {
    return false;
  }
}

/** relpath out of a minted /api/media/v1.<b64>.<sig> URL (no HMAC check —
 *  we are reading our own historic links, not serving them). */
function relpathFromMediaUrl(url: string): string | null {
  const m = /\/api\/media\/(v1\.[^/\s]+)/.exec(url);
  if (!m) return null;
  const parts = m[1].split(".");
  if (parts.length !== 3) return null;
  try {
    return Buffer.from(parts[1], "base64url").toString("utf8");
  } catch {
    return null;
  }
}

// ─── Body parsing (every historic format → one entry list) ──────────────────

export interface Entry {
  /** "YYYY-MM-DD HH:MM" Dubai wall time; null when the line carried no clock. */
  key: string | null;
  dir: "←" | "→" | null;
  /** Speaker display name when the line carried one (and we know it). */
  speaker: string | null;
  /** The rendered line text (media already compacted). */
  text: string;
  /** Original unparseable line — re-emitted verbatim, never dropped. */
  raw: string | null;
  /** Input order, the stable-sort tiebreak. */
  seq: number;
  /** epoch ms when the row behind this entry is known (table rows). */
  tsMs: number | null;
  /** media_path relpath this line's file lives at — the strongest identity
   *  a media line has (survives transcript upgrades and render changes). */
  rel?: string | null;
}

const WA_LINK_LINE = /(?:send\?phone=|wa\.me\/)\d{9,15}/;
/** Separator renderBody() puts in front of unparseable fragments; the parser
 *  recognizes it so a re-read of a merged body reproduces it exactly. */
const RAW_HEADER = "**— earlier fragments —**";
const DAY_HEADER = /^\*\*— (\d{4}-\d{2}-\d{2}) —\*\*$/;
const DAY_LINE = /^(\d{2}:\d{2}) (←|→) (.*)$/;
const RELAY_LINE = /^\[(.+?)\]\s*(.*)$/;
const QC_LINE = /^(\*\*Agent(?: \([^)]*\))?\*\*|Client) · (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}): ([\s\S]*)$/;
const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** "2026-08-29 12:29" (already Dubai) or "2026-08-12T21:20:20.723Z" (UTC,
 *  the pre-2026-08-19 relay shape) or "26 Aug 2026 · 13:01" → Dubai
 *  "YYYY-MM-DD HH:MM". */
function parseStamp(raw: string): string | null {
  const t = raw.trim();
  const isoZ = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?Z$/.exec(t);
  if (isoZ) {
    const d = new Date(`${isoZ[1]}T${isoZ[2]}:00Z`);
    return Number.isNaN(d.getTime()) ? null : dubaiMinute(d.getTime());
  }
  const iso = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(t);
  if (iso) return `${iso[1]} ${iso[2]}`;
  const legacy = /^(\d{1,2}) (\w{3}) (\d{4}) · (\d{2}:\d{2})/.exec(t);
  if (legacy) {
    const m = MONTHS[legacy[2].toLowerCase()];
    if (m) return `${legacy[3]}-${m}-${legacy[1].padStart(2, "0")} ${legacy[4]}`;
  }
  return null;
}

/**
 * One note body → entries. The parser is format-agnostic: merged survivors
 * hold the chat shape, but pre-merge bodies mix day-note, relay and QC
 * formats. The wa.me header line is identity, not content.
 */
export function parseBody(
  kind: NoteKind,
  markdown: string,
  seqBase: number,
  /** Day from a legacy per-day title — bodies of that scheme carry no day
   *  headers, so their `HH:MM` lines key off this. */
  defaultDay?: string
): Entry[] {
  const out: Entry[] = [];
  let seq = seqBase;
  let day = defaultDay ?? "";
  const push = (e: Omit<Entry, "seq">) => out.push({ ...e, seq: seq++ });

  const blocks: string[] = [];
  let afterRawHeader = false;
  for (const line of markdown.split("\n")) {
    const startsNew =
      DAY_HEADER.test(line) ||
      DAY_LINE.test(line) ||
      RELAY_LINE.test(line) ||
      QC_LINE.test(line) ||
      line === RAW_HEADER ||
      line === "…" || // a truncation marker heads its own fragment
      afterRawHeader; // the marker stands alone; fragments start their own blocks
    afterRawHeader = line === RAW_HEADER;
    if (startsNew || blocks.length === 0) blocks.push(line);
    else blocks[blocks.length - 1] += "\n" + line;
  }

  for (const block of blocks) {
    const first = block.split("\n", 1)[0];
    if (first === RAW_HEADER) continue;
    if (WA_LINK_LINE.test(first)) continue;
    const dh = DAY_HEADER.exec(first);
    if (dh) {
      day = dh[1];
      continue;
    }
    const dl = DAY_LINE.exec(first);
    if (dl) {
      push({
        key: day ? `${day} ${dl[1]}` : null,
        dir: dl[2] as "←" | "→",
        speaker: null, // split later, once the group's known names are loaded
        text: flatText(dl[3] + block.slice(first.length)),
        raw: null,
        tsMs: null,
      });
      continue;
    }
    const rl = RELAY_LINE.exec(first);
    if (rl) {
      const stamp = parseStamp(rl[1]);
      const text = flatText(rl[2] + block.slice(first.length));
      if (stamp && text) {
        push({ key: stamp, dir: "←", speaker: null, text, raw: null, tsMs: null });
        continue;
      }
    }
    const ql = QC_LINE.exec(block.replace(/\n/g, " ")) ?? QC_LINE.exec(first);
    if (ql) {
      push({
        key: `${ql[2]} ${ql[3]}`,
        dir: ql[1] === "Client" ? "←" : "→",
        speaker: null,
        text: flatText(ql[4]),
        raw: null,
        tsMs: null,
      });
      continue;
    }
    const raw = block.trim();
    // QC's truncation marker and blank separators carry no information.
    if (raw && raw !== "…") push({ key: null, dir: null, speaker: null, text: flatText(raw), raw, tsMs: null });
  }
  return out;
}

/** Cross-format dedupe key: same Dubai minute + direction + same words. */
export function dedupeKey(e: Entry): string {
  return `${e.key ?? ""}|${e.dir ?? ""}|${canonText(e.text).slice(0, 200)}`;
}

/** The chat body, in the exact shape the live writers append to. */
export function renderBody(digits: string, entries: Entry[]): string {
  const lines: string[] = [];
  let lastDay = "";
  for (const e of entries) {
    if (e.raw !== null || e.key === null || e.dir === null) continue;
    const d = e.key.slice(0, 10);
    if (d !== lastDay) {
      lines.push(`**— ${d} —**`);
      lastDay = d;
    }
    const who = e.speaker ? `${e.speaker}: ` : "";
    lines.push(`${e.key.slice(11)} ${e.dir} ${who}${e.text}`);
  }
  const raws = entries.filter((e) => e.raw !== null).map((e) => e.raw as string);
  const body = [...lines, ...(raws.length > 0 ? [RAW_HEADER, ...raws] : [])].join("\n");
  return `[💬 WhatsApp +${digits}](https://web.whatsapp.com/send?phone=${digits})\n\n${body}`;
}

// ─── Platform message table (the source of truth) ───────────────────────────

export interface MsgRow {
  direction: string;
  from: string | null;
  fromPn: string | null;
  to: string | null;
  customerName: string | null;
  body: string;
  mediaPath: string | null;
  createdAt: Date;
}

/**
 * Every two-way DIRECT-chat whatsapp row for one customer across the
 * instance's tenants — the loadRecentTwoWay identity rule (tail9 over
 * from_pn / from / to), minus groups, minus the `[no message]` artefact.
 */
async function loadTwoWay(tenantIds: string[], tail9: string): Promise<MsgRow[]> {
  if (tenantIds.length === 0) return [];
  const res = await db.execute(sql`
    SELECT direction, "from", from_pn, "to", customer_name, body, media_path, created_at
      FROM message
     WHERE tenant_id IN (${sql.join(tenantIds.map((t) => sql`${t}`), sql`, `)})
       AND channel = 'whatsapp'
       AND body IS NOT NULL
       AND body <> '[no message]'
       AND "from" NOT LIKE '%@g.us'
       AND (
         right(coalesce(from_pn, ''), 9) = ${tail9}
         OR right(regexp_replace(coalesce("from", ''), '[^0-9]', '', 'g'), 9) = ${tail9}
         OR right(regexp_replace(coalesce("to", ''), '[^0-9]', '', 'g'), 9) = ${tail9}
       )
     ORDER BY created_at ASC
     LIMIT 5000
  `);
  interface Row {
    direction: string | null;
    from: string | null;
    from_pn: string | null;
    to: string | null;
    customer_name: string | null;
    body: string | null;
    media_path: string | null;
    created_at: string;
  }
  const rows = ((res as unknown as { rows?: Row[] })?.rows ?? [])
    .filter((r) => r.body)
    .map((r) => ({
      direction: r.direction ?? "inbound",
      from: r.from,
      fromPn: r.from_pn,
      to: r.to,
      customerName: r.customer_name,
      body: r.body as string,
      mediaPath: r.media_path,
      createdAt: new Date(r.created_at),
    }));
  return rows;
}

/** Line slug an outbound row was sent from: `to` when it is a slug (legacy
 *  imports), else the media_path's `wa/<slug>/` segment. */
function slugOfRow(r: MsgRow): string | null {
  if (r.to && BRAND_OWNERS[r.to]) return r.to;
  const seg = r.mediaPath?.split("/")[1];
  return seg && BRAND_OWNERS[seg] ? seg : null;
}

// ─── The merge ──────────────────────────────────────────────────────────────

interface Stats {
  mergedNotes: number;
  retitled: number;
  cardsTouched: Set<string>;
  notesRerendered: number;
  backfillOutbound: number;
  backfillInbound: number;
  droppedNoMessage: number;
  mediaLinked: number;
  attached: number;
  attachExisting: number;
  attachFailed: number;
  unrecoverableOffline: number;
  unrecoverableExpired: number;
  fragmentsAbsorbed: number;
  skipped: number;
}

function emptyStats(): Stats {
  return {
    mergedNotes: 0, retitled: 0, cardsTouched: new Set(), notesRerendered: 0,
    backfillOutbound: 0, backfillInbound: 0, droppedNoMessage: 0,
    mediaLinked: 0, attached: 0, attachExisting: 0, attachFailed: 0,
    unrecoverableOffline: 0, unrecoverableExpired: 0, fragmentsAbsorbed: 0, skipped: 0,
  };
}

async function mergeInstance(name: string): Promise<Stats> {
  const { container, schema, key } = INSTANCES[name];
  const stats = emptyStats();
  console.log(`\n== ${name} (${container}) commit=${COMMIT}${ONLY ? ` only=…${ONLY}` : ""}`);

  const notes = psqlJson<NoteRow>(
    container,
    `select id, title, coalesce("bodyV2Markdown", '') as markdown, "createdAt"
       from ${schema}.note
      where "deletedAt" is null and (
        title like 'WhatsApp · +%' or title = '${QC_TITLE}' or title ~ '· …[0-9]{9}'
      )`
  );
  const convo = notes.filter((n) => classify(n.title) !== null);
  console.log(`candidate notes: ${convo.length} (of ${notes.length} matched broadly)`);

  const noteIds = convo.map((n) => n.id);
  const targetRows = noteIds.length
    ? psqlJson<TargetRow>(
        container,
        `select "noteId", "targetPersonId", "targetOpportunityId"
           from ${schema}."noteTarget"
          where "deletedAt" is null and "noteId" in (${noteIds.map(esc).join(",")})`
      )
    : [];

  const oppIds = [...new Set(targetRows.map((t) => t.targetOpportunityId).filter((x): x is string => !!x))];
  const oppTail = new Map<string, string>();
  for (let i = 0; i < oppIds.length; i += 500) {
    const rows = psqlJson<{ id: string; tail: string | null }>(
      container,
      `select id, "phoneTail9" as tail from ${schema}.opportunity
        where id in (${oppIds.slice(i, i + 500).map(esc).join(",")})`
    );
    for (const r of rows) if (r.tail) oppTail.set(r.id, r.tail);
  }
  const targetTail = new Map<string, string>();
  for (const n of convo) {
    const c = classify(n.title);
    if (!c?.tail9) continue;
    for (const t of targetRows.filter((t) => t.noteId === n.id)) {
      for (const id of [t.targetOpportunityId, t.targetPersonId]) {
        if (id && !targetTail.has(id)) targetTail.set(id, c.tail9);
      }
    }
  }

  interface Group {
    tail9: string;
    digits: string | null;
    notes: NoteRow[];
  }
  const groups = new Map<string, Group>();
  const groupFor = (tail9: string): Group => {
    let g = groups.get(tail9);
    if (!g) {
      g = { tail9, digits: null, notes: [] };
      groups.set(tail9, g);
    }
    return g;
  };
  const unkeyed: NoteRow[] = [];
  for (const n of convo) {
    const c = classify(n.title)!;
    if (c.tail9) {
      const g = groupFor(c.tail9);
      g.notes.push(n);
      g.digits ??= c.digits;
      continue;
    }
    const ts = targetRows.filter((t) => t.noteId === n.id);
    const tail =
      ts.map((t) => (t.targetOpportunityId ? oppTail.get(t.targetOpportunityId) : undefined)).find(Boolean) ??
      ts
        .map((t) => targetTail.get(t.targetOpportunityId ?? "") ?? targetTail.get(t.targetPersonId ?? ""))
        .find(Boolean);
    if (tail) groupFor(tail).notes.push(n);
    else unkeyed.push(n);
  }

  // Digits recovery (wa.me link in a body, then a targeted person's phone).
  const needDigits = [...groups.values()].filter((g) => !g.digits);
  for (const g of needDigits) {
    for (const n of g.notes) {
      const m = /(?:send\?phone=|wa\.me\/)(\d{9,15})/.exec(n.markdown);
      if (m && m[1].endsWith(g.tail9)) {
        g.digits = m[1];
        break;
      }
    }
  }
  const allPersonIds = [
    ...new Set(targetRows.map((t) => t.targetPersonId).filter((x): x is string => !!x)),
  ];
  const personPhone = new Map<string, string>();
  const personName = new Map<string, string>();
  for (let i = 0; i < allPersonIds.length; i += 500) {
    const rows = psqlJson<{ id: string; cc: string | null; num: string | null; fn: string | null; ln: string | null }>(
      container,
      `select id, "phonesPrimaryPhoneCountryCode" as cc, "phonesPrimaryPhoneNumber" as num,
              "nameFirstName" as fn, "nameLastName" as ln
         from ${schema}.person where id in (${allPersonIds.slice(i, i + 500).map(esc).join(",")})`
    );
    for (const r of rows) {
      const digits = `${r.cc ?? ""}${r.num ?? ""}`.replace(/\D/g, "");
      if (digits.length >= 9) personPhone.set(r.id, digits);
      const nm = [r.fn, r.ln].filter(Boolean).join(" ").trim();
      if (nm) personName.set(r.id, nm);
    }
  }
  for (const g of needDigits.filter((g) => !g.digits)) {
    for (const n of g.notes) {
      const pid = targetRows.find((t) => t.noteId === n.id)?.targetPersonId;
      const digits = pid ? personPhone.get(pid) : undefined;
      if (digits && digits.endsWith(g.tail9)) {
        g.digits = digits;
        break;
      }
    }
  }

  // The instance's tenants → platform message rows. Rental brands share the
  // rental workspace AND share customers, so the history read spans them all.
  const tenants = (await db.execute(sql`SELECT id, slug FROM tenant`)) as unknown as {
    rows?: { id: string; slug: string }[];
  };
  const tenantIds = (tenants.rows ?? [])
    .filter((t) => twentyInstanceForTenantSlug(t.slug) === key)
    .map((t) => t.id);

  const twenty = COMMIT ? getTwentyClientForInstance(key) : null;
  const statements: string[] = [];

  for (const g of groups.values()) {
    if (ONLY && g.tail9 !== ONLY) continue;
    const dayNotes = g.notes.filter((n) => classify(n.title)!.kind === "day");
    let survivor: NoteRow | null =
      dayNotes.sort((a, b) => a.title.length - b.title.length || b.markdown.length - a.markdown.length)[0] ?? null;

    if (!survivor) {
      if (!g.digits) {
        console.log(`  SKIP …${g.tail9}: no day note and no recoverable digits (${g.notes.length} notes)`);
        stats.skipped += g.notes.length;
        continue;
      }
      survivor = g.notes.sort((a, b) => b.markdown.length - a.markdown.length)[0];
    }
    g.digits = classify(survivor.title)!.digits ?? g.digits;
    if (!g.digits) {
      console.log(`  SKIP …${g.tail9}: survivor without digits (${g.notes.length} notes)`);
      stats.skipped += g.notes.length;
      continue;
    }
    const canonical = `WhatsApp · +${g.digits}`;
    if (survivor.title !== canonical && !g.notes.some((n) => n.id !== survivor!.id && n.title === canonical)) {
      statements.push(
        `update ${schema}.note set title = ${esc(canonical)}, "updatedAt" = now() where id = ${esc(survivor.id)};`
      );
      stats.retitled++;
    }
    const sources = g.notes.filter((n) => n.id !== survivor!.id);

    // ── Phase 2: the platform table is the source of truth ──────────────
    const rows = await loadTwoWay(tenantIds, g.tail9);

    // Client name: the rows' own customer_name (latest wins — people change
    // their WhatsApp profile), then the Twenty person, then the bare phone.
    // flatText: pushnames drift in whitespace between import eras, and the
    // note's dedupe identity must not.
    const personId = targetRows.find((t) => t.noteId === survivor!.id)?.targetPersonId ?? null;
    const opportunityId = targetRows.find((t) => t.noteId === survivor!.id)?.targetOpportunityId ?? null;
    const clientName = flatText(
      [...rows].reverse().find((r) => r.direction !== "outbound" && r.customerName?.trim())?.customerName?.trim() ??
        (personId ? personName.get(personId) : undefined) ??
        `+${g.digits}`
    );

    // Officer timeline: which of OUR lines served this customer, when.
    const timeline = rows
      .map((r) => ({ at: r.createdAt.getTime(), slug: slugOfRow(r) }))
      .filter((x): x is { at: number; slug: string } => !!x.slug)
      .sort((a, b) => a.at - b.at);
    const officerAt = (ms: number): string | null => {
      // Nearest line-in-use wins: strictly-backward lookup mislabels the row
      // that OPENS a conversation on a freshly re-paired handset (the first
      // inbound carrying the new slug lands a second later).
      let best: { at: number; slug: string } | null = null;
      for (const t of timeline) {
        if (!best || Math.abs(t.at - ms) < Math.abs(best.at - ms)) best = t;
      }
      return best ? resolveOwnerForLine(best.slug)?.name ?? null : null;
    };

    // Every name variant this customer has ever worn — a note line written
    // under an older pushname must still be recognized as a named line, or
    // the table row re-inserts as a duplicate beside it (DRAGON CAR RENTAL,
    // third dry-run).
    const knownNames = new Set<string>([
      clientName,
      ...rows.map((r) => flatText(r.customerName ?? "")).filter(Boolean),
      ...Object.values(BRAND_OWNERS).map((o) => o.name),
    ]);

    // Media jobs for the attach pass (commit only), deduped by basename.
    const mediaJobs: { mediaPath: string; link: string }[] = [];
    const seenMedia = new Set<string>();

    // Table rows → authoritative entries.
    const AUDIO_EXT = /\.(ogg|opus|mp3|m4a|wav|aiff)$/i;
    const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i;
    const tableEntries: Entry[] = [];
    for (const r of rows) {
      let p = parseMediaText(r.body);
      // "[non-text]" with a file on record is a media item whose kind the
      // importer never resolved — the extension names it honestly.
      if (p.kind === "nontext" && r.mediaPath) {
        const kind: MediaKind = AUDIO_EXT.test(r.mediaPath) ? "voice" : IMAGE_EXT.test(r.mediaPath) ? "image" : "document";
        p = { ...p, kind };
      }
      if (p.kind === "nomessage") continue; // dropped at the SQL level too — belt and braces
      const key = dubaiMinute(r.createdAt.getTime());
      const outbound = r.direction === "outbound";
      const dead = key >= DEAD_WINDOW.from && key < DEAD_WINDOW.to;
      let link: string | null = null;
      if (r.mediaPath && (p.kind === "voice" || p.kind === "image" || p.kind === "document")) {
        if (mediaFileExists(r.mediaPath)) {
          link = mediaUrl(r.mediaPath);
          const base = mediaFileName(r.mediaPath);
          if (!seenMedia.has(base)) {
            seenMedia.add(base);
            mediaJobs.push({ mediaPath: r.mediaPath, link });
          }
          stats.mediaLinked++;
        }
      }
      const text = renderMediaLine(p, link, dead);
      if ((p.kind === "voice" || p.kind === "image") && !p.text && !link) {
        // File gone and nothing to read — the honest stub the owner counts.
        if (dead) stats.unrecoverableOffline++;
        else stats.unrecoverableExpired++;
      }
      if (text === null) continue;
      tableEntries.push({
        key,
        dir: outbound ? "→" : "←",
        speaker: outbound ? officerAt(r.createdAt.getTime()) : clientName,
        text,
        raw: null,
        seq: 0,
        tsMs: r.createdAt.getTime(),
        rel: r.mediaPath,
      });
    }

    // Note lines → entries, normalized; `[no message]` lines dropped here.
    const noteEntries: Entry[] = [];
    for (const n of g.notes.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const c = classify(n.title)!;
      for (const e of parseBody(c.kind, n.markdown, 0, c.legacyDay ?? undefined)) {
        if (e.raw !== null) {
          noteEntries.push(e);
          continue;
        }
        // Speaker first ("Khalil: [voice/audio] …"), THEN the media shape —
        // the placeholder stack only prefixes the text, never the name.
        const sp = splitSpeaker(e.text, knownNames);
        const p = parseMediaText(sp.text);
        if (p.kind === "nomessage") {
          stats.droppedNoMessage++;
          continue;
        }
        // The relpath is the line's identity even when the file is gone (a
        // transcribed table row then owns the message); the rendered link is
        // honoured only while the file is actually on disk.
        const rel = p.link ? relpathFromMediaUrl(p.link) : null;
        const link = rel && mediaFileExists(rel) ? mediaUrl(rel) : null; // re-mint: same relpath, current secret
        const deadWindow = !!e.key && e.key >= DEAD_WINDOW.from && e.key < DEAD_WINDOW.to;
        const text = renderMediaLine(p, link, deadWindow);
        if (text === null) {
          stats.droppedNoMessage++;
          continue;
        }
        noteEntries.push({ ...e, speaker: sp.speaker, text, rel });
      }
    }

    // Merge. The TABLE is authoritative: its rows go in first, counting as
    // backfill when no note line carries them. Note lines then survive only
    // when they are neither the same words at the same minute nor the same
    // media file in a poorer rendering (the "no transcript" twin of a
    // transcribed row).
    const noteKeys = new Set(
      noteEntries.filter((e) => e.raw === null && e.key !== null).map((e) => dedupeKey(e))
    );
    const merged: Entry[] = [];
    const seenAt = new Map<string, number>();
    const seenRel = new Set<string>();
    for (const e of tableEntries) {
      const k = dedupeKey(e);
      if (seenAt.has(k)) continue; // the same row ingested under two tenants
      if (!noteKeys.has(k)) {
        if (e.dir === "→") stats.backfillOutbound++;
        else stats.backfillInbound++;
      }
      seenAt.set(k, merged.length);
      if (e.rel) seenRel.add(e.rel);
      merged.push(e);
    }
    const rawsSeen = new Set<string>();
    for (const e of noteEntries) {
      if (e.raw !== null) {
        const rf = flatText(e.raw.replace(/^[…\s]+/, ""));
        if (rf && rawsSeen.has(rf)) continue; // two merged notes carried the same fragment
        if (rf) rawsSeen.add(rf);
        merged.push(e);
        continue;
      }
      if (e.key === null) {
        merged.push(e);
        continue;
      }
      if (e.rel && seenRel.has(e.rel)) continue;
      const k = dedupeKey(e);
      if (seenAt.has(k)) continue;
      seenAt.set(k, merged.length);
      merged.push(e);
    }

    // Truncation fragments (a qc body cut mid-line at 8k) whose words now
    // live inside a complete table-backed line are absorbed, not kept.
    const canonPool = merged.filter((e) => e.raw === null).map((e) => canonText(e.text));
    const finalEntries = merged.filter((e) => {
      if (e.raw === null) return true;
      const frag = canonText(e.raw).replace(/^…+\s*/, "");
      if (frag.length < 12) return true; // too short to prove absorption — keep
      const absorbed = canonPool.some((c) => c.length >= frag.length && c.includes(frag));
      if (absorbed) stats.fragmentsAbsorbed++;
      return !absorbed;
    });

    // Chronological: table rows carry exact ms; note-only lines sit at their
    // minute start. Stable sort keeps the parse order inside a tie.
    const ordered = finalEntries
      .map((e, i) => ({ e, i }))
      .sort((a, b) => {
        const ka = a.e.key ?? "9999";
        const kb = b.e.key ?? "9999";
        if (ka !== kb) return ka.localeCompare(kb);
        const ta = a.e.tsMs ?? Number.MAX_SAFE_INTEGER;
        const tb = b.e.tsMs ?? Number.MAX_SAFE_INTEGER;
        if (ta !== tb) return ta - tb;
        return a.i - b.i;
      })
      .map((x) => x.e);

    const body = renderBody(g.digits, ordered);
    // Overflow rolls the newest content into a " · #2" note (day-note.ts's
    // own rollover convention), reusing the existing part-2 note when the
    // group has one. A LONE oversized group (no second note to roll into)
    // keeps the full body — an oversized note beats lost lines, and the live
    // writers will roll it over naturally on the next append.
    let chunk1 = body;
    let chunk2: string | null = null;
    if (body.length > NOTE_MAX_CHARS) {
      const cut = body.slice(0, NOTE_MAX_CHARS);
      const boundary = cut.lastIndexOf("\n**— ");
      const at = boundary > 0 ? boundary + 1 : NOTE_MAX_CHARS;
      chunk1 = body.slice(0, at);
      chunk2 = body.slice(at).trimStart();
    }
    const part2 =
      chunk2 !== null
        ? sources.find((n) => n.title === `WhatsApp · +${g.digits} · #2`) ??
          sources.sort((a, b) => b.markdown.length - a.markdown.length)[0] ??
          null
        : null;
    const survivorBody = chunk2 !== null && part2 ? chunk1 : body;
    if (survivorBody !== survivor.markdown) {
      statements.push(
        `update ${schema}.note set "bodyV2Markdown" = ${esc(survivorBody)}, "updatedAt" = now() where id = ${esc(survivor.id)};`
      );
      stats.notesRerendered++;
      if (!COMMIT) {
        // Dry-run diagnostics: WHICH lines does the note lack / carry extra?
        // Multiset-aware — a duplicate-count drift hides in plain sets.
        const tally = (lines: string[]) => {
          const m = new Map<string, number>();
          for (const l of lines) {
            const t = l.trim();
            if (t) m.set(t, (m.get(t) ?? 0) + 1);
          }
          return m;
        };
        const have = tally(survivor.markdown.split("\n"));
        const want = tally(survivorBody.split("\n"));
        const missing: string[] = [];
        const extra: string[] = [];
        for (const [l, c] of want) for (let i = c - (have.get(l) ?? 0); i > 0; i--) missing.push(l);
        for (const [l, c] of have) for (let i = c - (want.get(l) ?? 0); i > 0; i--) extra.push(l);
        console.log(
          `  DIFF …${g.tail9}: +${missing.length}/-${extra.length}` +
            missing.slice(0, 6).map((l) => `\n    ADD ${l.slice(0, 110)}`).join("") +
            extra.slice(0, 6).map((l) => `\n    DEL ${l.slice(0, 110)}`).join("")
        );
      }
    }
    if (chunk2 !== null && part2) {
      if (part2.title !== `WhatsApp · +${g.digits} · #2` || part2.markdown !== chunk2) {
        statements.push(
          `update ${schema}.note set title = ${esc(`WhatsApp · +${g.digits} · #2`)}, "bodyV2Markdown" = ${esc(chunk2)}, "updatedAt" = now() where id = ${esc(part2.id)};`
        );
        console.log(`  …${g.tail9}: body exceeds ${NOTE_MAX_CHARS} — rolled over into " · #2"`);
      }
      sources.splice(sources.indexOf(part2), 1);
    }

    if (PRINT) {
      console.log(`\n----- …${g.tail9} (${survivor.title}) -----\n${body}\n-----`);
    }

    // Carry noteTargets and attachments over, then soft-delete the sources.
    const survivorTargets = new Set(
      targetRows.filter((t) => t.noteId === survivor!.id).map((t) => t.targetOpportunityId ?? t.targetPersonId)
    );
    for (const n of sources) {
      for (const t of targetRows.filter((t) => t.noteId === n.id)) {
        const targetId = t.targetOpportunityId ?? t.targetPersonId;
        if (!targetId || survivorTargets.has(targetId)) continue;
        const cols = t.targetOpportunityId ? `"noteId", "targetOpportunityId"` : `"noteId", "targetPersonId"`;
        statements.push(`insert into ${schema}."noteTarget" (${cols}) values (${esc(survivor.id)}, ${esc(targetId)});`);
        survivorTargets.add(targetId);
      }
      statements.push(
        `update ${schema}.attachment set "targetNoteId" = ${esc(survivor.id)}, "updatedAt" = now() where "targetNoteId" = ${esc(n.id)};`
      );
      statements.push(`update ${schema}.note set "deletedAt" = now() where id = ${esc(n.id)};`);
      stats.mergedNotes++;
      for (const t of targetRows.filter((t) => t.noteId === n.id && t.targetOpportunityId)) {
        stats.cardsTouched.add(t.targetOpportunityId as string);
      }
    }

    // ── Media attach (4a): file on disk, attachment missing → upload+file ──
    if (personId) {
      const existing = new Set(
        psqlJson<{ name: string }>(
          container,
          `select name from ${schema}.attachment
            where "deletedAt" is null and "targetPersonId" = ${esc(personId)}`
        ).map((a) => a.name)
      );
      for (const job of mediaJobs) {
        const base = mediaFileName(job.mediaPath);
        if (existing.has(base)) {
          stats.attachExisting++;
          continue;
        }
        if (classifyWaMedia(job.mediaPath) !== "upload") continue;
        if (!COMMIT) {
          stats.attached++; // would attach
          continue;
        }
        try {
          const res = await attachWaMediaToTwenty(twenty!, {
            mediaPath: job.mediaPath,
            personId,
            opportunityId,
            noteId: survivor.id,
          });
          if (res.attached) stats.attached++;
          else stats.attachExisting++; // "duplicate" per the REST-side recheck
        } catch (e) {
          stats.attachFailed++;
          console.log(`  ATTACH FAIL …${g.tail9} ${base}: ${(e as Error).message.slice(0, 120)}`);
        }
      }
    }
  }

  if (COMMIT && statements.length > 0) {
    psql(container, `begin;\n${statements.join("\n")}\ncommit;`);
    console.log(`committed ${statements.length} statements (incl. attachment re-targets)`);
  }
  console.log(
    `${COMMIT ? "" : "(dry-run) would "}merge+delete: ${stats.mergedNotes}, retitle: ${stats.retitled}, ` +
      `re-rendered: ${stats.notesRerendered}, cards: ${stats.cardsTouched.size}, skipped: ${stats.skipped}\n` +
      `  backfilled lines: →${stats.backfillOutbound} outbound, ←${stats.backfillInbound} inbound; ` +
      `[no message] dropped: ${stats.droppedNoMessage}\n` +
      `  media: linked ${stats.mediaLinked}, ${COMMIT ? "attached" : "would attach"} ${stats.attached}, ` +
      `already filed ${stats.attachExisting}, failed ${stats.attachFailed}; ` +
      `unrecoverable: ${stats.unrecoverableOffline} (line offline 08-26→29) + ${stats.unrecoverableExpired} (older); ` +
      `truncation fragments absorbed: ${stats.fragmentsAbsorbed}`
  );
  if (unkeyed.length > 0) {
    for (const n of unkeyed.slice(0, 10)) console.log(`  UNKEYED qc note ${n.id} (no tail via targets)`);
  }
  return stats;
}

async function main(): Promise<void> {
  try {
    for (const t of targets) {
      await mergeInstance(t);
    }
  } finally {
    await pool.end();
  }
}

// Importable for the parser tests; only a direct run executes the merge.
if (process.argv[1]?.endsWith("merge-wa-conversation-notes.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

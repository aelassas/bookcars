// QC chat transcripts (Mohamd 2026-08-18): the QC team needs the FULL WhatsApp
// conversation on the card — including what OUR agents wrote, not only the
// client's lines (the lead relay's notes are inbound-only by design).
//
// RETIRED AS A BEAT 2026-08-29 (Ayham, card #593 — one chat split across
// three notes): the continuous day note ("WhatsApp · +<phone>") written by
// run-wa-twenty-sync now carries BOTH directions with media attached, making
// this a duplicate writer. sync-heartbeat no longer schedules this script;
// it stays here for a manual history pass only. The notes it wrote are
// folded into the day note by scripts/merge-wa-conversation-notes.ts.
//
// For every rental-tenant thread with new activity since the checkpoint this
// pass upserts ONE note per opportunity, titled "💬 Chat transcript (auto)",
// whose body is the last ~60 lines of the two-way conversation. The note is
// REWRITTEN each time (never appended) so the card always carries one current
// transcript instead of a pile of fragments.
//
// DRY-RUN BY DEFAULT — no Twenty writes, no checkpoint move until --commit.
//
// Usage (from platform/):
//   npx tsx scripts/run-qc-transcript.ts --once            # dry-run
//   npx tsx scripts/run-qc-transcript.ts --once --commit   # live single pass
//   npx tsx scripts/run-qc-transcript.ts --commit          # poll forever
//
// Env: QC_TRANSCRIPT_POLL_MS (default 300000), DATABASE_URL, TWENTY_RENTAL_*.
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { sql } from "drizzle-orm";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  twentyInstanceForTenantSlug,
} from "@/platform/integrations/twenty/instance";
import { brandLineForTenantSlug } from "@/platform/integrations/twenty/mirror";
import { fetchOpportunitiesForTails } from "@/platform/integrations/twenty/deal-link";
import { mediaUrl } from "@/platform/media/token";

const RENTAL_SLUGS = ["cardiwan", "easyrent"];
const NOTE_TITLE = "💬 Chat transcript (auto)";
const MAX_LINES = 60;
const MAX_BODY_CHARS = 8000;
const CHECKPOINT_ENTITY = "qc_transcript";
const ONCE = process.argv.includes("--once");
const COMMIT = process.argv.includes("--commit");
/** Ignore the checkpoint once — rewrite every thread active in the last 7
 *  days (used after a formatter change so old notes pick up the new render). */
const REBUILD = process.argv.includes("--rebuild");
const POLL_MS = Number(process.env.QC_TRANSCRIPT_POLL_MS ?? "") || 300_000;

function rows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

interface MsgRow {
  direction: string;
  body: string | null;
  line: string | null;
  created_at: string;
  media_path: string | null;
}

async function loadCheckpoint(tenantId: string): Promise<Date | null> {
  const res = await db.execute(sql`
    SELECT counts->>'checkpoint' AS cp FROM twenty_mirror_state
     WHERE tenant_id = ${tenantId} AND entity = ${CHECKPOINT_ENTITY}
  `);
  const cp = rows<{ cp: string | null }>(res)[0]?.cp;
  return cp && !Number.isNaN(Date.parse(cp)) ? new Date(cp) : null;
}

async function saveCheckpoint(tenantId: string, at: Date): Promise<void> {
  await db.execute(sql`
    INSERT INTO twenty_mirror_state (tenant_id, entity, cursor, counts, status, updated_at)
    VALUES (${tenantId}, ${CHECKPOINT_ENTITY}, '', ${JSON.stringify({ checkpoint: at.toISOString() })}::jsonb, 'running', now())
    ON CONFLICT (tenant_id, entity)
    DO UPDATE SET counts = ${JSON.stringify({ checkpoint: at.toISOString() })}::jsonb, updated_at = now()
  `);
}

/** tail9s whose conversation (either direction) changed since the checkpoint.
 *  Outbound rows carry the CHAT jid in "from" (often @lid) — they join to a
 *  person through any inbound row of the same chat that logged a real phone. */
async function activeTails(tenantId: string, since: Date): Promise<string[]> {
  const res = await db.execute(sql`
    WITH chat_phone AS (
      SELECT DISTINCT "from" AS chat,
             right(regexp_replace(COALESCE(from_pn, "from"), '\\D', '', 'g'), 9) AS tail
        FROM message
       WHERE tenant_id = ${tenantId} AND channel = 'whatsapp' AND direction = 'inbound'
         AND "from" NOT LIKE '%@g.us'
         AND length(regexp_replace(COALESCE(from_pn, "from"), '\\D', '', 'g')) >= 9
    )
    SELECT DISTINCT cp.tail
      FROM message m
      JOIN chat_phone cp ON cp.chat = m."from"
     WHERE m.tenant_id = ${tenantId} AND m.channel = 'whatsapp'
       AND m.created_at > ${since} AND m.body IS NOT NULL AND m."from" NOT LIKE '%@g.us'
     LIMIT 40
  `);
  return rows<{ tail: string }>(res).map((r) => r.tail);
}

/** The last MAX_LINES of the two-way direct-chat conversation for one tail9. */
async function threadLines(tenantId: string, tail: string): Promise<MsgRow[]> {
  const res = await db.execute(sql`
    WITH chats AS (
      SELECT DISTINCT "from" AS chat
        FROM message
       WHERE tenant_id = ${tenantId} AND channel = 'whatsapp' AND direction = 'inbound'
         AND "from" NOT LIKE '%@g.us'
         AND right(regexp_replace(COALESCE(from_pn, "from"), '\\D', '', 'g'), 9) = ${tail}
    )
    SELECT direction, body, "to" AS line, created_at, media_path
      FROM message
     WHERE tenant_id = ${tenantId} AND channel = 'whatsapp'
       AND "from" IN (SELECT chat FROM chats) AND body IS NOT NULL
     ORDER BY created_at DESC
     LIMIT ${MAX_LINES}
  `);
  return rows<MsgRow>(res).reverse();
}

const AUDIO_EXT = /\.(ogg|opus|mp3|m4a|wav|aiff)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/** One message body → what the QC reader sees. Media placeholders become
 *  labelled transcripts/descriptions, with a playable /api/media link when the
 *  file was saved (Mohamd 2026-08-18: "the audio shall be available"). */
export function renderLine(m: MsgRow): string {
  let text = (m.body ?? "").trim();
  // The importer's upgrade kept the original placeholder as a "caption",
  // producing "[voice/audio] [voice] transcript" — collapse the noise.
  text = text
    .replace(/^\[voice\/audio\]\s*\[voice\]\s*/i, "🎙 Voice — ")
    .replace(/^\[voice\/audio\]\s*\[image\]\s*/i, "🖼 Photo — ")
    .replace(/^\[(voice|voice\/audio|audio)\]\s+(?=\S)/i, "🎙 Voice — ")
    .replace(/^\[image\]\s+(?=\S)/i, "🖼 Photo — ")
    .replace(/^\[document\]\s+(?=\S)/i, "📄 Document — ");
  if (/^\[(voice\/audio|voice|audio)\]$/i.test(text)) text = "🎙 Voice message (no transcript)";
  if (/^\[image\]$/i.test(text)) text = "🖼 Photo";
  if (/^\[document\]$/i.test(text)) text = "📄 Document";
  if (/^\[(non-text|no message|sticker)\]$/i.test(text)) text = "📎 Media message";

  if (m.media_path) {
    if (AUDIO_EXT.test(m.media_path)) text += ` [▶️ Listen](${mediaUrl(m.media_path)})`;
    else if (IMAGE_EXT.test(m.media_path)) text += ` [🔗 View](${mediaUrl(m.media_path)})`;
  }
  return text;
}

/** "2026-08-19 11:50" in DUBAI wall time (owner 2026-08-19: "the time of the
 *  messages isn't accurate" — UTC ISO stamps read 4 hours behind the office
 *  clock and every "when did they write?" became arithmetic). */
function fmtDubai(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d).replace(", ", " ");
}

function formatBody(lines: MsgRow[]): string {
  const out: string[] = [];
  for (const m of lines) {
    const at = fmtDubai(m.created_at);
    const who = m.direction === "outbound" ? `**Agent${m.line ? ` (${m.line})**` : "**"}` : "Client";
    out.push(`${who} · ${at}: ${renderLine(m)}`);
  }
  let body = out.join("\n\n");
  if (body.length > MAX_BODY_CHARS) body = "…\n\n" + body.slice(-MAX_BODY_CHARS);
  return body;
}

async function upsertNote(
  client: ReturnType<typeof getTwentyClientForInstance>,
  opportunityId: string,
  body: string
): Promise<"created" | "updated"> {
  // Find our transcript note among the card's note targets (bounded: cards
  // carry a handful of notes; the title is the idempotency key).
  for await (const t of client.listAll<Record<string, unknown>>("noteTargets", {
    filter: `targetOpportunityId[eq]:${opportunityId}`,
  })) {
    const noteId = typeof t.noteId === "string" ? t.noteId : null;
    if (!noteId) continue;
    try {
      const res = await client.get<Record<string, Record<string, unknown>>>(`notes/${noteId}`);
      const note = (res?.data?.note ?? {}) as Record<string, unknown>;
      if (note.title === NOTE_TITLE) {
        await client.patch(`notes/${noteId}`, { bodyV2: { markdown: body, blocknote: null } });
        return "updated";
      }
    } catch {
      /* a deleted note's target — keep looking */
    }
  }
  const created = await client.batchCreate("notes", [
    { title: NOTE_TITLE, bodyV2: { markdown: body, blocknote: null } },
  ]);
  const noteId = (created[0] as Record<string, unknown> | undefined)?.id;
  if (typeof noteId !== "string") throw new Error("note created without id");
  await client.batchCreate("noteTargets", [{ noteId, targetOpportunityId: opportunityId }]);
  return "created";
}

async function main() {
  console.log(`[qc-transcript] starting mode=${COMMIT ? "COMMIT" : "dry-run"} once=${ONCE}`);
  for (;;) {
    for (const slug of RENTAL_SLUGS) {
      try {
        const t = rows<{ id: string }>(
          await db.execute(sql`SELECT id FROM tenant WHERE slug = ${slug}`)
        )[0];
        if (!t) continue;
        const key = twentyInstanceForTenantSlug(slug);
        if (!resolveTwentyInstance(key).configured) continue;
        const client = getTwentyClientForInstance(key);
        const passStart = new Date();
        const since = REBUILD
          ? new Date(passStart.getTime() - 7 * 86_400_000)
          : (await loadCheckpoint(t.id)) ?? new Date(passStart.getTime() - 2 * 86_400_000);
        const tails = await activeTails(t.id, since);
        if (tails.length === 0) {
          if (COMMIT) await saveCheckpoint(t.id, passStart);
          continue;
        }
        const index = await fetchOpportunitiesForTails(client, tails, brandLineForTenantSlug(slug));
        let written = 0;
        let failed = 0;
        for (const tail of tails) {
          const match = index.get(tail);
          if (!match?.id) continue;
          try {
            const lines = await threadLines(t.id, tail);
            if (lines.length === 0) continue;
            if (COMMIT) {
              const what = await upsertNote(client, match.id, formatBody(lines));
              written++;
              console.log(`[qc-transcript] ${slug} …${tail} transcript ${what} (${lines.length} lines)`);
            } else {
              written++;
              console.log(`[qc-transcript] ${slug} DRY …${tail} would write ${lines.length} lines`);
            }
          } catch (e) {
            failed++;
            console.error(`[qc-transcript] ${slug} …${tail} failed: ${(e as Error).message.slice(0, 160)}`);
          }
        }
        // Failed threads hold the checkpoint so they retry next pass.
        if (COMMIT && failed === 0) await saveCheckpoint(t.id, passStart);
        console.log(`[qc-transcript] ${slug}: tails=${tails.length} written=${written} failed=${failed}`);
      } catch (e) {
        console.error(`[qc-transcript] ${slug} pass failed: ${(e as Error).message.slice(0, 200)}`);
      }
    }
    if (ONCE) break;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });

/**
 * flag-needs-reply.ts — the red dot on a sales card.
 *
 * Ayham/team, 2026-09-29 (Bitrix had this): a card should show at a glance that
 * the customer is waiting on us. Twenty has no such badge natively, so we drive
 * an emoji field. The `needsReply` TEXT field on the opportunity holds "🔴"
 * when the customer is owed a reply and "" (empty) when they are not; it is
 * shown first on the kanban card face.
 *
 * A card NEEDS a reply when, for its customer's phone (phoneTail9), the newest
 * INBOUND message/call event is newer than the newest OUTBOUND one — i.e. the
 * last word is theirs and nobody answered — and that has been true for longer
 * than a short grace period (so an agent isn't dinged the instant a message
 * lands). This single rule covers all three cases the owner picked:
 *   - unanswered inbound WhatsApp,
 *   - a missed / unreturned call (call events ride the same message stream),
 *   - no reply for X hours (the same "last is inbound" state, aged).
 * Call events count as inbound activity; an outbound call OR message clears it.
 *
 * SALES workspace only (twenty-db-1 :3001). The message history is read from
 * the mycrm Postgres (the source of truth for inbound/outbound). Only cards
 * whose flag actually flips are patched, so a quiet pass writes nothing.
 *
 * Runs on the 5-min beat. Dry-run by default; --commit writes.
 *
 *   npx tsx scripts/flag-needs-reply.ts            # report
 *   npx tsx scripts/flag-needs-reply.ts --commit   # write
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { execFileSync } from "node:child_process";
import { pool } from "@/platform/db/client";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";

const SALES_DB_CONTAINER = process.env.TWENTY_SALES_DB_CONTAINER ?? "twenty-db-1";
const SALES_SCHEMA = process.env.TWENTY_SALES_SCHEMA ?? "workspace_8fj54z04p0s0zrognxhkd2f0a";
/** Grace before a fresh inbound raises the dot — agents get a moment to reply. */
const GRACE_MIN = Number(process.env.NEEDS_REPLY_GRACE_MIN ?? 15);
const DOT = "🔴";

const COMMIT = process.argv.includes("--commit");

function psql(sql: string): string {
  return execFileSync(
    "docker",
    ["exec", "-i", SALES_DB_CONTAINER, "psql", "-U", "postgres", "-d", "default", "-At", "-F", "\t", "-c", sql],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const twenty = getTwentyClientForInstance("default");
  if (twenty.mode === "mock") throw new Error("sales Twenty in MOCK mode — refusing to run");

  // ── Open cards on the two boards, with their current flag. Only cards on a
  //    board matter — an archived card needs no dot.
  const cardRows = psql(
    `select id, "phoneTail9", coalesce("needsReply",'')
       from ${SALES_SCHEMA}.opportunity
      where "deletedAt" is null
        and "phoneTail9" is not null and "phoneTail9" <> ''
        and ("primaryStage" is not null or "salesStage" is not null)`
  ).trim();
  const cards = cardRows
    ? cardRows.split("\n").map((l) => {
        const [id, tail, flag] = l.split("\t");
        return { id, tail: tail ?? "", flag: flag ?? "" };
      })
    : [];
  if (cards.length === 0) {
    console.log("[needs-reply] no cards on the boards");
    return;
  }

  // ── For every tail9 on a board, the last inbound vs last outbound moment,
  //    from the mycrm message stream (whatsapp + call events; groups excluded).
  //    One round-trip, keyed by the 9-digit tail the cards use.
  const tails = [...new Set(cards.map((c) => c.tail))];
  const res = await pool.query<{ tail: string; last_in: Date | null; last_out: Date | null }>(
    `select right(regexp_replace(coalesce(nullif(from_pn,''), "from", ''), '[^0-9]', '', 'g'), 9) as tail,
            max(created_at) filter (where direction = 'inbound')  as last_in,
            max(created_at) filter (where direction = 'outbound') as last_out
       from message
      where "from" not like '%@g.us'
        and right(regexp_replace(coalesce(nullif(from_pn,''), "from", ''), '[^0-9]', '', 'g'), 9) = any($1::text[])
      group by 1`,
    [tails]
  );
  const now = Date.now();
  const graceMs = GRACE_MIN * 60_000;
  const want = new Map<string, boolean>(); // tail -> needs reply?
  for (const r of res.rows) {
    const lin = r.last_in ? r.last_in.getTime() : null;
    const lout = r.last_out ? r.last_out.getTime() : null;
    const unanswered = lin != null && (lout == null || lin > lout);
    want.set(r.tail, unanswered && now - (lin ?? now) > graceMs);
  }

  let raise = 0;
  let clear = 0;
  const changes: { id: string; to: string }[] = [];
  for (const c of cards) {
    const needs = want.get(c.tail) ?? false;
    const target = needs ? DOT : "";
    if (c.flag === target) continue;
    changes.push({ id: c.id, to: target });
    if (needs) raise++;
    else clear++;
  }

  console.log(`[needs-reply] ${cards.length} cards on boards · raise ${raise} · clear ${clear} · unchanged ${cards.length - changes.length}`);

  if (!COMMIT) {
    console.log("DRY-RUN — nothing written.");
    return;
  }

  let done = 0;
  let failed = 0;
  for (const ch of changes) {
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        await twenty.patch(`opportunities/${ch.id}`, { needsReply: ch.to });
        done++;
        break;
      } catch (e) {
        const msg = (e as Error).message;
        if (/429|timed out|5\d\d/.test(msg) && attempt < 5) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        failed++;
        if (failed <= 5) console.error(`  ${ch.id}: ${msg.slice(0, 120)}`);
        break;
      }
    }
    await sleep(120);
  }
  console.log(`[needs-reply] wrote ${done}; ${failed} failed.`);
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });

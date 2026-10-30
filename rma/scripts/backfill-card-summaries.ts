/**
 * backfill-card-summaries.ts — fill the empty callSummary on WA/B2B lead cards.
 *
 * The wa-lead-relay and b2b-matcher learned to write callSummary + the
 * original thread note at CREATE time on 2026-08-13. Cards created BEFORE
 * that show the bare "Call Summary (AI)" placeholder on the board. This pass
 * recomputes the summary from the stored messages (same threadSummaryLine the
 * relay uses — the customer's own first substantive line, never invented
 * prose) and PATCHes it in. Notes are NOT backfilled (they'd duplicate).
 *
 *   npx tsx scripts/backfill-card-summaries.ts              # dry run
 *   npx tsx scripts/backfill-card-summaries.ts --commit
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import type { TwentyInstanceKey } from "@/platform/integrations/twenty/instance";
import { threadSummaryLine } from "@/platform/integrations/twenty/wa-lead-relay";
import type { LeadThread } from "@/platform/integrations/twenty/wa-lead-relay";

const COMMIT = process.argv.includes("--commit");
const INSTANCE_KEYS: TwentyInstanceKey[] = ["default", "rental"];

type Card = {
  id: string;
  name: string;
  phoneTail9: string | null;
  externalId: string | null;
  callSummary: string | null;
};

async function main() {
  for (const key of INSTANCE_KEYS) {
    const client = getTwentyClientForInstance(key);
    const cards: Card[] = [];
    for await (const card of client.listAll<Card>("opportunities")) {
      if (!card.externalId) continue;
      if (!card.externalId.startsWith("wa-lead:") && !card.externalId.startsWith("b2b-demand:")) continue;
      if (card.callSummary && card.callSummary.trim()) continue;
      cards.push(card);
    }
    console.log(`[backfill-summaries] ${key}: ${cards.length} card(s) missing a summary`);

    let patched = 0, skipped = 0, failed = 0;
    for (const card of cards) {
      const tail = card.phoneTail9 ?? card.externalId!.split(":").pop()!;
      try {
        const rows = await pool.query(
          `SELECT body, created_at FROM message
           WHERE right(regexp_replace(coalesce(nullif(from_pn,''), "from", ''),'\\D','','g'),9) = $1
             AND body IS NOT NULL AND length(body) > 0
           ORDER BY created_at ASC LIMIT 50`,
          [tail]
        );
        const thread: LeadThread = {
          key: tail,
          digits: tail,
          channel: card.externalId!.startsWith("b2b-demand:") ? "whatsapp" : "whatsapp",
          participantName: null,
          sourceContext: null,
          contextChannel: null,
          lineSlug: null,
          lines: rows.rows.map((r: { body: string; created_at: Date }) => ({ body: r.body, at: r.created_at })),
          lastActivityAt: new Date(),
        };
        const summary = threadSummaryLine(thread);
        if (!summary) { skipped++; continue; }
        console.log(`  ${COMMIT ? "PATCH" : "DRY  "} ${card.name.slice(0, 55)} → "${summary.slice(0, 90)}"`);
        if (COMMIT) {
          await client.patch(`opportunities/${card.id}`, { callSummary: summary });
        }
        patched++;
      } catch (e) {
        failed++;
        console.warn(`  FAIL ${card.id}: ${(e as Error).message.slice(0, 120)}`);
      }
    }
    console.log(`[backfill-summaries] ${key}: patched=${patched} skippedNoText=${skipped} failed=${failed}`);
  }
  await pool.end();
}
main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });

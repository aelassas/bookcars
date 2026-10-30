/**
 * Re-derive board_item.assigned_to from BRAND_OWNERS.
 *
 * assigned_to is PERSISTED on a card when it is first routed or escalated, so
 * it freezes whatever the owner map said that day. When the map is corrected,
 * every card already on the board keeps pointing at the wrong human — and the
 * board is exactly where a human is supposed to pick work up, so a stale owner
 * is not cosmetic: it decides whose day the card appears in and who gets the
 * SLA nudge.
 *
 * Two kinds of staleness this fixes (both found live 2026-08-05):
 *   1. WRONG PERSON — 204 open cards from babek-rent-2 sat on `babek`, but that
 *      line is Ali's: he signs "Hi sir, this is Ali from Easy Rent" ×16 in 30
 *      days. Every card and escalation of the busiest rent line went to Babek
 *      while Ali's own day looked empty.
 *   2. DEAD KEY — `cardiwan-manager` (79) and `easyrent-manager` (9) are owner
 *      keys that no longer exist in BRAND_OWNERS at all, so escalation resolved
 *      them to nobody and silently skipped the card.
 *
 * Only rows whose line HAS an owner in the map are touched, and only when the
 * stored value differs. Idempotent. DRY-RUN default; --commit to write.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { BRAND_OWNERS } from "@/modules/board/owners";

const COMMIT = process.argv.includes("--commit");
/** Also re-point cards that are already CLOSED, not just the open board. */
const ALL_STATUSES = process.argv.includes("--all-statuses");

async function main() {
  const statusClause = ALL_STATUSES ? "" : " AND status = 'open'";
  let total = 0;

  for (const [line, owner] of Object.entries(BRAND_OWNERS)) {
    const sel = await pool.query(
      `SELECT assigned_to, count(*)::int n FROM board_item
        WHERE source_line = $1 AND (assigned_to IS DISTINCT FROM $2)${statusClause}
        GROUP BY assigned_to`,
      [line, owner.key]
    );
    if (sel.rows.length === 0) continue;
    for (const r of sel.rows as { assigned_to: string | null; n: number }[]) {
      console.log(
        `[owners] ${line}: ${r.n} card(s) ${r.assigned_to ?? "(unassigned)"} → ${owner.key}${COMMIT ? "" : "  (dry)"}`
      );
      total += r.n;
    }
    if (COMMIT) {
      await pool.query(
        `UPDATE board_item SET assigned_to = $2, updated_at = now()
          WHERE source_line = $1 AND (assigned_to IS DISTINCT FROM $2)${statusClause}`,
        [line, owner.key]
      );
    }
  }

  // Lines on the board with no owner in the map at all: never silently ignore
  // these — a card nobody owns is a card nobody works.
  const orphan = await pool.query(
    `SELECT source_line, count(*)::int n FROM board_item
      WHERE source_line IS NOT NULL AND NOT (source_line = ANY($1::text[]))${statusClause}
      GROUP BY source_line ORDER BY 2 DESC`,
    [Object.keys(BRAND_OWNERS)]
  );
  for (const r of orphan.rows as { source_line: string; n: number }[]) {
    console.warn(`[owners] ⚠️  line '${r.source_line}' has ${r.n} card(s) and NO owner in BRAND_OWNERS — add it.`);
  }

  console.log(COMMIT ? `[owners] done — ${total} card(s) re-pointed` : `[owners] DRY TOTAL: ${total} card(s) would move`);

  const after = await pool.query(
    `SELECT source_line, assigned_to, count(*)::int n FROM board_item
      WHERE status = 'open' AND source_line IS NOT NULL GROUP BY 1,2 ORDER BY 1`
  );
  console.table(after.rows);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });

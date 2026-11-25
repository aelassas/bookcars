import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";

/**
 * Recompute deal.last_activity_at from the Bitrix archive, matching only
 * DEAL payloads.
 *
 * Why this exists: migration 0046 backfilled the column with
 *
 *     WHERE ie.provider = 'bitrix24' AND ie.raw_payload->>'ID' = d.external_id
 *
 * and no filter on entity type. Bitrix numbers contacts, leads, deals and
 * companies in separate sequences, so deal #4211 happily matched contact
 * #4211's payload and took ITS LAST_ACTIVITY_TIME. Measured on production
 * 2026-07-25: 95,565 Bitrix deals, only 34,684 with a correctly-typed archive
 * row, and 60,881 matching a row of the wrong type.
 *
 * That column decides which deals the dashboard counts as the live pipeline
 * (the 90-day window in modules/dashboard/queries.ts), so a wrong date does
 * not just look untidy — it decides what a manager sees as their funnel.
 *
 * ORDER MATTERS: run a FULL Bitrix reconcile first. Until the archive is
 * repopulated with entity-qualified provider_event_ids, most deals still have
 * no deal-typed archive row and this script can only tell you so. It reports
 * that count instead of guessing.
 *
 *   npx tsx scripts/recompute-deal-activity.ts            # dry run, default
 *   npx tsx scripts/recompute-deal-activity.ts --apply
 */

const APPLY = process.argv.includes("--apply");

// The same COALESCE 0046 used — Bitrix's own activity stamp, then its
// modification stamp, then creation. deal.created_at is deliberately not in
// the chain: it holds the import timestamp, so every deal would look like it
// was created the day we pulled it.
const SOURCE_EXPR = `COALESCE(
  (ie.raw_payload->>'LAST_ACTIVITY_TIME')::timestamptz,
  (ie.raw_payload->>'DATE_MODIFY')::timestamptz,
  (ie.raw_payload->>'DATE_CREATE')::timestamptz)`;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const c = await pool.connect();
  try {
    const { rows: cov } = await c.query(`
      SELECT count(*) FILTER (WHERE d.external_source = 'bitrix24') AS bitrix_deals,
             count(*) FILTER (WHERE ie.id IS NOT NULL)              AS with_deal_payload
        FROM deal d
        LEFT JOIN LATERAL (
          SELECT ie.id FROM integration_event ie
           WHERE ie.provider = 'bitrix24'
             AND ie.normalized_type = 'bitrix24.deal'
             AND ie.raw_payload->>'ID' = d.external_id
           LIMIT 1) ie ON true
       WHERE d.external_source = 'bitrix24'`);

    const total = Number(cov[0].bitrix_deals);
    const covered = Number(cov[0].with_deal_payload);
    console.log(`Bitrix deals: ${total}`);
    console.log(`  with a deal-typed archive row: ${covered}`);
    console.log(`  without one (cannot be dated): ${total - covered}`);

    if (covered < total * 0.9) {
      console.warn(
        `\n⚠ Archive coverage is ${((covered / total) * 100).toFixed(1)}%. Run a FULL Bitrix\n` +
          `  reconcile before applying, or most deals keep whatever 0046 left them.`,
      );
    }

    // How many rows the correctly-typed source disagrees with today.
    const { rows: diff } = await c.query(`
      SELECT count(*) AS n
        FROM deal d
        JOIN integration_event ie
          ON ie.provider = 'bitrix24'
         AND ie.normalized_type = 'bitrix24.deal'
         AND ie.raw_payload->>'ID' = d.external_id
       WHERE d.external_source = 'bitrix24'
         AND d.last_activity_at IS DISTINCT FROM ${SOURCE_EXPR}`);
    console.log(`\nRows whose date would change: ${diff[0].n}`);

    if (!APPLY) {
      console.log("\nDry run — nothing written. Re-run with --apply to write.");
      return;
    }

    await c.query("BEGIN");
    const res = await c.query(`
      UPDATE deal d
         SET last_activity_at = ${SOURCE_EXPR}
        FROM integration_event ie
       WHERE ie.provider = 'bitrix24'
         AND ie.normalized_type = 'bitrix24.deal'
         AND ie.raw_payload->>'ID' = d.external_id
         AND d.external_source = 'bitrix24'
         AND d.last_activity_at IS DISTINCT FROM ${SOURCE_EXPR}`);
    await c.query("COMMIT");
    console.log(`✓ updated ${res.rowCount} deals`);
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

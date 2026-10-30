/**
 * run-dubizzle-enrich.ts — the arbitrage helper (owner order 2026-07-24).
 *
 * «Client is looking for a car → Firuz goes to Dubizzle, buys it, leases it
 * to own or sells it.» For every FRESH hunter catch (lease_hunt / econ_hunt /
 * hot_inbound with a car), search Dubizzle for matching cars at/below the
 * client's budget and follow up the hunter's ping with the top finds — so
 * the manager sees the client AND the purchasable car in one thread.
 *
 * Runs from notify-heartbeat once a minute; only touches catches from the
 * last 2 hours that have no dubizzle follow-up yet (ledger dedupe:
 * dzmatch:<notification_id>). Search itself shells out to dz_search.py
 * (scrapling StealthyFetcher — Imperva wall). Non-fatal everywhere: a failed
 * search just leaves no follow-up.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { execFileSync } from "child_process";
import { pool } from "@/platform/db/client";
import { sendNotification } from "@/modules/notify/send";
import { relevantListings } from "@/modules/notify/listing-match";

const PY = "/Users/takeauto/scrapling-env/bin/python";
const SCRIPT = "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/platform/scripts/dz_search.py";
const LIVE = process.env.NOTIFY_LIVE === "true";

type Listing = { title: string; price: number; year: string; km: string; url: string };

async function main() {
  const tid = (await pool.query("SELECT id FROM tenant WHERE slug='take-auto'")).rows[0]?.id;
  if (!tid) process.exit(1);

  // Fresh hunter catches (any tenant's message, but the ledger rows live in
  // take-auto since hunters send from every tenant loop — select ledger rows
  // regardless of tenant) that still lack a dubizzle follow-up.
  const { rows } = await pool.query(`
    SELECT n.id, n.tenant_id, n.target_key, n.entity_id,
           m.extracted_car_text AS car, m.extracted_price_aed AS price,
           m.customer_name, coalesce(m.from_pn, m."from") AS contact
    FROM notification n
    JOIN message m ON m.id::text = n.entity_id
    WHERE n.kind IN ('lease_hunt', 'econ_hunt', 'hot_inbound')
      AND n.status = 'sent'
      AND n.created_at >= now() - interval '2 hours'
      AND m.extracted_car_text IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM notification d
        WHERE d.tenant_id = n.tenant_id AND d.dedupe_key = 'dzmatch:' || n.id::text
      )
    ORDER BY n.created_at DESC
    LIMIT 3`);

  for (const r of rows) {
    let listings: Listing[] = [];
    try {
      const budget = r.price ? String(Math.round(Number(r.price) * 1.1)) : "0";
      const out = execFileSync(PY, [SCRIPT, String(r.car), budget], {
        timeout: 120_000,
        encoding: "utf8",
      });
      listings = JSON.parse(out.trim() || "[]");
    } catch (e) {
      console.error(`[dz-enrich] search failed for "${r.car}":`, (e as Error).message);
      continue; // no ledger row -> retried next tick, up to the 2h window
    }
    // Dubizzle's keyword search is loose and the price cap pulls in whatever is
    // cheap, so the raw top-3 is not an answer to the question. Sending a Nissan
    // to a G63 request is what made the sales team archive this feed on
    // 2026-08-06; silence is cheaper than a wrong car.
    const before = listings.length;
    listings = relevantListings(String(r.car), listings);
    if (before !== listings.length) {
      console.log(`[dz-enrich] car="${r.car}": dropped ${before - listings.length}/${before} irrelevant result(s)`);
    }

    if (listings.length === 0) {
      // Record the miss so we don't re-search the same catch forever.
      await pool.query(
        `INSERT INTO notification (tenant_id, kind, target_key, dedupe_key, status, preview)
         VALUES ($1, 'dz_match', $2, $3, 'backfill', 'no matching dubizzle listing')
         ON CONFLICT (tenant_id, dedupe_key) DO NOTHING`,
        [r.tenant_id, r.target_key, `dzmatch:${r.id}`],
      );
      continue;
    }

    const who = r.customer_name || r.contact;
    const lines = listings.slice(0, 3).map(
      (l) => `• ${l.title}${l.year ? ` ${l.year}` : ""} — ${l.price.toLocaleString()} AED\n  ${l.url}`,
    );
    const res = await sendNotification(r.tenant_id, {
      kind: "dz_match",
      target: { ownerKey: r.target_key },
      text:
        `🛒 For ${who}'s request ("${r.car}"${r.price ? `, budget ~${r.price} AED` : ""}) ` +
        `— found on Dubizzle:\n\n${lines.join("\n")}\n\n` +
        `Buy → lease-to-own or resell. Move while it's listed.`,
      dedupeKey: `dzmatch:${r.id}`,
      dryRun: !LIVE,
    });
    console.log(`[dz-enrich] ${r.target_key} car="${r.car}" → ${listings.length} finds, ${res.outcome}`);
  }
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });

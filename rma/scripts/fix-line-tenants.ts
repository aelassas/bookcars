/**
 * History repair for the line/tenant map (first run 2026-07-23; generalised
 * 2026-08-05 when the map itself turned out to be wrong — see below).
 *
 * Every waobs message carries its line in external_message_id
 * (`waobs:<line>:…`) — the old importer ignored it. This script:
 *   1. stamps message.to = <line> on every waobs row where it's missing;
 *   2. MOVES every row filed under a tenant that is not the one its line maps
 *      to in modules/messaging/lines.ts, clearing customer/lead links (they
 *      point at the OLD tenant's records and would be cross-tenant garbage)
 *      and extraction stamps so the minute-beat stitch re-processes them
 *      inside the right tenant.
 *
 * It used to only rescue rows OUT OF take-auto, which assumed the map was
 * right and only the importer was wrong. On 2026-08-05 the map was itself
 * corrected (Babek's three phones are EasyRent, not Cardiwan), so the repair
 * has to work between ANY pair of tenants — hence the generalisation.
 *
 * Idempotent: re-running finds nothing left to stamp/move.
 * DRY-RUN default; --commit to write.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { LINE_TENANT } from "@/modules/messaging/lines";

const COMMIT = process.argv.includes("--commit");

async function main() {
  const tenants = new Map<string, string>();
  for (const slug of new Set([...Object.values(LINE_TENANT), "take-auto"])) {
    const r = (await pool.query("SELECT id FROM tenant WHERE slug=$1", [slug])).rows[0];
    if (r) tenants.set(slug, r.id);
  }
  // Every tenant that could be holding a mis-filed row, not just take-auto:
  // the 2026-08-05 map fix moves traffic cardiwan → easyrent as well.
  const allTenants = (await pool.query("SELECT id, slug FROM tenant")).rows as { id: string; slug: string }[];

  // 1. Attribution stamp (all tenants, cheap).
  const stamp = await pool.query(
    `${COMMIT ? "" : "EXPLAIN (FORMAT TEXT) "}UPDATE message
     SET "to" = split_part(external_message_id, ':', 2)
     WHERE external_message_id LIKE 'waobs:%' AND ("to" IS NULL OR "to" = '')`
  );
  console.log(COMMIT ? `[stamp] to=<line> set on ${stamp.rowCount} rows` : "[stamp] dry-run (would update all unstamped waobs rows)");

  // 2. Move every mis-tenanted row to the tenant its line actually belongs to,
  //    whichever tenant is currently holding it.
  for (const [line, slug] of Object.entries(LINE_TENANT)) {
    const targetId = tenants.get(slug);
    if (!targetId) { console.warn(`[move] tenant '${slug}' missing — skipping line ${line}`); continue; }
    // Belongs to this line if the waobs id says so OR — for messages WE
    // generated (a queued reply, a notification) — if `to` was stamped with the
    // line. Those have no external_message_id at all: they only ever get one
    // from WhatsApp on delivery, so a reply that failed to send is invisible to
    // an id-only match and would be stranded in the old tenant forever.
    const waobs = `waobs:${line}:%`;
    for (const src of allTenants) {
      if (src.id === targetId) continue; // already home
      if (!COMMIT) {
        const n = await pool.query(
          `SELECT count(*) n FROM message
           WHERE tenant_id = $1
             AND (external_message_id LIKE $2 OR (external_message_id IS NULL AND "to" = $3))`,
          [src.id, waobs, line]
        );
        if (Number(n.rows[0].n) > 0) console.log(`[move] DRY: ${line}: ${src.slug} → ${slug}: ${n.rows[0].n} rows`);
        continue;
      }
      const res = await pool.query(
        `UPDATE message SET
           tenant_id = $1,
           customer_id = NULL,
           related_entity_type = NULL,
           related_entity_id = NULL,
           assigned_to = NULL,
           extracted_at = NULL
         WHERE tenant_id = $2
           AND (external_message_id LIKE $3 OR (external_message_id IS NULL AND "to" = $4))`,
        [targetId, src.id, waobs, line]
      );
      if (res.rowCount) console.log(`[move] ${line}: ${src.slug} → ${slug}: ${res.rowCount} rows`);
    }
  }

  // Summary per tenant.
  const sum = await pool.query(
    `SELECT t.slug, count(m.*) msgs FROM tenant t
     LEFT JOIN message m ON m.tenant_id = t.id AND m.channel='whatsapp'
     GROUP BY t.slug ORDER BY msgs DESC`
  );
  console.table(sum.rows);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });

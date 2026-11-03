// platform/scripts/backfill-stitch.ts
//
// Extraction + stitching over the WhatsApp stream, batched and idempotent.
// Covers BOTH the historical rows and (via sync-heartbeat, forever) every new
// row the observer importer lands.
//
// WATERMARK (the one that PROGRESSES): extracted_at IS NULL. Each row is
// extracted + gets ONE stitch attempt in the same pass, then extracted_at is
// stamped — so the backlog strictly empties. The original version also
// re-selected "extracted but unlinked, <30d" rows every batch; since a stitch
// re-attempt without new CRM data can't succeed, ORDER BY created_at DESC
// returned the SAME unlinked rows forever and the loop spun to LIMIT doing
// nothing (observed on prod: processed=23.5k over 19.9k real rows, 0 links).
//
// Re-stitch of already-extracted-but-unlinked rows is now an EXPLICIT mode:
//   npx tsx scripts/backfill-stitch.ts --restitch [--limit=N]
// It pages by a created_at keyset cursor (strictly progressing) and is meant
// to be run manually after the CRM side gains new phones (e.g. once the
// observer starts resolving @lid JIDs to real numbers — 50% of the stream is
// @lid today, which is WHY most rows stay unlinked for now).
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { extractSignals } from "@/modules/messaging/extract";
import { phoneKey } from "@/modules/messaging/phone";
import { isBroadcast, parseCompetitorPost } from "@/modules/messaging/competitor";

// Multi-tenant since the line/tenant fix (2026-07-23): every business tenant
// with WhatsApp traffic gets its own extraction+stitch pass, matching phones
// against ITS OWN leads/customers.
const TENANT_SLUGS = ["take-auto", "cardiwan", "easyrent"];
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 2000);
const RESTITCH = process.argv.includes("--restitch");
const BATCH = 250;

async function main() {
  for (const slug of TENANT_SLUGS) {
    const tid = (await pool.query("SELECT id FROM tenant WHERE slug=$1", [slug])).rows[0]?.id;
    if (!tid) { console.error(`tenant ${slug} not found — skipped`); continue; }
    console.log(`[stitch] tenant=${slug}`);
    await processTenant(tid);
  }
  await pool.end();
}

async function processTenant(tid: string) {

  let processed = 0, linkedLead = 0, linkedCustomer = 0, ambiguous = 0;
  // --restitch keyset cursor: strictly-descending created_at, so each batch
  // moves past the rows already retried this run even when none get linked.
  let cursor: string | null = null;

  while (processed < LIMIT) {
    type Row = { id: string; from: string | null; from_pn: string | null; body: string | null; created_at: string };
    const { rows }: { rows: Row[] } = RESTITCH
      ? await pool.query(
          `SELECT id, "from", from_pn, body, created_at FROM message
           WHERE tenant_id = $1 AND channel = 'whatsapp' AND direction = 'inbound'
             AND extracted_at IS NOT NULL
             AND related_entity_id IS NULL AND customer_id IS NULL
             AND ($3::timestamptz IS NULL OR created_at < $3)
           ORDER BY created_at DESC
           LIMIT $2`,
          [tid, Math.min(BATCH, LIMIT - processed), cursor]
        )
      : await pool.query(
          `SELECT id, "from", from_pn, body, created_at FROM message
           WHERE tenant_id = $1 AND channel = 'whatsapp' AND direction = 'inbound'
             AND extracted_at IS NULL
           ORDER BY created_at DESC
           LIMIT $2`,
          [tid, Math.min(BATCH, LIMIT - processed)]
        );
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].created_at;

    for (const m of rows) {
      const s = extractSignals(m.body ?? "");
      // Real number behind @lid (0055) beats the raw JID.
      const key = phoneKey(m.from_pn ?? m.from);

      let customerId: string | null = null;
      let leadId: string | null = null;
      if (key) {
        const cust = await pool.query(
          `SELECT id FROM customer
           WHERE tenant_id=$1 AND phone IS NOT NULL
             AND right(regexp_replace(coalesce(phone,''),'\\D','','g'),9)=$2 LIMIT 3`,
          [tid, key]
        );
        const leads = await pool.query(
          `SELECT l.id, EXISTS(SELECT 1 FROM deal d WHERE d.tenant_id=$1
                   AND d.lead_id=l.id AND d.status='open') AS has_open_deal
           FROM lead l
           WHERE l.tenant_id=$1 AND l.phone IS NOT NULL
             AND right(regexp_replace(coalesce(l.phone,''),'\\D','','g'),9)=$2 LIMIT 5`,
          [tid, key]
        );
        if (cust.rows.length === 1) customerId = cust.rows[0].id;
        if (leads.rows.length === 1) leadId = leads.rows[0].id;
        else if (leads.rows.length > 1) {
          const open = leads.rows.filter((r) => r.has_open_deal);
          if (open.length === 1) leadId = open[0].id;
          else ambiguous++;
        }
        if (cust.rows.length > 1) ambiguous++;
      }

      await pool.query(
        `UPDATE message SET
           extracted_car_text=$2, extracted_price_aed=$3, extracted_date_from=$4,
           extracted_date_to=$5, extracted_term_months=$6, extracted_intent=$7,
           extracted_language=$8, extracted_manager_mention=$9, extracted_at=now(),
           customer_id = COALESCE(customer_id, $10),
           related_entity_type = CASE WHEN related_entity_id IS NULL AND $11::uuid IS NOT NULL
                                      THEN 'lead' ELSE related_entity_type END,
           related_entity_id = COALESCE(related_entity_id, $11)
         WHERE tenant_id=$1 AND id=$12`,
        [tid, s.carText, s.priceAed, s.dateFrom, s.dateTo, s.termMonths,
         s.intent, s.language, s.managerMention, customerId, leadId, m.id]
      );
      // Competitor broadcast? Shred it into competitor_offer — this script IS
      // the ingest path for the observer stream (the Meta-webhook projector
      // never sees it, which is why competitor_offer sat empty). Deduped by
      // source_message_id so restitch re-passes can't double-insert.
      if (m.body && isBroadcast(m.body)) {
        try {
          const seen = await pool.query(
            `SELECT 1 FROM competitor_offer WHERE source_message_id = $1 LIMIT 1`, [m.id]);
          if (seen.rows.length === 0) {
            const post = parseCompetitorPost(m.body);
            for (const r of post.rows) {
              await pool.query(
                `INSERT INTO competitor_offer
                   (tenant_id, source_message_id, competitor, source_line, car_text, year, price_aed, posted_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [tid, m.id, post.source, r.sourceLine, r.carText, r.year, r.priceAed, m.created_at]
              );
            }
          }
        } catch (e) {
          console.error("[stitch] competitor shred failed (non-fatal):", (e as Error).message);
        }
      }
      processed++;
      if (leadId) linkedLead++;
      if (customerId) linkedCustomer++;
    }
    console.log(`[stitch] processed=${processed} lead-linked=${linkedLead} customer-linked=${linkedCustomer} ambiguous=${ambiguous}`);
  }
  console.log(`[stitch] DONE processed=${processed} lead=${linkedLead} cust=${linkedCustomer} ambiguous=${ambiguous}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

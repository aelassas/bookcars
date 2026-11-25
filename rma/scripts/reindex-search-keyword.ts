import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { sql } from "drizzle-orm";
import { readFileSync, writeFileSync } from "fs";

/**
 * Incremental KEYWORD search index (FTS + ILIKE, no embeddings — so it's fast
 * enough for the minute beat). Upserts search_doc for lead/customer/deal/message
 * rows changed since the last run, across all brands. This keeps Search fresh
 * without the per-row Ollama embed that makes reindexTenant infeasible at scale.
 * Semantic ranking (embeddings) is a separate, heavier backfill.
 */
const MARKER = "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/platform/.search-reindex-marker";

async function main() {
  let since: string;
  try {
    since = readFileSync(MARKER, "utf8").trim();
  } catch {
    since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  }
  const runAt = new Date();

  // Customers
  await db.execute(sql`
    INSERT INTO search_doc (tenant_id, company_id, source_type, source_id, title, body, embedding, tsv)
    SELECT c.tenant_id, c.company_id, 'customer', c.id, c.name,
           COALESCE(NULLIF(concat_ws(' · ', c.phone, c.email, c.source, c.notes), ''), c.name, 'customer'),
           NULL, to_tsvector('simple', concat_ws(' ', c.name, c.phone, c.email, c.source, c.notes))
    FROM customer c JOIN tenant t ON t.id = c.tenant_id
    WHERE t.slug IN ('cardiwan','easyrent','take-auto') AND c.updated_at >= ${since}
    ON CONFLICT (tenant_id, source_type, source_id) DO UPDATE
      SET title=excluded.title, body=excluded.body, tsv=excluded.tsv, updated_at=now()
  `);

  // Leads (phone + vouched car included)
  await db.execute(sql`
    INSERT INTO search_doc (tenant_id, company_id, source_type, source_id, title, body, embedding, tsv)
    SELECT l.tenant_id, NULL, 'lead', l.id, l.customer_name,
           COALESCE(NULLIF(concat_ws(' · ', l.phone, l.vouched_car, l.status, l.source, l.notes), ''), l.customer_name, 'lead'),
           NULL, to_tsvector('simple', concat_ws(' ', l.customer_name, l.phone, l.vouched_car, l.stage_detail, l.status, l.source, l.notes))
    FROM lead l JOIN tenant t ON t.id = l.tenant_id
    WHERE t.slug IN ('cardiwan','easyrent','take-auto') AND l.updated_at >= ${since}
    ON CONFLICT (tenant_id, source_type, source_id) DO UPDATE
      SET title=excluded.title, body=excluded.body, tsv=excluded.tsv, updated_at=now()
  `);

  // Deals
  await db.execute(sql`
    INSERT INTO search_doc (tenant_id, company_id, source_type, source_id, title, body, embedding, tsv)
    SELECT d.tenant_id, NULL, 'deal', d.id, d.ref,
           COALESCE(NULLIF(concat_ws(' · ', d.type, d.stage, d.stage_detail, d.notes), ''), d.ref, 'deal'),
           NULL, to_tsvector('simple', concat_ws(' ', d.ref, d.type, d.stage, d.stage_detail, d.notes))
    FROM deal d JOIN tenant t ON t.id = d.tenant_id
    WHERE t.slug IN ('cardiwan','easyrent','take-auto') AND d.updated_at >= ${since}
    ON CONFLICT (tenant_id, source_type, source_id) DO UPDATE
      SET title=excluded.title, body=excluded.body, tsv=excluded.tsv, updated_at=now()
  `);

  // Messages
  await db.execute(sql`
    INSERT INTO search_doc (tenant_id, company_id, source_type, source_id, title, body, embedding, tsv)
    SELECT m.tenant_id, NULL, 'message', m.id, COALESCE(m.customer_name, m."from", 'Message'),
           left(m.body, 2000), NULL,
           to_tsvector('simple', concat_ws(' ', m.customer_name, left(m.body, 2000)))
    FROM message m JOIN tenant t ON t.id = m.tenant_id
    WHERE t.slug IN ('cardiwan','easyrent','take-auto') AND m.body IS NOT NULL AND m.body <> '' AND m.updated_at >= ${since}
    ON CONFLICT (tenant_id, source_type, source_id) DO UPDATE
      SET title=excluded.title, body=excluded.body, tsv=excluded.tsv, updated_at=now()
  `);

  // Small overlap so a row updated mid-run isn't missed next time.
  writeFileSync(MARKER, new Date(runAt.getTime() - 5 * 60 * 1000).toISOString());
  console.log(`[search-reindex] upserted rows changed since ${since}`);
}

main()
  .then(async () => { await pool.end(); process.exit(0); })
  .catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });

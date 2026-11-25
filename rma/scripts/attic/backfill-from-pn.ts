/**
 * ONE-OFF: populate message.from_pn (0055) for HISTORY.
 *
 * Two sources, in order:
 *   1. Observer JSONL rows that carry `senderPhone` (Baileys senderPn/
 *      participantPn — 8.2k of 21k rows at time of writing) → matched to the
 *      message row by external_message_id (`waobs:<brand>:<ts>:<from>`).
 *   2. wa_identity (lid → phone table the observers maintain) for rows whose
 *      own JSONL line had no phone but whose @lid identity is known.
 *
 * Going forward the importer writes from_pn on insert — this script is only
 * for rows that predate 0055. Idempotent. DRY-RUN default; --commit to write.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const DIR =
  process.env.WA_OBSERVER_DIR ??
  "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/wa-observer";
const COMMIT = process.argv.includes("--commit");

async function main() {
  // Pass 1 — JSONL senderPhone by extId.
  const files = readdirSync(DIR).filter((f) => f.startsWith("observed-") && f.endsWith(".jsonl"));
  const pairs: [string, string][] = []; // [extId, phone]
  for (const f of files) {
    const brand = f.replace(/^observed-/, "").replace(/\.jsonl$/, "");
    for (const line of readFileSync(join(DIR, f), "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      let r: { from?: string; senderPhone?: string | number; brand?: string; ts?: string | number };
      try { r = JSON.parse(line); } catch { continue; }
      if (!r.from || !r.senderPhone) continue;
      pairs.push([`waobs:${r.brand || brand}:${r.ts}:${r.from}`, String(r.senderPhone)]);
    }
  }
  console.log(`[from_pn] JSONL rows carrying senderPhone: ${pairs.length}`);

  if (!COMMIT) { console.log("— DRY-RUN — no writes. Re-run with --commit."); await pool.end(); return; }

  let p1 = 0;
  for (let i = 0; i < pairs.length; i += 500) {
    const chunk = pairs.slice(i, i + 500);
    const res = await pool.query(
      `UPDATE message m SET from_pn = v.phone
       FROM (SELECT unnest($1::text[]) ext, unnest($2::text[]) phone) v
       WHERE m.external_message_id = v.ext AND m.from_pn IS NULL`,
      [chunk.map((c) => c[0]), chunk.map((c) => c[1])]
    );
    p1 += res.rowCount ?? 0;
  }
  console.log(`[from_pn] pass1 (JSONL senderPhone): ${p1} rows updated`);

  // Pass 2 — wa_identity lid→phone for the rest.
  const p2 = await pool.query(
    `UPDATE message m SET from_pn = wi.phone
     FROM wa_identity wi
     WHERE m.from_pn IS NULL AND m."from" = wi.lid`
  );
  console.log(`[from_pn] pass2 (wa_identity): ${p2.rowCount} rows updated`);

  const cov = await pool.query(
    `SELECT count(*) total, count(from_pn) with_pn FROM message WHERE external_message_id LIKE 'waobs:%'`
  );
  console.log(`[from_pn] coverage: ${cov.rows[0].with_pn}/${cov.rows[0].total}`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });

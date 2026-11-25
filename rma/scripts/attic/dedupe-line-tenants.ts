/**
 * Repair for the 2026-08-05 line-map remap.
 *
 * WHAT WENT WRONG: modules/messaging/lines.ts was corrected (Babek's three
 * phones are EasyRent, not Cardiwan; the "easyrent"-slugged session is Ali's
 * Cardiwan phone) and shipped to the box while board-heartbeat was still
 * running. The importer dedupes per (tenant_id, external_message_id), so under
 * the new map it saw every one of those messages as missing from its new
 * tenant and INSERTED a second copy — instead of the intended MOVE. Result:
 * 18,333 waobs messages exist in two tenants at once.
 *
 * WHAT THIS DOES: for every waobs line, delete the copies sitting in any tenant
 * that is NOT the one the line maps to — but ONLY where the very same
 * external_message_id also exists in the correct tenant. That last condition is
 * the safety catch: a row that was never duplicated is never deleted, so this
 * can only ever remove a redundant copy, never the last copy of a message.
 *
 * fix-line-tenants.ts is the WRONG tool here: it UPDATEs tenant_id, which on
 * already-duplicated rows would produce two copies inside the target tenant
 * instead of one. Use this first, then that one for anything still mis-filed.
 *
 * Idempotent. DRY-RUN default; --commit to write.
 * Backup taken before the incident: db-backups/message-before-linefix-20260805.dump
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { LINE_TENANT } from "@/modules/messaging/lines";

const COMMIT = process.argv.includes("--commit");

async function main() {
  const tenants = new Map<string, string>();
  for (const r of (await pool.query("SELECT id, slug FROM tenant")).rows as { id: string; slug: string }[]) {
    tenants.set(r.slug, r.id);
  }

  let total = 0;
  for (const [line, slug] of Object.entries(LINE_TENANT)) {
    const targetId = tenants.get(slug);
    if (!targetId) { console.warn(`[dedupe] tenant '${slug}' missing — skipping line ${line}`); continue; }

    // Redundant copy = same external_message_id, wrong tenant, AND present in
    // the right tenant. Anything not mirrored in the target is left alone.
    const where = `
      FROM message m
      WHERE m.external_message_id LIKE $1
        AND m.tenant_id <> $2
        AND EXISTS (
          SELECT 1 FROM message keep
          WHERE keep.external_message_id = m.external_message_id
            AND keep.tenant_id = $2
        )`;
    const params = [`waobs:${line}:%`, targetId];

    if (!COMMIT) {
      const n = await pool.query(`SELECT count(*) n ${where}`, params);
      const c = Number(n.rows[0].n);
      if (c > 0) console.log(`[dedupe] DRY: ${line}: would delete ${c} redundant copy/copies outside ${slug}`);
      total += c;
      continue;
    }
    const res = await pool.query(
      `DELETE FROM message WHERE id IN (SELECT m.id ${where})`,
      params
    );
    if (res.rowCount) console.log(`[dedupe] ${line}: deleted ${res.rowCount} redundant copy/copies outside ${slug}`);
    total += res.rowCount ?? 0;
  }
  console.log(COMMIT ? `[dedupe] done — ${total} redundant row(s) removed` : `[dedupe] DRY TOTAL: ${total} redundant row(s)`);

  const left = await pool.query(`
    SELECT count(*) n FROM (
      SELECT external_message_id FROM message
      WHERE external_message_id LIKE 'waobs:%'
      GROUP BY external_message_id HAVING count(DISTINCT tenant_id) > 1
    ) d`);
  console.log(`[dedupe] external ids still in >1 tenant: ${left.rows[0].n}`);

  const sum = await pool.query(
    `SELECT t.slug, count(m.*) msgs FROM tenant t
     LEFT JOIN message m ON m.tenant_id = t.id AND m.channel='whatsapp'
     GROUP BY t.slug ORDER BY msgs DESC`
  );
  console.table(sum.rows);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });

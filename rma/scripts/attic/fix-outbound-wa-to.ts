/**
 * ONE-OFF data repair: outbound WhatsApp rows whose `to` holds the BRAND SLUG
 * instead of the customer's phone (pre-2026-08-22 importer behavior — the
 * reason 35,039 agent replies never reached Twenty: no digits → noPerson).
 *
 * For every message row with direction='outbound' AND channel='whatsapp':
 *   - `from` is a plain phone JID ("<digits>@s.whatsapp.net") → to = digits
 *   - `from` is a "<n>@lid" resolvable via wa_identity      → to = that phone
 *   - unresolved lid / non-JID / already correct            → untouched
 *
 * DRY-RUN BY DEFAULT — re-run with --commit to write. Idempotent (the
 * already-correct check is in planOutboundToFix) and re-runnable: lids that
 * resolve LATER (the observer records the mapping on the customer's next
 * inbound) are picked up by the next run.
 *
 *   npx tsx scripts/fix-outbound-wa-to.ts             (report only)
 *   npx tsx scripts/fix-outbound-wa-to.ts --commit    (write)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { planOutboundToFix } from "@/platform/messaging/phone";

const COMMIT = process.argv.includes("--commit");
// Page size for the scan; updates go out in unnest-batches the same size
// (the backfill-from-pn.ts pattern), so one statement never rewrites more
// than a few thousand rows and the box keeps breathing between batches.
const BATCH = 5000;

async function main() {
  const identityByLid = new Map<string, string>();
  {
    const res = await pool.query("SELECT lid, phone FROM wa_identity WHERE phone IS NOT NULL");
    for (const r of res.rows as { lid: string; phone: string }[]) identityByLid.set(r.lid, r.phone);
  }
  console.log(`[outbound-to] wa_identity mappings loaded: ${identityByLid.size}`);

  let scanned = 0;
  let alreadyOk = 0;
  let unresolved = 0;
  const unresolvedLids = new Map<string, number>();
  let planned = 0;
  let updated = 0;
  let cursor = "00000000-0000-0000-0000-000000000000";

  for (;;) {
    const page = await pool.query(
      `SELECT id, "from", "to" FROM message
       WHERE direction = 'outbound' AND channel = 'whatsapp' AND "from" IS NOT NULL AND id > $1
       ORDER BY id LIMIT $2`,
      [cursor, BATCH]
    );
    if (page.rows.length === 0) break;
    cursor = page.rows[page.rows.length - 1].id;
    scanned += page.rows.length;

    const fixes: [string, string][] = [];
    for (const row of page.rows as { id: string; from: string | null; to: string | null }[]) {
      const newTo = planOutboundToFix(row, identityByLid);
      if (newTo) {
        fixes.push([row.id, newTo]);
      } else {
        // Distinguish "already fine" from "could not resolve" for the report.
        if (row.from?.endsWith("@lid") && !/\d{5,}/.test(row.to ?? "")) {
          unresolved++;
          unresolvedLids.set(row.from, (unresolvedLids.get(row.from) ?? 0) + 1);
        } else {
          alreadyOk++; // already a phone, or a non-JID from — out of scope
        }
      }
    }
    planned += fixes.length;

    if (COMMIT && fixes.length > 0) {
      for (let i = 0; i < fixes.length; i += BATCH) {
        const chunk = fixes.slice(i, i + BATCH);
        const res = await pool.query(
          `UPDATE message m SET "to" = v.new_to
           FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::text[]) AS new_to) v
           WHERE m.id = v.id`,
          [chunk.map((c) => c[0]), chunk.map((c) => c[1])]
        );
        updated += res.rowCount ?? 0;
      }
    }
    process.stdout.write(
      `\r[outbound-to] scanned=${scanned} toFix=${planned}${COMMIT ? ` updated=${updated}` : ""} unresolvedLid=${unresolved}   `
    );
  }

  console.log(
    `\n[outbound-to] done (${COMMIT ? "COMMIT" : "DRY-RUN"}): scanned=${scanned} ` +
      `${COMMIT ? `updated=${updated}` : `wouldUpdate=${planned}`} alreadyOk=${alreadyOk} unresolvedLidRows=${unresolved} ` +
      `distinctLids=${unresolvedLids.size}`
  );
  if (unresolvedLids.size > 0) {
    const top = [...unresolvedLids.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(`[outbound-to] top unresolved lids: ${top.map(([lid, n]) => `${lid}×${n}`).join(", ")}`);
  }
  if (!COMMIT) console.log("— DRY-RUN — no writes. Re-run with --commit.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

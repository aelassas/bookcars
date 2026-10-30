// Backfill: replace opaque WhatsApp group JIDs with the cached group SUBJECT
// in human-facing fields — after bridge.js started writing
// wa-observer/group-names-<brand>.json (see integrations/twenty/group-names.ts).
//
//   - Twenty opportunities (BOTH instances): callSource LIKE '%@g.us%' → the
//     same label with the JID swapped for the subject. Only when the subject
//     is known; never a guess, never touches a JID-less value.
//   - platform b2b_offer.source_label rows, same rewrite.
//
// DRY-RUN BY DEFAULT — prints what would change; --commit writes.
//
// Usage (from platform/):
//   npx tsx scripts/backfill-group-names.ts            # dry-run
//   npx tsx scripts/backfill-group-names.ts --commit   # write
//
// Env: WA_OBSERVER_DIR (cache files), TWENTY_* / TWENTY_RENTAL_* as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { db, pool } from "@/platform/db/client";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  type TwentyInstanceKey,
} from "@/platform/integrations/twenty/instance";
import { replaceGroupJids } from "@/platform/integrations/twenty/group-names";

const COMMIT = process.argv.includes("--commit");

/** node-postgres returns QueryResult; drizzle's typing hides the rows field. */
function sqlRows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

async function main() {
  console.log(`[group-names] mode=${COMMIT ? "COMMIT" : "dry-run"}`);

  // ── Twenty opportunities, both instances. ────────────────────────────────
  for (const key of ["default", "rental"] as TwentyInstanceKey[]) {
    if (!resolveTwentyInstance(key).configured) {
      console.warn(`[group-names] instance '${key}' has no API key — skipped`);
      continue;
    }
    const client = getTwentyClientForInstance(key);
    let scanned = 0;
    let patched = 0;
    let noSubject = 0;
    for await (const rec of client.listAll<Record<string, unknown>>("opportunities", {
      filter: `callSource[like]:%@g.us%`,
    })) {
      scanned++;
      const id = typeof rec.id === "string" ? rec.id : null;
      const source = typeof rec.callSource === "string" ? rec.callSource : "";
      if (!id || !source.includes("@g.us")) continue;
      const rewritten = replaceGroupJids(source);
      if (rewritten === source) {
        noSubject++;
        continue;
      }
      console.log(`[group-names] ${key} opp ${id}: "${source}" → "${rewritten}"`);
      if (COMMIT) await client.patch(`opportunities/${id}`, { callSource: rewritten });
      patched++;
    }
    console.log(
      `[group-names] ${key}: ${patched} patched, ${noSubject} left raw (no cached subject), ${scanned} scanned`
    );
  }

  // ── b2b_offer.source_label (platform DB). ────────────────────────────────
  const rows = sqlRows<{ id: string; source_label: string }>(
    await db.execute(sql`SELECT id, source_label FROM b2b_offer WHERE source_label LIKE '%@g.us%'`)
  );
  let offersPatched = 0;
  let offersRaw = 0;
  for (const r of rows) {
    const rewritten = replaceGroupJids(r.source_label);
    if (rewritten === r.source_label) {
      offersRaw++;
      continue;
    }
    console.log(`[group-names] b2b_offer ${r.id}: "${r.source_label}" → "${rewritten}"`);
    if (COMMIT) {
      await db.execute(sql`UPDATE b2b_offer SET source_label = ${rewritten}, updated_at = now() WHERE id = ${r.id}`);
    }
    offersPatched++;
  }
  console.log(
    `[group-names] b2b_offer: ${offersPatched} patched, ${offersRaw} left raw (no cached subject), ${rows.length} scanned`
  );

  if (!COMMIT) console.log(`\n— DRY-RUN — no writes. Re-run with --commit.\n`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });

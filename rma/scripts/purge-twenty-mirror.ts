// Purge the Bitrix→Twenty mirror's junk opportunities from BOTH Twenty
// instances. The mirror stamps every opportunity it creates with
// `externalSource: "bitrix24"` (see integrations/twenty/mirror.ts DEALS pass);
// the clean feeders (CallGear = "callgear:*", WA lead sync, Kimi's router) use
// other sources, so this marker isolates the mirror's cards exactly.
//
//   npx tsx scripts/purge-twenty-mirror.ts            # dry run — count + sample
//   npx tsx scripts/purge-twenty-mirror.ts --commit    # soft-delete them
//
// Soft delete (Twenty DELETE sets deletedAt) — the record leaves every board
// and the retired mirror can't re-patch it, but it is recoverable from trash if
// we got the marker wrong. Runs the `default` (sales) and `rental` instances.

import { getTwentyClientForInstance } from "../src/platform/integrations/twenty/client";
import type { TwentyInstanceKey } from "../src/platform/integrations/twenty/instance";

const COMMIT = process.argv.includes("--commit");
const MIRROR_SOURCES = new Set(["bitrix24"]); // opportunity provenance to purge
const INSTANCES: TwentyInstanceKey[] = ["default", "rental"];

interface Opp {
  id?: string;
  name?: string;
  externalSource?: string;
  amount?: { amountMicros?: number | null } | null;
  deletedAt?: string | null;
}

async function purgeInstance(key: TwentyInstanceKey) {
  let client;
  try {
    client = getTwentyClientForInstance(key);
  } catch (e) {
    console.log(`\n[${key}] not configured — skipped (${e instanceof Error ? e.message : e})`);
    return { checked: 0, matched: 0, deleted: 0 };
  }
  if (client.mode !== "live") {
    console.log(`\n[${key}] Twenty client is not live (no base URL / API key) — skipped.`);
    return { checked: 0, matched: 0, deleted: 0 };
  }

  const victims: Opp[] = [];
  let checked = 0;
  for await (const rec of client.listAll<Opp>("opportunities")) {
    checked++;
    if (rec.deletedAt) continue; // already in trash
    if (rec.externalSource && MIRROR_SOURCES.has(rec.externalSource) && rec.id) victims.push(rec);
  }

  console.log(`\n[${key}] ${checked} opportunities scanned, ${victims.length} are mirror-created (externalSource=bitrix24).`);
  for (const v of victims.slice(0, 8)) console.log(`    · ${v.name ?? "(no name)"}`);
  if (victims.length > 8) console.log(`    …and ${victims.length - 8} more`);

  let deleted = 0;
  if (COMMIT) {
    for (const v of victims) {
      try {
        await client.delete(`opportunities/${v.id}`);
        deleted++;
      } catch (e) {
        console.log(`    ⚠️  failed to delete ${v.id}: ${e instanceof Error ? e.message : e}`);
      }
    }
    console.log(`[${key}] soft-deleted ${deleted}/${victims.length}.`);
  }

  return { checked, matched: victims.length, deleted };
}

async function main() {
  console.log(COMMIT ? "PURGE (committing soft-deletes)" : "DRY RUN — pass --commit to delete");
  const totals = { checked: 0, matched: 0, deleted: 0 };
  for (const key of INSTANCES) {
    const r = await purgeInstance(key);
    totals.checked += r.checked;
    totals.matched += r.matched;
    totals.deleted += r.deleted;
  }
  console.log(
    `\nTotal: ${totals.matched} mirror opportunities across ${INSTANCES.length} instances` +
      (COMMIT ? `, ${totals.deleted} soft-deleted.` : ` — dry run, nothing deleted.`),
  );
}

main().catch((e) => {
  console.error("purge failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});

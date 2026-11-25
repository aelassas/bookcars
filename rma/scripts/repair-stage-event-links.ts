// Repair stageEvents audit rows that lost their opportunity relation
// (live forensics 2026-08-13: 39/68 stage-ai rows with NULL opportunityId).
// The relation is recoverable from the row's own externalId — see
// src/platform/integrations/twenty/stage-event-link-repair.ts (pure selector).
// Also deletes the three probe rows from the investigation
// (externalId probe:relation-*).
//
// Everything goes through the Twenty REST client (PATCH/DELETE), never SQL.
// DRY-RUN BY DEFAULT — prints what would change; --commit writes.
//
// Usage (from platform/):
//   npx tsx scripts/repair-stage-event-links.ts            # dry-run
//   npx tsx scripts/repair-stage-event-links.ts --commit   # write
//
// Env: TWENTY_BASE_URL/TWENTY_API_KEY, TWENTY_RENTAL_* as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  type TwentyInstanceKey,
} from "@/platform/integrations/twenty/instance";
import { linkedOpportunityIdFromExternalId } from "@/platform/integrations/twenty/stage-event-link-repair";

const COMMIT = process.argv.includes("--commit");

/** The audit writers' changedBy markers — bounded crawls, never a full scan. */
const WRITERS = ["stage-ai", "deal-broadcast"];

function relationOf(rec: Record<string, unknown>): string | null {
  const direct = typeof rec.opportunityId === "string" && rec.opportunityId ? rec.opportunityId : null;
  const nested = (rec.opportunity as { id?: unknown } | null)?.id;
  return direct ?? (typeof nested === "string" ? nested : null);
}

async function main() {
  console.log(`[repair-stage-events] mode=${COMMIT ? "COMMIT" : "dry-run"}`);

  for (const key of ["default", "rental"] as TwentyInstanceKey[]) {
    if (!resolveTwentyInstance(key).configured) {
      console.warn(`[repair-stage-events] instance '${key}' has no API key — skipped`);
      continue;
    }
    const client = getTwentyClientForInstance(key);
    let repaired = 0;
    let probeDeleted = 0;
    let alreadyLinked = 0;
    let notOurs = 0;
    let failed = 0;

    // 1. The probe rows from the investigation — delete, always.
    for await (const rec of client.listAll<Record<string, unknown>>("stageEvents", {
      filter: `externalId[like]:probe:relation-%`,
    })) {
      const id = typeof rec.id === "string" ? rec.id : null;
      if (!id) continue;
      console.log(`[repair-stage-events] ${key} ${COMMIT ? "DELETE probe" : "would delete probe"} ${id} (${String(rec.externalId)})`);
      if (COMMIT) {
        try {
          await client.delete(`stageEvents/${id}`);
          probeDeleted++;
        } catch (e) {
          failed++;
          console.error(`[repair-stage-events] ${key} DELETE ${id} failed: ${(e as Error).message.slice(0, 160)}`);
        }
      } else {
        probeDeleted++;
      }
    }

    // 2. Our writers' rows with a NULL relation — re-link from the externalId.
    for (const writer of WRITERS) {
      for await (const rec of client.listAll<Record<string, unknown>>("stageEvents", {
        filter: `changedBy[eq]:${writer}`,
      })) {
        const id = typeof rec.id === "string" ? rec.id : null;
        if (!id) continue;
        if (relationOf(rec)) {
          alreadyLinked++;
          continue;
        }
        const oppId = linkedOpportunityIdFromExternalId(rec.externalId);
        if (!oppId) {
          notOurs++;
          continue;
        }
        console.log(
          `[repair-stage-events] ${key} ${COMMIT ? "PATCH" : "would patch"} ${id} ` +
            `(${String(rec.externalId).slice(0, 90)}) → opportunityId ${oppId}`
        );
        if (COMMIT) {
          try {
            await client.patch(`stageEvents/${id}`, { opportunityId: oppId });
            repaired++;
          } catch (e) {
            failed++;
            console.error(`[repair-stage-events] ${key} PATCH ${id} failed: ${(e as Error).message.slice(0, 160)}`);
          }
        } else {
          repaired++;
        }
      }
    }

    console.log(
      `[repair-stage-events] ${key}: ${repaired} ${COMMIT ? "repaired" : "would repair"}, ` +
        `${probeDeleted} probe rows ${COMMIT ? "deleted" : "to delete"}, ` +
        `${alreadyLinked} already linked, ${notOurs} not parseable (left alone), ${failed} failed`
    );
  }

  if (!COMMIT) console.log(`\n— DRY-RUN — no writes. Re-run with --commit.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

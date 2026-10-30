// Purge group-born cards (owner 2026-08-13: WhatsApp/Telegram GROUPS must not
// create cards in Twenty — direct WA + calls only; the Yango Telegram group
// is the one named exception). The selection rule lives in
// src/platform/integrations/twenty/group-card-purge.ts (pure, unit-tested).
//
// On BOTH Twenty instances, soft-DELETEs (REST DELETE → Twenty sets
// deletedAt) every matching opportunity:
//   - externalId b2b-demand:* — all of them, no exception;
//   - externalId wa-lead:* whose callSource marks a group and is not Yango.
// Direct-WA cards ("WhatsApp direct") and callgear cards are NEVER touched.
//
// The platform b2b_offer rows are deliberately NOT deleted: the offer index
// is what the manager's match hints read, and hints must keep working after
// the cards are gone.
//
// DRY-RUN BY DEFAULT — prints every candidate with name/callSource;
// --commit deletes.
//
// Usage (from platform/):
//   npx tsx scripts/purge-group-cards.ts            # dry-run
//   npx tsx scripts/purge-group-cards.ts --commit   # delete
//
// Env: TWENTY_BASE_URL/TWENTY_API_KEY, TWENTY_RENTAL_* as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  type TwentyInstanceKey,
} from "@/platform/integrations/twenty/instance";
import { isGroupCardPurgeCandidate } from "@/platform/integrations/twenty/group-card-purge";

const COMMIT = process.argv.includes("--commit");

async function main() {
  console.log(`[purge-group-cards] mode=${COMMIT ? "COMMIT" : "dry-run"}`);

  for (const key of ["default", "rental"] as TwentyInstanceKey[]) {
    if (!resolveTwentyInstance(key).configured) {
      console.warn(`[purge-group-cards] instance '${key}' has no API key — skipped`);
      continue;
    }
    const client = getTwentyClientForInstance(key);
    let deletedWaLeadGroup = 0;
    let deletedB2bDemand = 0;
    let kept = 0;
    let failed = 0;

    for (const prefix of ["wa-lead:", "b2b-demand:"]) {
      for await (const rec of client.listAll<Record<string, unknown>>("opportunities", {
        filter: `externalId[like]:${prefix}%`,
      })) {
        if (!isGroupCardPurgeCandidate(rec)) {
          kept++;
          continue;
        }
        const id = typeof rec.id === "string" ? rec.id : null;
        if (!id) continue;
        const isDemand = String(rec.externalId).startsWith("b2b-demand:");
        console.log(
          `[purge-group-cards] ${key} ${COMMIT ? "DELETE" : "would delete"} ${id} · ` +
            `"${String(rec.name ?? "?").slice(0, 80)}" · callSource="${String(rec.callSource ?? "").slice(0, 80)}"`
        );
        if (COMMIT) {
          try {
            await client.delete(`opportunities/${id}`);
            if (isDemand) deletedB2bDemand++;
            else deletedWaLeadGroup++;
          } catch (e) {
            failed++;
            console.error(`[purge-group-cards] ${key} DELETE ${id} failed: ${(e as Error).message.slice(0, 160)}`);
          }
        } else {
          if (isDemand) deletedB2bDemand++;
          else deletedWaLeadGroup++;
        }
      }
    }
    console.log(
      `[purge-group-cards] ${key}: ${deletedWaLeadGroup} wa-lead-group + ${deletedB2bDemand} b2b-demand ` +
        `${COMMIT ? "deleted" : "would be deleted"}, ${kept} kept, ${failed} failed`
    );
  }

  if (!COMMIT) console.log(`\n— DRY-RUN — no writes. Re-run with --commit.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

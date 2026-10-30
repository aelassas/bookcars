// Backfill serial lead numbers on EXISTING cards (rental board): every
// wa-lead:* / callgear:* opportunity without a leadNumber gets one, oldest
// card first, the number taken from the same platform sequence the relays
// use — a backfilled card and a brand-new card can never collide.
// The name gains the `#N ` prefix so the board column shows it; a card
// already prefixed (re-run) is left alone.
//
// DRY-RUN BY DEFAULT; --commit to write.
//
// Usage (from platform/):
//   npx tsx scripts/backfill-lead-numbers.ts            # dry-run
//   npx tsx scripts/backfill-lead-numbers.ts --commit   # write
//
// Env: DATABASE_URL, TWENTY_RENTAL_BASE_URL / TWENTY_RENTAL_API_KEY as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import { createLeadNumberSource } from "@/platform/integrations/twenty/lead-number";

const COMMIT = process.argv.includes("--commit");
const LEAD_PREFIXES = ["wa-lead:", "callgear:"];

type Opp = { id: string; name?: unknown; leadNumber?: unknown; externalId?: unknown; createdAt?: unknown };

async function main() {
  const client = getTwentyClientForInstance("rental");
  const nextLeadNumber = createLeadNumberSource(db, "rental");

  const cards: Opp[] = [];
  for await (const opp of client.listAll<Opp>("opportunities")) {
    const ext = typeof opp.externalId === "string" ? opp.externalId : "";
    if (!LEAD_PREFIXES.some((p) => ext.startsWith(p))) continue;
    cards.push(opp);
  }
  cards.sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));

  console.log(`[lead-numbers] mode=${COMMIT ? "COMMIT" : "dry-run"} · ${cards.length} lead cards on the rental board`);
  let numbered = 0;
  let skipped = 0;
  for (const card of cards) {
    const existing = typeof card.leadNumber === "string" && card.leadNumber.trim() ? card.leadNumber.trim() : null;
    if (existing) {
      skipped++;
      continue;
    }
    const n = COMMIT ? await nextLeadNumber() : -1;
    const name = typeof card.name === "string" ? card.name : "";
    const newName = name.startsWith("#") ? name : `#${n} ${name}`;
    console.log(`  #${COMMIT ? n : "?"} ${newName.slice(0, 70)}`);
    if (COMMIT) {
      await client.patch(`opportunities/${card.id}`, { leadNumber: String(n), name: newName });
    }
    numbered++;
  }
  console.log(`[lead-numbers] numbered=${numbered} alreadyNumbered=${skipped}${COMMIT ? "" : " (dry-run — nothing written)"}`);
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

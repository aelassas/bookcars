/**
 * Close the 9–10 gap the shared counter left behind.
 *
 * For the hour the two deployments shared one sequence, two numbers went to
 * sales cards and the rental board jumped 8 → 11. To a manager that reads as
 * two leads that vanished, which is the exact anxiety the clean restart was
 * meant to end. Renumbered by arrival order so the series is contiguous.
 *
 * Dry-run by default; --commit to write.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";

type Opp = { id: string; name: string | null; leadNumber: string | null; deletedAt: string | null; createdAt: string };

const COMMIT = process.argv.includes("--commit");

async function main() {
  const t = getTwentyClientForInstance("rental");
  if (t.mode === "mock") throw new Error("rental Twenty in MOCK mode");

  const live: Opp[] = [];
  for await (const o of t.listAll<Opp>("opportunities")) {
    if (!o.deletedAt && o.name?.startsWith("#")) live.push(o);
  }
  live.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const moves = live
    .map((o, i) => ({ o, want: i + 1 }))
    .filter((m) => m.o.leadNumber !== String(m.want));
  console.log(`${live.length} cards on the board, ${moves.length} need a new number`);
  for (const m of moves) console.log(`  #${m.o.leadNumber} → #${m.want}`);
  if (!COMMIT) { console.log("\ndry run — pass --commit"); process.exit(0); }

  let ok = 0, failed = 0;
  for (const m of moves) {
    const name = (m.o.name ?? "").replace(/^#\d+/, `#${m.want}`);
    try { await t.patch(`opportunities/${m.o.id}`, { leadNumber: String(m.want), name }); ok++; }
    catch (e) { failed++; console.error(`  ${m.o.name}: ${(e as Error).message.slice(0, 100)}`); }
  }
  console.log(`\nrenumbered ${ok}, failed ${failed} — the counter must now be set to ${live.length}`);
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e instanceof Error ? e.message : e); process.exit(1); });

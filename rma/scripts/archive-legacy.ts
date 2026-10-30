/**
 * Take the pre-September cards off the board.
 *
 * Owner, 2026-09-01: production starts today, so the L- generation goes to the
 * archive. Reversible — `--undo` puts every one of them back, and the round
 * trip was proven on a single card first.
 *
 * ARCHIVE means deletedAt, never the REST DELETE: in this Twenty DELETE
 * destroys the row (it cost a live customer card earlier today).
 *
 * Safe for the pipeline, and that was checked before a single card moved:
 * Twenty's list endpoints hide archived rows, so the lead relay cannot see one;
 * and there is no unique index on externalId, so a returning customer gets a
 * fresh card instead of an error. Nothing is stranded.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";

type Opp = { id: string; name: string | null; leadNumber: string | null; stage: string | null; deletedAt: string | null };

const COMMIT = process.argv.includes("--commit");
const UNDO = process.argv.includes("--undo");

async function main() {
  const t = getTwentyClientForInstance("rental");
  if (t.mode === "mock") throw new Error("rental Twenty in MOCK mode");

  if (UNDO) {
    // Archived rows are invisible to the list endpoint, so the ids come from
    // the pre-migration snapshot, restored by leadNumber.
    console.log("undo mode: restoring every L- card listed in archived-legacy.json");
    const ids: string[] = JSON.parse(await import("node:fs").then((fs) => fs.readFileSync("archived-legacy.json", "utf8")));
    let back = 0;
    for (const id of ids) {
      try { await t.patch(`opportunities/${id}`, { deletedAt: null }); back++; } catch (e) { console.error(`  ${id}: ${(e as Error).message.slice(0, 80)}`); }
    }
    console.log(`restored ${back}/${ids.length}`);
    process.exit(0);
  }

  const targets: Opp[] = [];
  for await (const o of t.listAll<Opp>("opportunities")) {
    if (!o.deletedAt && o.name?.startsWith("L-")) targets.push(o);
  }
  const byStage = new Map<string, number>();
  for (const o of targets) byStage.set(o.stage ?? "(none)", (byStage.get(o.stage ?? "(none)") ?? 0) + 1);
  console.log(`${targets.length} pre-September cards to archive:`);
  for (const [s, n] of [...byStage].sort((a, b) => b[1] - a[1])) console.log(`  ${s.padEnd(28)} ${n}`);
  if (!COMMIT) { console.log("\ndry run — pass --commit"); process.exit(0); }

  const { writeFileSync } = await import("node:fs");
  writeFileSync("archived-legacy.json", JSON.stringify(targets.map((o) => o.id), null, 0));
  console.log(`\nids written to archived-legacy.json (that file IS the undo)`);

  const stamp = new Date().toISOString();
  let done = 0, failed = 0;
  for (const o of targets) {
    try { await t.patch(`opportunities/${o.id}`, { deletedAt: stamp }); done++; }
    catch (e) { failed++; console.error(`  ${o.name}: ${(e as Error).message.slice(0, 90)}`); }
  }
  console.log(`archived ${done}, failed ${failed}`);
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e instanceof Error ? e.message : e); process.exit(1); });

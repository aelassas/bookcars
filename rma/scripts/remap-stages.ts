/**
 * Retire the seven legacy stages by moving their cards to the closest live one.
 *
 * Ayham, 2026-09-01, circling the picklist: keep New Lead / Returning Lead /
 * Contacted / Follow-up / Successful Deal / Lost, drop the rest. The three
 * "this was never our customer" buckets become one lost deal WITH a reason, so
 * the loss report explains itself instead of hiding the count inside a stage
 * nobody reads.
 *
 * Through the REST API rather than SQL on purpose: Twenty keeps a search index
 * and a card timeline, and a direct UPDATE would leave both stale.
 *
 * Dry-run by default; --commit to write.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";

type Opp = { id: string; name: string | null; stage: string | null; lossReason: string | null; deletedAt: string | null };

const MAP: Record<string, { stage: string; lossReason?: string; why: string }> = {
  SECOND_TOUCH: { stage: "IN_PROGRESS", why: "a second touch IS contact" },
  UNDER_INVESTIGATION: { stage: "WE_SHOULD_REACH_OUT_AGAIN", why: "unfinished — come back to it" },
  THE_CLIENT_WILL_REACH_OUT_AGAIN: { stage: "WE_SHOULD_REACH_OUT_AGAIN", why: "unfinished — come back to it" },
  NOT_A_LEAD: { stage: "UNSUCCESSFUL_DEAL", lossReason: "NOT_TARGET", why: "never our customer" },
  B2B_INQUIRY: { stage: "UNSUCCESSFUL_DEAL", lossReason: "NOT_TARGET", why: "never our customer" },
  CAR_PREPARATION: { stage: "UNSUCCESSFUL_DEAL", lossReason: "NOT_INTERESTED", why: "old client already has a car" },
  A_CAR_THAT_WE_DON_T_HAVE: { stage: "UNSUCCESSFUL_DEAL", lossReason: "OTHER", why: "we did not have the car" },
};

const COMMIT = process.argv.includes("--commit");

async function main() {
  const t = getTwentyClientForInstance("rental");
  if (t.mode === "mock") throw new Error("rental Twenty in MOCK mode");

  const todo: { o: Opp; to: (typeof MAP)[string] }[] = [];
  for await (const o of t.listAll<Opp>("opportunities")) {
    if (o.deletedAt || !o.stage) continue;
    const to = MAP[o.stage];
    if (to) todo.push({ o, to });
  }
  const byStage = new Map<string, number>();
  for (const x of todo) byStage.set(x.o.stage!, (byStage.get(x.o.stage!) ?? 0) + 1);
  console.log(`${todo.length} cards on legacy stages:`);
  for (const [s, n] of [...byStage].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(32)} ${String(n).padStart(3)} → ${MAP[s].stage}${MAP[s].lossReason ? " / " + MAP[s].lossReason : ""}   (${MAP[s].why})`);
  }
  if (!COMMIT) { console.log("\ndry run — pass --commit"); process.exit(0); }

  let moved = 0, failed = 0;
  for (const { o, to } of todo) {
    const patch: Record<string, unknown> = { stage: to.stage };
    // Never overwrite a reason an agent already chose.
    if (to.lossReason && !o.lossReason) patch.lossReason = to.lossReason;
    try { await t.patch(`opportunities/${o.id}`, patch); moved++; }
    catch (e) { failed++; console.error(`  ${o.name}: ${(e as Error).message.slice(0, 110)}`); }
  }
  console.log(`\nmoved ${moved}, failed ${failed}`);
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e instanceof Error ? e.message : e); process.exit(1); });

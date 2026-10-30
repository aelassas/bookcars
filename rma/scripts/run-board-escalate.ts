import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { routeUnassignedBoardCards, escalateBreachedBoardCards } from "@/modules/board/escalation";
const TENANT = "take-auto";
const LIVE = process.env.ESCALATE_LIVE === "true";
async function main() {
  const tid = (await pool.query("SELECT id FROM tenant WHERE slug=$1", [TENANT])).rows[0]?.id;
  if (!tid) { console.error("no tenant"); process.exit(1); }
  const routed = await routeUnassignedBoardCards(tid);
  const r = await escalateBreachedBoardCards(tid, { dryRun: !LIVE });
  console.log("[escalate] routed=" + routed + " dryRun=" + (!LIVE) + " " + JSON.stringify(r));
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });

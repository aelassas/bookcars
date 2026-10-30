// notify-heartbeat.js — pm2 process driving the push-first rules once a minute.
// Same shape as sync-heartbeat.js / board-heartbeat.js: a dumb setInterval
// around `npx tsx scripts/run-notify.ts`. Deliberately its own process — a
// sync failure must never silently kill the team's pings, and vice versa.
// Repeat ticks are no-ops thanks to the notification ledger dedupe.
//
// pm2 start scripts/notify-heartbeat.js --name notify-heartbeat
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS pm2 entrypoint (.js, package has no "type":"module"); ESM import would crash it, renaming to .cjs would break the pm2 app defined on the prod box.
const { execSync } = require("child_process");
const cwd = process.env.PLATFORM_CWD || "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/platform";
const env = Object.assign({}, process.env, { PATH: "/opt/homebrew/bin:/usr/local/bin:" + (process.env.PATH || "") });
const opt = { cwd, stdio: "inherit", env };
function beat() {
  console.log("=== notify tick " + new Date().toISOString() + " ===");
  try { execSync("npx tsx scripts/run-notify.ts", opt); } catch (e) { console.error("run-notify failed:", e.message); }
  // Dubizzle arbitrage enrichment rides the same beat but never blocks the
  // pings — a scrapling/browser hiccup must not delay «клиент ждёт».
  try { execSync("npx tsx scripts/run-dubizzle-enrich.ts", opt); } catch (e) { console.error("dubizzle-enrich failed:", e.message); }
}
beat();
setInterval(beat, 60 * 1000);
console.log("[notify-heartbeat] push rules + dubizzle enrich /1min (dry-run unless NOTIFY_LIVE=true)");

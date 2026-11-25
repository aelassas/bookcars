// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS pm2 entrypoint (.js, package has no "type":"module"); ESM import would crash it, renaming to .cjs would break the pm2 app defined on the prod box.
const { execSync } = require("child_process");
const cwd = "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/platform";
const env = Object.assign({}, process.env, { PATH: "/opt/homebrew/bin:/usr/local/bin:" + (process.env.PATH || "") });
const opt = { cwd, stdio: "inherit", env };
function run(s) { try { execSync("npx tsx " + s, opt); } catch (e) { console.error(s + " failed:", e.message); } }
function beat() {
  console.log("=== board heartbeat " + new Date().toISOString() + " ===");
  run("scripts/importers/import-observer-messages.ts --commit");
  run("scripts/run-board-classify.ts");
  run("scripts/run-board-escalate.ts");
  try { execSync("python3 scripts/parse-tg-contracts.py", opt); } catch (e) { console.error("tg-artery failed:", e.message); }
  console.log("=== board heartbeat done ===");
}
beat();
setInterval(beat, 15 * 60 * 1000);

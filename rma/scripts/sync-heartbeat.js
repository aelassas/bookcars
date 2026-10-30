// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS pm2 entrypoint (.js, package has no "type":"module"); ESM import would crash it, renaming to .cjs would break the pm2 app defined on the prod box.
const { execSync, spawn } = require("child_process");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- same as above
const fs = require("fs");
const cwd = "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/platform";
const FULL_MARKER = cwd + "/.bitrix-last-sync";
const env = Object.assign({}, process.env, { PATH: "/opt/homebrew/bin:/usr/local/bin:" + (process.env.PATH || "") });
const opt = { cwd, stdio: "inherit", env };
// 2026-08-29: `npx tsx` intermittently HANGS on this box — a wedged npx child
// sat 11h with zero open sockets while the same script ran clean in 2 min via
// direct node. Resolve node@20 once and invoke tsx without npx.
const TSX = (function () {
  try {
    const prefix = execSync("brew --prefix node@20", { encoding: "utf8", env }).trim();
    return JSON.stringify(prefix + "/bin/node") +
      " --require " + JSON.stringify(cwd + "/node_modules/tsx/dist/preflight.cjs") +
      " --import " + JSON.stringify("file://" + cwd + "/node_modules/tsx/dist/loader.mjs");
  } catch { return "npx tsx"; } // fallback: previous behaviour
})();
function run(script) { try { execSync(TSX + " " + script, opt); } catch (e) { console.error(script + " failed:", e.message); } }

// TIERED CADENCE (2026-07-23, owner ask: "each minute update").
// - minuteBeat: the rental Bitrix portals + WA stitch — the freshness the CRM
//   UI lives off. (The take-auto/sales portal pull was retired 2026-09-16 —
//   the portal is dead; see minuteBeat.) One beat costs ~20-40s of API+upserts; execSync blocks the
//   event loop, so a slow beat simply delays the next tick (no overlap).
// - kaitenBeat: every 5 min — Kaiten re-pushes all ~162 cards per pass, too
//   heavy and too slow-moving to justify 1/min.
// - fullReconcile: unchanged (nightly, marker-gated).
function minuteBeat() {
  console.log("=== minute sync " + new Date().toISOString() + " ===");
  // take-auto Bitrix incremental DISABLED 2026-09-16: the sales portal is
  // permanently dead (disk quota exhausted, HTTP 401 on every call; owner
  // decision — will not renew). Archive through 2026-09-13 is final and was
  // migrated to Twenty via scripts/migrate-bitrix-sales-deals.ts.
  // run("scripts/run-bitrix-incremental.ts");
  run("scripts/run-rental-incremental.ts");
  // WA ingest is incremental since the 2026-07-23 importer rewrite (ON
  // CONFLICT DO NOTHING) — cheap enough to ride the minute beat, so chats
  // land ≤1min just like Bitrix. board-heartbeat still runs it 15-minutely
  // for classify/escalate; double-running is harmless by design.
  run("scripts/importers/import-observer-messages.ts --commit");
  // Telegram groups (Yango bookings via otp-bot, Cardiwan ops via driver-bot)
  // ride the same minute beat — the tailer is a cheap incremental read.
  run("scripts/importers/import-telegram-groups.ts --commit");
  run("scripts/backfill-stitch.ts");
  // Keep the keyword search index fresh (incremental, no embeddings — cheap).
  run("scripts/reindex-search-keyword.ts");
  // Calls are entered BY HAND since CallGear was switched off (2026-09-16), and
  // the field the team types the number into is the relay's join key. A human
  // types "+971 50 258 3434"; the relay only matches nine bare digits, so
  // without this the customer's first WhatsApp message mints a SECOND card.
  // One cheap Postgres count per tick — no REST traffic when there is nothing.
  run("scripts/normalize-card-phone.ts --commit");
}
function kaitenBeat() {
  console.log("=== kaiten sync " + new Date().toISOString() + " ===");
  run("scripts/run-kaiten-sync.ts");
  // WhatsApp → Twenty runs DETACHED on its own beat (waTwentyBeat) — it used
  // to run here, where a backlog blocked every other beat behind it.
  // Call QA rides the 5-min beat too: any new recording gets transcribed
  // (box Whisper) and QA-scored (Claude) without blocking the minute sync.
  run("scripts/run-call-qa.ts");
  // The red dot on a sales card: raise/clear "customer is waiting on a reply"
  // (unanswered inbound / missed call / stale). Patches only the cards whose
  // flag flips, so a quiet pass writes nothing; 5-min cadence is plenty.
  run("scripts/flag-needs-reply.ts --commit");
}
// Babek's live Google sheet (Calendar 3) → fleet + tiered pricing + rentals +
// manager attribution. It IS Babek's operating system; keeping the platform a
// live mirror is what lets availability/finder/returns run on real data without
// him leaving Excel. Every 5 min — the fetch+upsert of ~96 cars is too heavy for
// the minute beat and the sheet doesn't change second-to-second.
function babekBeat() {
  console.log("=== babek sheet sync " + new Date().toISOString() + " ===");
  run("scripts/import-babek-fleet.ts");
}
function fullDue() {
  try { const t = parseInt(fs.readFileSync(FULL_MARKER, "utf8").trim(), 10); return isNaN(t) || (Date.now() - t) > 23 * 3600 * 1000; } catch { return true; }
}
function fullReconcile() {
  if (!fullDue()) return;
  console.log("=== bitrix FULL reconcile " + new Date().toISOString() + " ===");
  try { execSync(TSX + " scripts/run-bitrix-sync.ts", opt); fs.writeFileSync(FULL_MARKER, String(Date.now())); } catch (e) { console.error("full reconcile failed:", e.message); }
}
// Daily sweep of staged WA attachments (outbox-media): bridge.js unlinks each
// file right after a successful send, so anything still here after 7 days is
// stuck (never sent, failed, or an abandoned upload) and safe to reap.
const MEDIA_DIR = process.env.WA_OUTBOX_MEDIA_DIR || require("path").resolve(cwd, "..", "wa-observer", "outbox-media");
const MEDIA_MARKER = cwd + "/.outbox-media-last-sweep";
const MEDIA_MAX_AGE_MS = 7 * 24 * 3600 * 1000;
function mediaSweepDue() {
  try { const t = parseInt(fs.readFileSync(MEDIA_MARKER, "utf8").trim(), 10); return isNaN(t) || (Date.now() - t) > 23 * 3600 * 1000; } catch { return true; }
}
function mediaSweep() {
  if (!mediaSweepDue()) return;
  console.log("=== outbox-media sweep " + new Date().toISOString() + " ===");
  try {
    let reaped = 0;
    for (const f of fs.readdirSync(MEDIA_DIR)) {
      const p = require("path").join(MEDIA_DIR, f);
      try {
        const st = fs.statSync(p);
        if (st.isFile() && Date.now() - st.mtimeMs > MEDIA_MAX_AGE_MS) { fs.unlinkSync(p); reaped++; }
      } catch (_) { /* file raced away — fine */ }
    }
    console.log("[media-sweep] reaped " + reaped + " file(s) older than 7d from " + MEDIA_DIR);
    fs.writeFileSync(MEDIA_MARKER, String(Date.now()));
  } catch (e) { console.error("media sweep failed:", e.message); }
}
// Bitrix → Twenty mirror. Twenty is the system of record the staff actually
// work in (docs/SYSTEM-OF-RECORD.md), so a lead that reached MyCRM a minute ago
// and reaches Twenty tomorrow is, to the person on the rent desk, a lost lead.
// It therefore rides the MINUTE beat, incrementally.
//
// TWO THINGS HERE ARE LOAD-BEARING — both were learned the hard way on
// 2026-08-05, when this ran daily, full-scan and through run():
//
//   1. DETACHED. run() uses execSync, which BLOCKS this whole heartbeat. A
//      full mirror of take-auto (78k deals, 178k contacts) ran for 23 hours and
//      took every other beat down with it: no Bitrix incremental, no WA stitch,
//      no WA→Twenty projection for a day. Never call a long job through run().
//   2. BOUNDED. Without --since the mirror rescans from 2024-01-01 every pass.
//      The incremental window only has to cover the gap since the last pass;
//      TWENTY_MIRROR_SINCE_HOURS is generous so a few missed ticks self-heal.
//
// The lock file is what makes a 1-minute cadence safe: if the previous pass is
// still going, this tick does nothing rather than stacking a second mirror on
// top of the first.
/**
 * Detached, single-flight background job.
 *
 * run() uses execSync and BLOCKS this whole heartbeat, so anything slow behind
 * it stops every other beat. That is not theoretical: a full Twenty mirror ran
 * for 23 hours on 2026-08-05 and took the Bitrix incremental, the WA stitch and
 * the WA→Twenty projection down with it for a day. Long jobs go through here.
 *
 * The lock is what makes a 1-minute cadence safe — if the previous pass is
 * still going, the tick does nothing rather than stacking a second copy.
 *
 * 2026-08-29 — the "pid alive = skip" check alone wedged ALL FOUR beats for
 * 11h: one relay child hung mid-pass (alive, never exits) and another died
 * into a ZOMBIE (kill(pid,0) succeeds on zombies), so every tick skipped
 * forever and no cards/notes reached Twenty. Two guards now:
 *   - a zombie (<defunct>) pid counts as dead;
 *   - a lock older than MAX_BEAT_MS whose process still matches the beat's
 *     own command is killed and cleared (a hung pass loses to the next tick).
 * The lock stores "pid startedAtMs" for the age check.
 */
const MAX_BEAT_MS = Number(process.env.HEARTBEAT_BEAT_MAX_MS || 45 * 60 * 1000);

/** Zombie or gone → not running. Anything else → running. */
function processState(pid) {
  try {
    const stat = execSync("/bin/ps -p " + pid + " -o stat= 2>/dev/null", { encoding: "utf8" }).trim();
    if (!stat) return "gone";
    return stat.startsWith("Z") ? "zombie" : "alive";
  } catch { return "gone"; }
}

/** Command line of pid, "" when unreadable — used so we never kill a recycled pid. */
function processCommand(pid) {
  try { return execSync("/bin/ps -p " + pid + " -o command= 2>/dev/null", { encoding: "utf8" }); }
  catch { return ""; }
}

function detachedBeat(name, cmd) {
  const lock = cwd + "/." + name + "-running";
  const log = cwd + "/." + name + ".log";
  let pid, startedAt = 0;
  try {
    const parts = fs.readFileSync(lock, "utf8").trim().split(/\s+/);
    pid = parseInt(parts[0], 10);
    startedAt = parseInt(parts[1] || "0", 10) || 0;
  } catch { pid = null; }
  if (pid && !isNaN(pid)) {
    const state = processState(pid);
    if (state === "alive") {
      const ageMs = startedAt ? Date.now() - startedAt : 0;
      const looksOurs = processCommand(pid).includes(name.replace(/^.*?(wa|twenty|manager)/, "$1"));
      if (startedAt && ageMs > MAX_BEAT_MS && looksOurs) {
        // Hung pass — kill it and let this tick start a fresh one.
        try { process.kill(pid, "SIGKILL"); } catch (e) {}
        try { fs.unlinkSync(lock); } catch (e) {}
        console.error(name + ": killed hung beat pid=" + pid + " after " + Math.round(ageMs / 60000) + "min");
      } else {
        return false; // genuinely still working (or foreign pid) — skip this tick
      }
    } else {
      try { fs.unlinkSync(lock); } catch (e) {} // dead or zombie — clear and continue
    }
  }
  let out;
  try { out = fs.openSync(log, "a"); } catch (e) { console.error(name + ": cannot open log: " + e.message); return false; }
  const child = spawn("/bin/sh", ["-c", cmd], { cwd: cwd, env: env, detached: true, stdio: ["ignore", out, out] });
  try { fs.writeFileSync(lock, child.pid + " " + Date.now()); } catch (e) { /* best effort */ }
  child.unref();
  child.on("exit", function (code) {
    try { fs.unlinkSync(lock); } catch (e) {}
    if (code !== 0) console.error(name + " exited code " + code + " — see " + log);
  });
  console.log("=== " + name + " started (detached) pid=" + child.pid + " ===");
  return true;
}

// SALES-ONLY mirror (owner 2026-08-11). The Bitrix→Twenty mirror is a temporary
// bridge for the SALES team (take-auto — Moe/Azat/Firuz), whose leads still come
// via Bitrix (the girls filter there). RENTAL brands (cardiwan/easyrent/etm) run
// on the clean CallGear feed and must NEVER be re-mirrored — doing so re-creates
// the junk we purged and makes cards flicker. So rental brands are stripped even
// if someone puts them in the env var. Retire this bridge when sales' Bitrix dies.
const RENTAL_BRANDS = new Set(["cardiwan", "easyrent", "etm"]);
const TWENTY_TENANTS = (process.env.TWENTY_MIRROR_TENANTS || "take-auto")
  .split(",").map(function (s) { return s.trim(); })
  .filter(function (s) { return s && !RENTAL_BRANDS.has(s.toLowerCase()); });
const TWENTY_SINCE_HOURS = Number(process.env.TWENTY_MIRROR_SINCE_HOURS || 48);

function twentyMirrorBeat() {
  // BOUNDED: without --since the mirror rescans from 2024-01-01 on every pass.
  // The window only has to cover the gap since the last one; it is generous so
  // a few missed ticks self-heal.
  const since = new Date(Date.now() - TWENTY_SINCE_HOURS * 3600 * 1000).toISOString();
  detachedBeat("twenty-mirror", TWENTY_TENANTS
    .map(function (slug) { return TSX + " scripts/run-twenty-mirror.ts --tenant " + slug + " --since " + since + " --commit"; })
    .join("; "));
}

// WhatsApp → Twenty projection. Also detached: it rebuilds a 21k-person index
// on every pass, so a backlog makes it run for many minutes, and while it sat
// inside kaitenBeat it blocked the minute beat behind it.
function waTwentyBeat() {
  detachedBeat("wa-twenty", TSX + " scripts/run-wa-twenty-sync.ts");
}

// AI stage progression — DISABLED 2026-08-13 by the owner: no automation moves
// deal cards anymore; leads land rich at the top of the funnel and managers
// drag them themselves. The runner (scripts/run-stage-progression.ts) stays
// available for a manual audit pass, but nothing schedules it.

// WA/Telegram lead projector (2026-08-12). Turns qualified inbound threads —
// WhatsApp groups (Dubizzle/Meta leads), direct WA, Telegram (Yango) — into
// Twenty opportunity cards; continuations attach to the open card instead.
// Owner's lead bar first (deterministic), local model only for the borderline.
// Detached: AI verdicts must never block the minute beat.
function waLeadRelayBeat() {
  detachedBeat("wa-lead-relay", TSX + " scripts/run-wa-lead-relay.ts --once --commit");
}

// Deal broadcaster (2026-08-13). When a rental deal is confirmed AND docs are
// validated (license+ID, name match, not expired), posts the deal to the
// Deliveries Control TG group in the team's exact #выдача/#opencontract
// format, appends the Google Sheet row (once the SA is shared) and protocols
// it all on the Twenty card. NO stage move — cards only move when a manager
// drags them (owner, 2026-08-13); the stageEvents broadcast:<id> marker is a
// receipt with fromStage = toStage. One broadcast per deal.
function dealBroadcastBeat() {
  detachedBeat("deal-broadcast", TSX + " scripts/run-deal-broadcast.ts --once --commit");
}

// AI stage progression (re-enabled 2026-08-17 — Ayham wants stages to move
// with the conversation; see the schedule note below for the rails).
function stageProgressionBeat() {
  detachedBeat("stage-progression", TSX + " scripts/run-stage-progression.ts --once --commit");
}

// QC chat transcripts (Mohamd 2026-08-18): one auto-updated note per rental
// card with the FULL two-way WhatsApp conversation — the QC team reads what
// our agents wrote, not only the client. Rewrites in place, never appends.
//
// RETIRED as a beat 2026-08-29 (Ayham, card #593): the day note
// ("WhatsApp · +<phone>", written by run-wa-twenty-sync both directions, with
// media attached) IS the full two-way conversation now, so this was a third
// writer splitting one chat across three notes. The runner stays for a
// manual history pass; nothing schedules it. Existing "💬 Chat transcript
// (auto)" notes are folded into the day note by scripts/merge-wa-conversation-notes.ts.
function qcTranscriptBeat() {
  detachedBeat("qc-transcript", TSX + " scripts/run-qc-transcript.ts --once --commit");
}

// Recording links QC can open (Mohamd 2026-08-18): repoint call cards'
// Recording field from CallGear's SSO-walled URL to our /api/media token URL
// once the transcriber has the file on disk. CallGear stays as the secondary.
function recordingLinksBeat() {
  detachedBeat("recording-links", TSX + " scripts/run-recording-links.ts --once --commit");
}

// Manager notifier (2026-08-13). One-line Telegram updates to the rental
// manager (Ayham): missed/answered calls + AI summary, new leads, stage moves,
// documents, confirmed deals, returns/fines. Quiet hours 23:00–08:00 spool
// into one morning message; if he hasn't /start'ed the bot yet, events spool
// and flush when he links — nothing is dropped.
function managerNotifyBeat() {
  detachedBeat("manager-notify", TSX + " scripts/run-manager-notify.ts --once --commit");
}

// B2B matcher — DISABLED 2026-08-13 by the owner: the manager does not want
// B2B demand posts/DMs. The runner (scripts/run-b2b-matcher.ts) stays for a
// manual pass, nothing schedules it.

// Moe's executive digest. Morning: full digest once a day after 08:30 local
// (the box runs Dubai time). Night (22:00–08:00): watchman pass every 30 min —
// the script itself stays silent when nothing is on fire, so the interval is
// cheap. Both are marker/cheap-gated; the script no-ops visibly when
// MOE_DIGEST_CHAT_ID is unset.
const MORNING_MARKER = cwd + "/.moe-digest-last-morning";
function moeDigest() {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  if (h >= 22 || h < 8) {
    run("scripts/run-moe-digest.ts --mode=night");
    return;
  }
  if (h > 8 || (h === 8 && m >= 30)) {
    let done = false;
    try { done = (Date.now() - parseInt(fs.readFileSync(MORNING_MARKER, "utf8").trim(), 10)) < 20 * 3600 * 1000; } catch { /* no marker yet */ }
    if (done) return;
    run("scripts/run-moe-digest.ts --mode=morning");
    fs.writeFileSync(MORNING_MARKER, String(Date.now()));
  }
}
kaitenBeat();
babekBeat();
minuteBeat();
mediaSweep();
moeDigest();
// Deliberately NOT on boot: a pm2 restart would kick off a full multi-tenant
// mirror while the minute beat is still warming up. The hourly tick picks it
// up within the hour, and the marker decides whether it is actually due.
setInterval(minuteBeat, 60 * 1000);
setInterval(kaitenBeat, 5 * 60 * 1000);
setInterval(babekBeat, 5 * 60 * 1000);
// Bitrix FULL reconcile DISABLED 2026-09-16 (dead take-auto portal, see
// minuteBeat note). The function and marker stay for a possible final manual
// pass; nothing schedules it.
// setInterval(fullReconcile, 60 * 60 * 1000);
setInterval(mediaSweep, 60 * 60 * 1000);
setInterval(moeDigest, 30 * 60 * 1000);
// SALES-ONLY mirror (owner 2026-08-11): re-enabled, but TWENTY_TENANTS is now
// scoped to take-auto (sales) and strips rental brands, so this feeds Moe/Azat/
// Firuz from Bitrix WITHOUT touching the clean rental board. Temporary bridge
// until sales' Bitrix is retired too.
// twenty-mirror (sales Bitrix→Twenty bridge) RETIRED 2026-09-16: sales' Bitrix
// died (the retirement condition named above). Sales Twenty is now fed by the
// one-time migration (scripts/migrate-bitrix-sales-deals.ts) + wa-lead-relay +
// CallGear. The runner scripts/run-twenty-mirror.ts stays for manual passes.
// setInterval(twentyMirrorBeat, 60 * 1000);
setInterval(waTwentyBeat, 60 * 1000);       // WhatsApp → Twenty (clean feeder — kept)
// stage-progression DISABLED again 2026-08-29 — Ayham (via owner): New Lead →
// Contacted must be moved BY THE AGENT by hand; the AI kept advancing cards on
// its own. This supersedes the 2026-08-17 re-enable. The runner
// (scripts/run-stage-progression.ts) stays available for a manual pass.
// setInterval(stageProgressionBeat, 5 * 60 * 1000);
// qc-transcript RETIRED 2026-08-29 (Ayham, card #593): the continuous day
// note now carries both directions + media — this was a third writer.
// setInterval(qcTranscriptBeat, 5 * 60 * 1000);
setInterval(recordingLinksBeat, 10 * 60 * 1000);  // call cards → locally-served recording links (detached)
setInterval(waLeadRelayBeat, 2 * 60 * 1000);      // WA/TG leads → Twenty cards (detached; 2-min so cards feel live)
setInterval(dealBroadcastBeat, 5 * 60 * 1000);    // confirmed deals → TG group + sheet (detached; NO stage move)
setInterval(managerNotifyBeat, 60 * 1000);        // manager one-liners (detached; spools off-hours)
// b2b-matcher deliberately NOT scheduled (2026-08-13): no B2B demands for the manager.
console.log("[sync-heartbeat] rental-incr+stitch /1min · Kaiten+Babek-sheet+WA→Twenty /5min · WA→Twenty /1min (detached) · wa-lead-relay + deal-broadcast /5min (detached) · manager-notify /1min (detached) · outbox-media sweep /daily · take-auto Bitrix (incr/full/twenty-mirror) RETIRED 2026-09-16");

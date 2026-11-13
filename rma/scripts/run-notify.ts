/**
 * run-notify.ts — one tick of the push-first rules (see modules/notify/rules).
 *
 * Runs client, payment, return and vehicle-service rules, plus the morning
 * and CEO digests at the configured Dubai hour. Safe to run
 * as often as every minute: the ledger dedupe + escalation cooldown make
 * repeat runs no-ops. Called by scripts/notify-heartbeat.js.
 *
 * Env / flags:
 *   NOTIFY_LIVE=true       actually send (default: dry-run, logs only —
 *                          mirrors ESCALATE_LIVE in run-board-escalate.ts)
 *   NOTIFY_TENANT_SLUG     tenant to run for, default take-auto
 *   --force-digest         ignore the 09:00 Dubai gate (canary testing)
 *   NOTIFY_ENABLED / NOTIFY_ALLOWLIST / NOTIFY_MAX_PER_USER_PER_DAY /
 *   NOTIFY_TG_CHAT_* / NOTIFY_OWNER_USER_* / NOTIFY_CEO_USER
 *                          delivery gates + routing, see modules/notify
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { escalateBreachedBoardCards } from "@/modules/board/escalation";
import { notifyHotDeals, notifyHotInbound, notifyHunters, notifyPaymentFollowups, notifyReturnsDue, sendMorningDigests, sendCeoDigest } from "@/modules/notify/rules";
import { notifyRentDemand } from "@/modules/rent-watcher/watcher";
import { notifyServiceDue } from "@/modules/notify/service-due";

const TENANT = process.env.NOTIFY_TENANT_SLUG || "take-auto";
const LIVE = process.env.NOTIFY_LIVE === "true";
const FORCE_DIGEST = process.argv.includes("--force-digest");

async function main() {
  const tid = (await pool.query("SELECT id FROM tenant WHERE slug=$1", [TENANT])).rows[0]?.id;
  if (!tid) {
    console.error(`[notify] no tenant with slug ${TENANT}`);
    process.exit(1);
  }
  const dryRun = !LIVE;

  const waiting = await escalateBreachedBoardCards(tid, { dryRun });
  const hot = await notifyHotDeals(tid, { dryRun });
  // Hot inbound AND morning digests run across ALL business tenants — the
  // line/tenant split (2026-07-23) put rent messages in cardiwan and the
  // CallGear firehose in easyrent. A take-auto-only digest hid Ali's REAL
  // workload (147 easyrent deals, 143 active/7d) from him — the Artur lesson,
  // digest edition.
  const BUSINESS_SLUGS = [...new Set([TENANT, "take-auto", "cardiwan", "easyrent"])];
  const hotIn: unknown[] = [];
  const digests: unknown[] = [];
  for (const s of BUSINESS_SLUGS) {
    const trow = (await pool.query("SELECT id FROM tenant WHERE slug=$1", [s])).rows[0];
    if (!trow) continue;
    hotIn.push(await notifyHotInbound(trow.id, { dryRun }));
    // Hunters are SALES-desk agents (owner 2026-07-24: lease-to-own for Azat,
    // economy for Firuz) — and Firuz has nothing to do with the rent side
    // (owner 2026-09-19, after he got an Easy Rent "Economy client!" ping).
    // Rental leads go through the rental distributor now, not these pings.
    if (s === "take-auto") hotIn.push(...(await notifyHunters(trow.id, { dryRun })));
    hotIn.push(await notifyPaymentFollowups(trow.id, { dryRun }));
    hotIn.push(await notifyReturnsDue(trow.id, { dryRun }));
    hotIn.push(await notifyServiceDue(trow.id, { dryRun }));
    // AI rent-demand watcher — behind a flag while it pilots (Babek's brands).
    // Fleet/pricing/rentals live under take-auto (the sheet importer's tenant),
    // scoped to the brand by company_id; inbound is read from the brand tenant.
    if (process.env.RENT_WATCHER_ENABLED === "true") {
      hotIn.push(await notifyRentDemand(trow.id, { dryRun, fleetTenantId: tid }));
    }
    digests.push(await sendMorningDigests(trow.id, { dryRun, forceHour: FORCE_DIGEST }));
  }
  // Management digest per business tenant (Ayham 2026-08-17: daily – weekly –
  // monthly). Recipients are env-routed per tenant (NOTIFY_DIGEST_EXTRA_KEYS_
  // <SLUG>); the take-auto copy still goes to the CEO target only. Weekly fires
  // Monday morning, monthly on the 1st — all at the same NOTIFY_DIGEST_HOUR.
  const dubaiNow = new Date(Date.now() + 4 * 3_600_000);
  const periods: ("daily" | "weekly" | "monthly")[] = ["daily"];
  if (dubaiNow.getUTCDay() === 1) periods.push("weekly");
  if (dubaiNow.getUTCDate() === 1) periods.push("monthly");
  const ceo: unknown[] = [];
  for (const s of BUSINESS_SLUGS) {
    const trow = (await pool.query("SELECT id FROM tenant WHERE slug=$1", [s])).rows[0];
    if (!trow) continue;
    for (const period of periods) {
      ceo.push(await sendCeoDigest(trow.id, { dryRun, forceHour: FORCE_DIGEST, period }));
    }
  }

  console.log(
    `[notify] tick done dryRun=${dryRun} waiting=${JSON.stringify(waiting)} hot=${JSON.stringify(hot)} hotIn=${JSON.stringify(hotIn)} digest=${JSON.stringify(digests)} ceo=${JSON.stringify(ceo)}`,
  );
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

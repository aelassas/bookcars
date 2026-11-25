// Manager-notify runner (nohup/pm2-friendly CLI, same shape as
// run-stage-progression.ts / run-deal-broadcast.ts).
//
// RENTAL BOARD ONLY — cardiwan/easyrent/etm by default. Tails the rental
// pipeline (calls, summaries, new lead cards, stage moves, broadcasts, docs,
// returns, fines) and sends ONE-LINE Telegram updates to the rental manager
// (Ayham, +971581417020 — resolved from telegram_link by phone tail9).
// Quiet hours 23:00–08:00 Dubai spool into a consolidated morning message;
// an unlinked manager spools until he /start's the bot. All logic lives in
// src/platform/notify/manager-events.ts; this file is only wiring.
//
// DRY-RUN BY DEFAULT — zero sends, zero spool/key/checkpoint writes until
// --commit is passed.
//
// Usage (from platform/):
//   npx tsx scripts/run-manager-notify.ts                          # poll forever, dry-run
//   npx tsx scripts/run-manager-notify.ts --once                   # single dry-run pass
//   npx tsx scripts/run-manager-notify.ts --once --commit          # single LIVE pass
//   npx tsx scripts/run-manager-notify.ts --tenant cardiwan --once # one tenant only
//   npx tsx scripts/run-manager-notify.ts --since 2026-08-01 --once # backfill window
//
// Env:
//   MANAGER_NOTIFY_POLL_MS   poll interval, default 60000
//   MANAGER_PHONE_TAIL9      manager phone tail, default 581417020 (Ayham)
//   MANAGER_NOTIFY_SPOOL     spool path, default scripts/.manager-notify-spool.jsonl
//   MANAGER_NOTIFY_KEYS      dedupe sidecar, default scripts/.manager-notify-keys.json
//   TELEGRAM_OTP_BOT_TOKEN   required for --commit (the staff bot; sendMessage
//                            ONLY — otp-bot owns getUpdates on this token)
//   DATABASE_URL, TWENTY_RENTAL_BASE_URL, TWENTY_RENTAL_API_KEY as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { dirname, resolve } from "path";
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  twentyInstanceForTenantSlug,
} from "@/platform/integrations/twenty/instance";
import { brandLineForTenantSlug } from "@/platform/integrations/twenty/mirror";
import {
  createDrizzleManagerNotifySource,
  createFileSentKeys,
  createFileSpool,
  runManagerNotifyPass,
  sendTelegramDm,
} from "@/platform/notify/manager-events";

const SCRIPTS_DIR = dirname(import.meta.filename);
const SPOOL_PATH =
  process.env.MANAGER_NOTIFY_SPOOL?.trim() || resolve(SCRIPTS_DIR, ".manager-notify-spool.jsonl");
const KEYS_PATH =
  process.env.MANAGER_NOTIFY_KEYS?.trim() || resolve(SCRIPTS_DIR, ".manager-notify-keys.json");
const MANAGER_TAIL = process.env.MANAGER_PHONE_TAIL9?.trim() || "581417020"; // Ayham +971581417020

/** Rental board only — no sales notifications in v1. `etm` is deliberately
 *  absent: it maps to brandLine "easyrent" (mirror.ts), so an etm pass would
 *  re-read the same workspace and re-send every easyrent event under
 *  etm-scoped dedupe keys (audit 2026-08-14). */
const RENTAL_SLUGS = ["cardiwan", "easyrent"];

/** Agent alerts (owner 2026-08-14: missed call → HIS agent): display agent
 *  name → telegram_link phone tail9. Ali and Abdullah are linked; Babek is
 *  not — add him the day he /starts the bot. */
const STAFF_PHONES: Record<string, string> = {
  "Ali Sohiel": "542445835",
  Abdullah: "569808087",
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** `--flag value` reader (repeatable flags join on commas). */
function flagValues(name: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === `--${name}` && process.argv[i + 1]) {
      out.push(...process.argv[i + 1].split(",").map((s) => s.trim()).filter(Boolean));
    }
  }
  return out;
}

const POLL_MS = envInt("MANAGER_NOTIFY_POLL_MS", 60_000);
const ONCE = process.argv.includes("--once");
const COMMIT = process.argv.includes("--commit");
const requestedSlugs = flagValues("tenant");
const sinceRaw = flagValues("since")[0];
const SINCE = sinceRaw ? new Date(sinceRaw) : undefined;
if (sinceRaw && Number.isNaN(SINCE!.getTime())) {
  console.error(`[manager-notify] --since '${sinceRaw}' is not a parseable date`);
  process.exit(1);
}

/**
 * One sendMessage to the manager — the shared staff-DM sender from
 * manager-events.ts (§3: never a forked copy).
 */
async function sendToManager(chatId: string, text: string): Promise<void> {
  return sendTelegramDm(chatId, text);
}

async function main() {
  console.log(
    `[manager-notify] starting mode=${COMMIT ? "COMMIT" : "dry-run"} pollMs=${POLL_MS} once=${ONCE}` +
      ` manager=…${MANAGER_TAIL}` + (SINCE ? ` since=${SINCE.toISOString()}` : "")
  );

  if (COMMIT && !process.env.TELEGRAM_OTP_BOT_TOKEN?.trim()) {
    // Fail loudly at boot, not after the first event is half-handled.
    console.error("[manager-notify] TELEGRAM_OTP_BOT_TOKEN is not set — cannot send. Exiting.");
    process.exit(1);
  }

  const spool = createFileSpool(SPOOL_PATH);
  const sentKeys = createFileSentKeys(KEYS_PATH);

  let stopping = false;
  const stop = (signal: string) => {
    console.log(`[manager-notify] ${signal} received — finishing current pass`);
    stopping = true;
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  while (!stopping) {
    const tenants = await db.select({ id: tenant.id, slug: tenant.slug }).from(tenant);
    const targets = requestedSlugs.length > 0
      ? tenants.filter((t) => requestedSlugs.includes(t.slug))
      : tenants.filter((t) => RENTAL_SLUGS.includes(t.slug));

    for (const t of targets) {
      if (stopping) break;
      try {
        const key = twentyInstanceForTenantSlug(t.slug);
        if (!resolveTwentyInstance(key).configured) {
          console.warn(`[manager-notify] ${t.slug}: instance '${key}' has no API key — skipped`);
          continue;
        }
        const counts = await runManagerNotifyPass(
          {
            client: getTwentyClientForInstance(key),
            instance: key,
            tenantSlug: t.slug,
            brandLine: brandLineForTenantSlug(t.slug),
            source: createDrizzleManagerNotifySource(db, t.id),
            send: sendToManager,
            managerPhoneTail: MANAGER_TAIL,
            staffPhones: STAFF_PHONES,
            spool,
            sentKeys,
            cardBaseUrl:
              key === "rental"
                ? process.env.TWENTY_RENTAL_URL?.trim() || "https://rent.takeauto.tech"
                : process.env.TWENTY_SALES_URL?.trim() || "https://app.takeauto.tech",
          },
          { commit: COMMIT, since: SINCE, logger: (line) => console.log(line) }
        );
        if (counts.events > 0 || counts.flushed > 0 || ONCE) {
          console.log(`[manager-notify] ${t.slug}: ${JSON.stringify(counts)}`);
        }
      } catch (err) {
        // A pass-level failure (DB down, Twenty down) must not kill the loop —
        // the next poll retries.
        console.error(
          `[manager-notify] ${t.slug} pass failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    if (ONCE) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
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

// SALES automations runner (nohup/pm2-friendly CLI, same shape as
// run-manager-notify.ts / run-stage-progression.ts).
//
// SALES instance ONLY (:3001, "default"). Polls the sales workspace and runs
// the six automations in src/platform/notify/sales-automations.ts:
// lead numbering, returning-lead detection, stage-change timestamps, owner
// reassignment pings, the 08:00 GST daily digest, and the handover normalizer
// (girls' queue → guys' pipeline). All notifications go
// through the Telegram staff bot (sendTelegramDm) — never WhatsApp.
//
// DRY-RUN BY DEFAULT — zero writes to Twenty, zero Telegram sends, and the
// state snapshot does not advance until --commit is passed.
//
// Usage (from platform/):
//   npx tsx scripts/run-sales-automations.ts                       # poll forever, dry-run
//   npx tsx scripts/run-sales-automations.ts --once                # single dry-run pass
//   npx tsx scripts/run-sales-automations.ts --once --commit       # single LIVE pass
//   npx tsx scripts/run-sales-automations.ts --once --commit --force-digest  # fire the digest now
//
// Env:
//   SALES_AUTOMATIONS_POLL_MS   poll interval, default 60000
//   SALES_AUTOMATIONS_STATE     snapshot path, default scripts/.sales-automations-state.json
//   TWENTY_API_KEY / TWENTY_BASE_URL, DATABASE_URL, TELEGRAM_OTP_BOT_TOKEN as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { db, pool } from "@/platform/db/client";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import { createLeadNumberSource } from "@/platform/integrations/twenty/lead-number";
import {
  sendTelegramDm,
  resolveTelegramChatIdByPhoneTail,
} from "@/platform/notify/manager-events";
import {
  dubaiDayLabel,
  dubaiHour,
  emptyState,
  loadState,
  runSalesAutomationsPass,
  serializeState,
} from "@/platform/notify/sales-automations";

const SCRIPTS_DIR = dirname(import.meta.filename);
const STATE_PATH =
  process.env.SALES_AUTOMATIONS_STATE?.trim() || resolve(SCRIPTS_DIR, ".sales-automations-state.json");

// workspaceMember email → full phone digits ("" = not on file → skip Telegram).
// Phones are the personal numbers from the platform `user` table; the chat_id
// resolves through telegram_link at runtime. Azat is the only sales agent
// linked so far (chat 625534529, phone 97143742002); Firuz/Moe have no linked
// chat and are skipped + reported, per the spec.
const OWNER_PHONES: Record<string, string> = {
  "azat@takeauto.ae": "97143742002",
  "firuz@takeauto.ae": "971509082870",
  "moe@takeauto.ae": "",
};

const OWNER_NAMES: Record<string, string> = {
  "azat@takeauto.ae": "Azat",
  "firuz@takeauto.ae": "Firuz",
  "moe@takeauto.ae": "Moe",
};

const CARD_BASE_URL = process.env.TWENTY_SALES_URL?.trim() || "https://app.takeauto.tech";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const POLL_MS = envInt("SALES_AUTOMATIONS_POLL_MS", 60_000);
const ONCE = process.argv.includes("--once");
const COMMIT = process.argv.includes("--commit");
const FORCE_DIGEST = process.argv.includes("--force-digest");
// --prime: scan and save the snapshot WITHOUT acting (no writes, no pings).
// Re-baselining after a pipeline reshape, so weeks of history do not fire as
// "new" delegations on the first live pass.
const PRIME = process.argv.includes("--prime");

function loadStateFile() {
  if (!existsSync(STATE_PATH)) return emptyState();
  return loadState(readFileSync(STATE_PATH, "utf8"));
}

function saveStateFile(state: ReturnType<typeof loadStateFile>) {
  writeFileSync(STATE_PATH, serializeState(state));
}

async function main() {
  console.log(
    `[sales-automations] starting mode=${COMMIT ? "COMMIT" : "dry-run"} pollMs=${POLL_MS} once=${ONCE}`
  );

  if (COMMIT && !process.env.TELEGRAM_OTP_BOT_TOKEN?.trim()) {
    console.error("[sales-automations] TELEGRAM_OTP_BOT_TOKEN is not set — cannot send. Exiting.");
    process.exit(1);
  }

  const client = getTwentyClientForInstance("default");
  const nextLeadNumber = createLeadNumberSource(db, "default");
  const state = loadStateFile();

  let stopping = false;
  const stop = (signal: string) => {
    console.log(`[sales-automations] ${signal} received — finishing current pass`);
    stopping = true;
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  while (!stopping) {
    const now = new Date();
    try {
      const counts = await runSalesAutomationsPass(
        {
          client,
          nextLeadNumber,
          db,
          send: (chatId, text) => sendTelegramDm(chatId, text),
          resolveChat: (tail) => resolveTelegramChatIdByPhoneTail(db, tail),
          ownerPhones: OWNER_PHONES,
          ownerNames: OWNER_NAMES,
          cardBaseUrl: CARD_BASE_URL,
          state,
          now,
          dayLabel: dubaiDayLabel(now),
          hourDubai: dubaiHour(now),
        },
        { commit: COMMIT, forceDigest: FORCE_DIGEST, logger: (line) => console.log(line) }
      );
      console.log(`[sales-automations] pass: ${JSON.stringify(counts)}`);
      if (COMMIT || PRIME) saveStateFile(state);
    } catch (err) {
      // A pass-level failure (DB down, Twenty down) must not kill the loop.
      console.error(
        `[sales-automations] pass failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (ONCE) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  if (COMMIT || PRIME) saveStateFile(state);
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

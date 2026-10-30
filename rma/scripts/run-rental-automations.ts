// RENTAL automations runner (nohup/pm2-friendly CLI, same shape as
// run-manager-notify.ts / run-sales-automations.ts).
//
// RENTAL instance ONLY (:3002, "rental"). Polls the rental workspace and runs
// the automations in src/platform/notify/rental-automations.ts: lead
// numbering, returning-lead detection, stage-change timestamps, owner
// reassignment pings + follow-up monitor, Successful→bookings broadcast, and
// the 08:00 GST daily digest. Reassignment/digest DMs go through the Telegram
// staff bot (sendTelegramDm); reassignment pings ALSO go to the owner's
// WhatsApp via wa_outbox (enqueueOutbox on the take-auto staff line, drained
// by the wa-observer bridge — never Baileys directly); booking lines go to
// the team's Telegram group (TELEGRAM_BOT_TOKEN → DEAL_BROADCAST_CHAT_ID).
//
// DRY-RUN BY DEFAULT — zero writes to Twenty, zero Telegram sends, and the
// state snapshot does not advance until --commit is passed.
//
// Usage (from platform/):
//   npx tsx scripts/run-rental-automations.ts                       # poll forever, dry-run
//   npx tsx scripts/run-rental-automations.ts --once                # single dry-run pass
//   npx tsx scripts/run-rental-automations.ts --once --commit       # single LIVE pass
//   npx tsx scripts/run-rental-automations.ts --once --commit --force-digest  # fire the digest now
//
// Env:
//   RENTAL_AUTOMATIONS_POLL_MS   poll interval, default 60000
//   RENTAL_AUTOMATIONS_STATE     snapshot path, default scripts/.rental-automations-state.json
//   RENTAL_AUTOMATIONS_FOLLOW_UP_HOURS  reassignment follow-up window, default 3
//   TWENTY_RENTAL_API_KEY / TWENTY_RENTAL_BASE_URL, DATABASE_URL,
//   TELEGRAM_OTP_BOT_TOKEN (DMs), TELEGRAM_BOT_TOKEN + DEAL_BROADCAST_CHAT_ID
//   (booking broadcast), NOTIFY_WA_SENDER_LINE (WhatsApp sender line,
//   default takeauto-leasing-dept) as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { eq } from "drizzle-orm";
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { enqueueOutbox } from "@/platform/outbox";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
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
  runRentalAutomationsPass,
  serializeState,
} from "@/platform/notify/rental-automations";

const SCRIPTS_DIR = dirname(import.meta.filename);
const STATE_PATH =
  process.env.RENTAL_AUTOMATIONS_STATE?.trim() || resolve(SCRIPTS_DIR, ".rental-automations-state.json");

// workspaceMember email → full phone digits ("" = not on file → skip Telegram).
// Phones are the personal numbers the staff linked to @zamtek_otp_bot (from the
// platform telegram_link table); the chat_id resolves through telegram_link by
// phone tail9 at runtime. Linked rental staff: Ayham (manager), Ali, Abdullah.
// Babek / Moe / Mohamed are not linked yet → their pings are skipped + reported.
const OWNER_PHONES: Record<string, string> = {
  "ayham@rental.ae": "971581417020",
  "ali@etm.com": "971542445835",
  "abdullah@cardiwan.com": "971569808087",
  "babek@easyrent.com": "",
  "moe@takeauto.com": "",
  "mohamed@cardiwan.com": "",
};

const OWNER_NAMES: Record<string, string> = {
  "ayham@rental.ae": "Ayham",
  "ali@etm.com": "Ali",
  "abdullah@cardiwan.com": "Abdullah",
  "babek@easyrent.com": "Babek",
  "moe@takeauto.com": "Moe",
  "mohamed@cardiwan.com": "Mohamed",
};

const MANAGER_EMAIL = "ayham@rental.ae";

// WhatsApp leg for reassignment pings: enqueued into wa_outbox on the
// take-auto tenant's staff line (lines.ts maps it to take-auto); the
// wa-takeauto-leasing-dept observer bridge drains it with its ban-safety
// guards. Same sender line the notify module uses (NOTIFY_WA_SENDER_LINE).
const WA_TENANT_SLUG = "take-auto";
const WA_SENDER_LINE = process.env.NOTIFY_WA_SENDER_LINE?.trim() || "takeauto-leasing-dept";

const CARD_BASE_URL = process.env.TWENTY_RENTAL_URL?.trim() || "https://rent.takeauto.tech";
const BOOKING_CHAT_ID = process.env.DEAL_BROADCAST_CHAT_ID?.trim() || "-1002858056428";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const POLL_MS = envInt("RENTAL_AUTOMATIONS_POLL_MS", 60_000);
const FOLLOW_UP_HOURS = envInt("RENTAL_AUTOMATIONS_FOLLOW_UP_HOURS", 3);
const ONCE = process.argv.includes("--once");
const COMMIT = process.argv.includes("--commit");
const FORCE_DIGEST = process.argv.includes("--force-digest");

function loadStateFile() {
  if (!existsSync(STATE_PATH)) return emptyState();
  return loadState(readFileSync(STATE_PATH, "utf8"));
}

function saveStateFile(state: ReturnType<typeof loadStateFile>) {
  writeFileSync(STATE_PATH, serializeState(state));
}

/** Post a booking line to the team's Telegram group. Null = no channel. */
function makeBookingSender(): ((text: string) => Promise<void>) | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return null;
  return async (text: string) => {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: BOOKING_CHAT_ID, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Telegram HTTP ${res.status}: ${body.slice(0, 300)}`);
    const data = JSON.parse(body) as { ok?: boolean; description?: string };
    if (!data.ok) throw new Error(`Telegram ok=false: ${data.description ?? "unknown"}`);
  };
}

async function main() {
  console.log(
    `[rental-automations] starting mode=${COMMIT ? "COMMIT" : "dry-run"} pollMs=${POLL_MS} once=${ONCE}`
  );

  if (COMMIT && !process.env.TELEGRAM_OTP_BOT_TOKEN?.trim()) {
    console.error("[rental-automations] TELEGRAM_OTP_BOT_TOKEN is not set — cannot send. Exiting.");
    process.exit(1);
  }

  const client = getTwentyClientForInstance("rental");
  const nextLeadNumber = createLeadNumberSource(db, "rental");
  const state = loadStateFile();
  const sendBooking = makeBookingSender();
  if (!sendBooking) {
    console.log("[rental-automations] no TELEGRAM_BOT_TOKEN — booking broadcast disabled (will be reported as skipped)");
  }

  // WhatsApp sender for owner reassignment pings (commit mode only). The
  // outbox dedupe index is (board_item_id, content_hash) on pending rows, so
  // boardItemId carries the recipient: identical re-pings to the SAME owner
  // collapse while one is still pending, different owners never do. The
  // ledger-row placeholder in modules/notify/send.ts is the same idea.
  let sendWhatsApp: ((phoneDigits: string, text: string) => Promise<void>) | undefined;
  if (COMMIT) {
    const [t] = await db
      .select({ id: tenant.id })
      .from(tenant)
      .where(eq(tenant.slug, WA_TENANT_SLUG))
      .limit(1);
    if (!t) {
      console.error(
        `[rental-automations] tenant "${WA_TENANT_SLUG}" not found — WhatsApp reassignment pings DISABLED (Telegram unaffected)`
      );
    } else {
      const waTenantId = t.id;
      sendWhatsApp = async (phoneDigits, text) => {
        await withDrizzleTenant(waTenantId, (tx) =>
          enqueueOutbox(tx, {
            tenantId: waTenantId,
            boardItemId: `reassign-wa:${phoneDigits}`,
            toJid: `${phoneDigits}@s.whatsapp.net`,
            brandLine: WA_SENDER_LINE,
            body: text,
            approvedBy: "rental-automations",
          })
        );
      };
      console.log(`[rental-automations] WhatsApp reassignment pings via wa_outbox line=${WA_SENDER_LINE}`);
    }
  }

  let stopping = false;
  const stop = (signal: string) => {
    console.log(`[rental-automations] ${signal} received — finishing current pass`);
    stopping = true;
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  while (!stopping) {
    const now = new Date();
    try {
      const counts = await runRentalAutomationsPass(
        {
          client,
          nextLeadNumber,
          db,
          send: (chatId, text) => sendTelegramDm(chatId, text),
          sendWhatsApp,
          resolveChat: (tail) => resolveTelegramChatIdByPhoneTail(db, tail),
          ownerPhones: OWNER_PHONES,
          ownerNames: OWNER_NAMES,
          managerEmail: MANAGER_EMAIL,
          cardBaseUrl: CARD_BASE_URL,
          state,
          now,
          dayLabel: dubaiDayLabel(now),
          hourDubai: dubaiHour(now),
          sendBooking: sendBooking ?? undefined,
          reassignFollowUpMs: FOLLOW_UP_HOURS * 3_600_000,
        },
        { commit: COMMIT, forceDigest: FORCE_DIGEST, logger: (line) => console.log(line) }
      );
      console.log(`[rental-automations] pass: ${JSON.stringify(counts)}`);
      if (COMMIT) saveStateFile(state);
    } catch (err) {
      // A pass-level failure (DB down, Twenty down) must not kill the loop.
      console.error(
        `[rental-automations] pass failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (ONCE) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  if (COMMIT) saveStateFile(state);
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

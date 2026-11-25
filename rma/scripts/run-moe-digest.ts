import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { runDigest } from "@/platform/exec-digest";
import { notifyTelegram } from "@/platform/notify/telegram";

// Executive digest runner (heartbeat-driven).
//   --mode morning  full digest (once daily, marker-gated by the heartbeat)
//   --mode night    watchman: sends ONLY when something is on fire
// Delivery chat comes from MOE_DIGEST_CHAT_ID; unset → visible no-op.
async function main() {
  const mode = process.argv.includes("--mode=night") ? "night" : "morning";
  const chatId = process.env.MOE_DIGEST_CHAT_ID?.trim();
  if (!chatId) {
    console.log("[moe-digest] MOE_DIGEST_CHAT_ID not set — digest skipped (visible no-op)");
    await pool.end();
    process.exit(0);
  }
  const [t] = await db.select({ id: tenant.id }).from(tenant).where(eq(tenant.slug, "take-auto")).limit(1);
  const result = await runDigest(db, {
    mode,
    takeAutoTenantId: t?.id ?? null,
    // The chat id comes from a person who pressed /start on @zamtek_otp_bot,
    // and a chat_id ONLY works with the bot that person actually talked to.
    // Without this the helper falls back to BOARD_TELEGRAM_BOT_TOKEN /
    // TELEGRAM_BOT_TOKEN — neither of which is set in platform/.env.local
    // (the driver-bot token lives in platform/driver-bot/.env), so every
    // send failed with "TELEGRAM_BOT_TOKEN is not set" while the heartbeat
    // logged a cheerful sent=0.
    send: (text) =>
      notifyTelegram(chatId, text, {
        token:
          process.env.NOTIFY_TELEGRAM_BOT_TOKEN?.trim() ||
          process.env.TELEGRAM_OTP_BOT_TOKEN?.trim(),
      }),
  });
  console.log(`[moe-digest] mode=${mode} sent=${result.sent}${result.reason ? " reason=" + result.reason : ""}`);
}
main().then(async () => { await pool.end(); process.exit(0); })
      .catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });

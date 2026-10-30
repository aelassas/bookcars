/**
 * telegram.ts — minimal Telegram notify helper for internal staff nudges.
 *
 * Same bot/token pattern as platform/driver-bot (env TELEGRAM_BOT_TOKEN from
 * @BotFather), but uses the plain Bot API over fetch so the Next.js app does
 * not need the telegraf dependency. INTERNAL ONLY — this must never be used to
 * message a customer.
 *
 * Env:
 *   BOARD_TELEGRAM_BOT_TOKEN  optional dedicated bot for board escalations
 *   TELEGRAM_BOT_TOKEN        fallback (the driver-bot token)
 */

export type NotifyResult = { ok: boolean; error?: string };

// A chat_id only works with the bot the person actually talked to. Staff
// telegram_link rows are created through @zamtek_otp_bot (login flow), so
// modules/notify passes TELEGRAM_OTP_BOT_TOKEN here; the default env fallbacks
// below serve the original board/driver-bot callers unchanged.
export async function notifyTelegram(
  chatId: string,
  text: string,
  opts: { token?: string } = {},
): Promise<NotifyResult> {
  const token =
    opts.token?.trim() ||
    process.env.BOARD_TELEGRAM_BOT_TOKEN?.trim() ||
    process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN is not set" };
  if (!chatId) return { ok: false, error: "chatId is empty" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        // Plain text on purpose: card summaries are user-generated and would
        // break Markdown/HTML parse modes.
        disable_web_page_preview: true,
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      return { ok: false, error: `Telegram HTTP ${res.status}: ${body.slice(0, 300)}` };
    }
    const data = JSON.parse(body) as { ok?: boolean; description?: string };
    return data.ok
      ? { ok: true }
      : { ok: false, error: data.description ?? "Telegram returned ok=false" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

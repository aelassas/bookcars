// ============================================================================
// reminders.ts — delivery reminders for drivers.
//
// PRIMARY: a calendar (.ics) event the driver adds to the phone with one tap;
//   it carries its own alarms at -1 day and -2 hours (the phone reminds).
// FALLBACK: if the driver doesn't add it, the bot sends Telegram reminders at
//   -1 day and -2 hours before delivery (best-effort, in-process scheduler).
//
// The bot NEVER messages a customer — reminders go only to the driver's chat.
// ============================================================================

/** Minimal sender — just what the fallback needs (decoupled from Telegraf generics). */
interface Sender { telegram: { sendMessage(chatId: number, text: string): Promise<unknown> } }

function icsStamp(d: Date): string {
  // UTC basic format: YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export interface DeliveryEvent {
  uid: string; // stable id, e.g. rental id
  deliveryAt: Date;
  title: string; // e.g. "Deliver Mercedes G63 (46424 EE) to Bakhruz"
  location?: string;
  notes?: string;
}

/** Build an .ics calendar invite with -1 day and -2 hour alarms. */
export function buildIcs(ev: DeliveryEvent): Buffer {
  const start = ev.deliveryAt;
  const end = new Date(start.getTime() + 30 * 60_000); // 30-min slot
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TAKE Auto//Driver Bot//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}@take-auto`,
    `DTSTAMP:${icsStamp(new Date(start.getTime()))}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${esc(ev.title)}`,
    ev.location ? `LOCATION:${esc(ev.location)}` : "",
    ev.notes ? `DESCRIPTION:${esc(ev.notes)}` : "",
    // Alarm -1 day
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Delivery tomorrow", "TRIGGER:-P1D", "END:VALARM",
    // Alarm -2 hours
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Delivery in 2 hours", "TRIGGER:-PT2H", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean);
  return Buffer.from(lines.join("\r\n"), "utf8");
}

// ─── In-process Telegram fallback scheduler ──────────────────────────────────
// Best-effort: schedules a -1 day and -2 hour message. Durable primary is the
// .ics above; this covers drivers who don't add the calendar event.
interface Scheduled { fireAt: number; chatId: number; text: string; timer: NodeJS.Timeout }
const scheduled: Scheduled[] = [];

function schedule(bot: Sender, chatId: number, fireAt: Date, text: string): void {
  const ms = fireAt.getTime() - Date.now();
  if (ms <= 0) return; // already passed
  const timer = setTimeout(() => {
    bot.telegram.sendMessage(chatId, text).catch((e) => console.error("[reminder] send failed:", e.message));
  }, ms);
  scheduled.push({ fireAt: fireAt.getTime(), chatId, text, timer });
}

/** Schedule the -1 day and -2 hour Telegram reminders for a delivery. */
export function scheduleTelegramReminders(bot: Sender, chatId: number, ev: DeliveryEvent): void {
  const t = ev.deliveryAt.getTime();
  schedule(bot, chatId, new Date(t - 24 * 3600_000), `⏰ Reminder: ${ev.title} — tomorrow.`);
  schedule(bot, chatId, new Date(t - 2 * 3600_000), `⏰ Reminder: ${ev.title} — in 2 hours.`);
}

// Pure, client-safe helper for the honest per-bubble outbound status shown
// in the lead/customer chat thread (components/crm/ChatThread.tsx). Deliberately
// NOT part of modules/crm/chat-queries.ts ("use server") — a "use server"
// module's exports must all be async RPC-callable server actions, which a
// plain synchronous formatter isn't, and pulling one in from a "use client"
// component would try to bundle server-only db code (pg, dotenv, ...) into
// the client JS. `import type` below is fully erased at compile time, so it
// carries no such risk.
import type { WaOutboxStatus } from "@/platform/outbox/schema";
import type { BadgeTone } from "@/components/ui";
import type { LeadThreadOutboxLink } from "@/modules/crm/chat-queries";

export type ReplyStatusDisplay = { label: string; tone: BadgeTone };

/**
 * Renders the TRUE state of an outbound bubble — never implies "sent" or
 * "on its way" unless wa_outbox actually says so. Falls back to the
 * message row's own `status` only when no wa_outbox correlation exists
 * (older rows predating this feature).
 */
export function replyStatusDisplay(
  messageStatus: string,
  outbox: LeadThreadOutboxLink | null,
  sendEnabledForBrand: boolean
): ReplyStatusDisplay {
  if (outbox) {
    if (outbox.flagged) {
      return { label: "⚠ На проверке старшего (стоп-слова)", tone: "warning" };
    }
    const status: WaOutboxStatus = outbox.status;
    if (status === "sent") return { label: "Отправлено ✓", tone: "success" };
    if (status === "failed") {
      return { label: outbox.error ? `Ошибка отправки: ${outbox.error}` : "Ошибка отправки", tone: "danger" };
    }
    if (status === "skipped" || status === "skipped_no_observer") {
      return { label: "Не отправлено (нет наблюдателя линии)", tone: "danger" };
    }
    // status === "pending"
    return sendEnabledForBrand
      ? { label: "В очереди на отправку…", tone: "neutral" }
      : { label: "В очереди — отправка на паузе", tone: "neutral" };
  }

  // No wa_outbox correlation found — fall back to the message row's own
  // status (covers legacy/imported outbound rows this feature never wrote).
  if (messageStatus === "sent" || messageStatus === "human_replied" || messageStatus === "ai_replied") {
    return { label: "Отправлено ✓", tone: "success" };
  }
  if (messageStatus === "failed") return { label: "Ошибка отправки", tone: "danger" };
  return { label: "В очереди", tone: "neutral" };
}

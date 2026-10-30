/**
 * sla.ts — pure SLA helpers for The Board. Client-safe (no db/env imports).
 *
 * SLA POLICY (set by classify-inbox when the card is created/updated):
 *   sla_due_at = first_seen_at + (high → 1h, med → 4h, low → 24h)
 *
 * BREACH is a COMPUTED state, never a column, so it cannot go stale:
 *   breached ⇔ status = 'open' AND awaiting_reply AND sla_due_at < now
 * Any human action (approve / dismiss / assign-and-handle) moves the card out
 * of 'open' or clears awaiting_reply, which clears the breach.
 */

export type SlaCard = {
  status: string;
  awaitingReply: boolean;
  /** ISO string (serialized) or Date (db row). */
  slaDueAt: string | Date;
};

function dueMs(slaDueAt: string | Date): number {
  return typeof slaDueAt === "string" ? Date.parse(slaDueAt) : slaDueAt.getTime();
}

/** True when the card is open, still awaiting a reply, and past its SLA. */
export function isBreached(card: SlaCard, now: number = Date.now()): boolean {
  return card.status === "open" && card.awaitingReply && dueMs(card.slaDueAt) < now;
}

/** Minutes past due (0 if not overdue). */
export function overdueMinutes(slaDueAt: string | Date, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - dueMs(slaDueAt)) / 60_000));
}

/** Compact "3d 4h" / "5h 12m" / "42m" duration label. */
export function formatDurationMins(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/* ---------------------------------------------------------------------------
   Shared presentation helpers for the per-vehicle calendar / live archive.

   Presentation only — the data itself comes from
   `@/modules/fleet/timeline-queries` (owned by the backend).
--------------------------------------------------------------------------- */
import type { VehicleTimelineEventType } from "@/modules/fleet/timeline-queries";
import { ru } from "@/lib/i18n/ru";

/** Every event type the timeline can carry, in the order shown in the legend. */
export const EVENT_TYPES: VehicleTimelineEventType[] = [
  "rental",
  "handover",
  "return",
  "maintenance",
  "service",
  "damage",
  "fine",
  "document",
  "purpose_change",
];

/**
 * Colour + label per type. Colour is never the only signal: every bar also
 * carries its type label in text (and in its aria-label), per the a11y rule.
 */
export const TYPE_META: Record<
  VehicleTimelineEventType,
  { label: string; bar: string; dot: string; soft: string }
> = {
  rental: {
    label: ru.vehicleCalendar.types.rental,
    bar: "bg-brand-600 text-white",
    dot: "bg-brand-600",
    soft: "bg-brand-50 text-brand-700",
  },
  handover: {
    label: ru.vehicleCalendar.types.handover,
    bar: "bg-emerald-600 text-white",
    dot: "bg-emerald-600",
    soft: "bg-emerald-500/15 text-emerald-700",
  },
  return: {
    label: ru.vehicleCalendar.types.return,
    bar: "bg-sky-600 text-white",
    dot: "bg-sky-600",
    soft: "bg-sky-500/15 text-sky-700",
  },
  maintenance: {
    label: ru.vehicleCalendar.types.maintenance,
    bar: "bg-amber-500 text-white",
    dot: "bg-amber-500",
    soft: "bg-amber-500/15 text-amber-700",
  },
  service: {
    label: ru.vehicleCalendar.types.service,
    bar: "bg-teal-600 text-white",
    dot: "bg-teal-600",
    soft: "bg-teal-500/15 text-teal-700",
  },
  damage: {
    label: ru.vehicleCalendar.types.damage,
    bar: "bg-rose-600 text-white",
    dot: "bg-rose-600",
    soft: "bg-rose-500/15 text-rose-700",
  },
  fine: {
    label: ru.vehicleCalendar.types.fine,
    bar: "bg-orange-500 text-white",
    dot: "bg-orange-500",
    soft: "bg-orange-500/15 text-orange-700",
  },
  document: {
    label: ru.vehicleCalendar.types.document,
    bar: "bg-slate-600 text-white",
    dot: "bg-slate-600",
    soft: "bg-slate-500/15 text-slate-700",
  },
  // Purpose/custody change — a distinct violet so it never reads as a booking.
  purpose_change: {
    label: "Reassignment",
    bar: "bg-violet-600 text-white",
    dot: "bg-violet-600",
    soft: "bg-violet-500/15 text-violet-700",
  },
};

export function typeMeta(type: string) {
  return (
    TYPE_META[type as VehicleTimelineEventType] ?? {
      label: type,
      bar: "bg-slate-400 text-white",
      dot: "bg-slate-400",
      soft: "bg-sunken text-ink-2",
    }
  );
}

/** A cancelled event stays visible but reads as struck-through and quiet. */
export function isCancelled(status: string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === "cancelled" || s === "canceled" || s === "отменено";
}

/* ------------------------------- date utils ------------------------------ */

export const MS_DAY = 86_400_000;

/** Server actions can hand back Date objects or ISO strings — normalise both. */
export function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Week starts on Monday (UAE offices run Mon–Sat; Monday reads best here). */
export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7;
  return addDays(startOfDay(d), -day);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "12 июл 14:00 → 15 июл 10:00", or "… → без даты окончания" when open. */
export function fmtPeriod(start: Date, end: Date | null): string {
  return `${fmtDateTime(start)} → ${end ? fmtDateTime(end) : ru.vehicleCalendar.openEnded}`;
}

/* --------------------------------- lanes --------------------------------- */

/**
 * Greedy lane packing: overlapping bars are stacked into the first lane whose
 * previous bar has already ended, so nothing ever draws on top of anything
 * else. Items must already be shaped as `{ start, end }` in any numeric unit
 * (ms for the day view, column index for the month/week grid).
 */
export function assignLanes<T>(
  items: T[],
  startOf: (item: T) => number,
  endOf: (item: T) => number
): { placed: Array<{ item: T; lane: number }>; laneCount: number } {
  const sorted = [...items].sort(
    (a, b) => startOf(a) - startOf(b) || endOf(a) - endOf(b)
  );
  const laneEnds: number[] = [];
  const placed: Array<{ item: T; lane: number }> = [];

  for (const item of sorted) {
    let lane = laneEnds.findIndex((end) => end <= startOf(item));
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = endOf(item);
    placed.push({ item, lane });
  }

  return { placed, laneCount: Math.max(laneEnds.length, 1) };
}

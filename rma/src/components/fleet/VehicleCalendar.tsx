"use client";

/* ---------------------------------------------------------------------------
   Per-vehicle calendar — month (default) / week / day, with 24-hour slots on
   the day view because rentals really are hourly ("выдача 11:00").

   Everything that happens to one car is drawn on one timeline: rentals,
   handover, return, maintenance, service, damage, fines/Salik and documents.
   Data comes from the backend contract in `@/modules/fleet/timeline-queries`;
   this file is presentation only.
--------------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getVehicleTimeline,
  type VehicleTimelineEvent,
  type VehicleTimelineEventType,
} from "@/modules/fleet/timeline-queries";
import { addTimelineEvent, cancelTimelineEvent } from "@/modules/fleet/timeline-actions";
import { Button, Input, Select, Label, cx } from "@/components/ui";
import { Modal, ModalFooter, ModalError } from "@/components/ui/Modal";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { ru } from "@/lib/i18n/ru";
import {
  EVENT_TYPES,
  MS_DAY,
  addDays,
  assignLanes,
  endOfMonth,
  fmtDay,
  fmtPeriod,
  fmtTime,
  isCancelled,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDate,
  typeMeta,
} from "./vehicle-timeline-ui";

const t = ru.vehicleCalendar;

type ViewMode = "month" | "week" | "day";

const VIEWS: Array<{ id: ViewMode; label: string }> = [
  { id: "month", label: t.views.month },
  { id: "week", label: t.views.week },
  { id: "day", label: t.views.day },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** Visible window for a view — also the fetch window handed to the backend. */
function windowFor(view: ViewMode, anchor: Date): { from: Date; to: Date } {
  if (view === "day") {
    const from = startOfDay(anchor);
    return { from, to: addDays(from, 1) };
  }
  if (view === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 7) };
  }
  // Month view shows whole weeks, so the window is padded out to week edges.
  const from = startOfWeek(startOfMonth(anchor));
  const to = addDays(startOfWeek(endOfMonth(anchor)), 7);
  return { from, to };
}

function periodLabel(view: ViewMode, anchor: Date): string {
  if (view === "day") return fmtDay(anchor);
  if (view === "week") {
    const from = startOfWeek(anchor);
    const to = addDays(from, 6);
    const left = from.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const right = to.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${left} – ${right}`;
  }
  return anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function shift(view: ViewMode, anchor: Date, dir: 1 | -1): Date {
  if (view === "day") return addDays(anchor, dir);
  if (view === "week") return addDays(anchor, dir * 7);
  return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
}

/** Normalised event with resolved dates, clamped later per view. */
type Slot = {
  event: VehicleTimelineEvent;
  start: Date;
  /** null = open-ended; drawn to the edge of the visible window. */
  end: Date | null;
  cancelled: boolean;
};

function toSlots(events: VehicleTimelineEvent[]): Slot[] {
  return events
    .map((event) => {
      const start = toDate(event.startsAt);
      if (!start) return null;
      return {
        event,
        start,
        end: toDate(event.endsAt),
        cancelled: isCancelled(event.status),
      } satisfies Slot;
    })
    .filter((s): s is Slot => s !== null);
}

export function VehicleCalendar({
  tenantSlug,
  vehicleId,
  initialEvents,
  initialView = "month",
}: {
  tenantSlug: string;
  vehicleId: string;
  initialEvents: VehicleTimelineEvent[];
  initialView?: ViewMode;
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>(initialView);
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [events, setEvents] = useState<VehicleTimelineEvent[]>(initialEvents);
  // The mount effect immediately refetches the window, so loading starts true;
  // the render-time adjustment below re-arms it when the window changes.
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ slot: Slot; x: number; y: number } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { from, to } = useMemo(() => windowFor(view, anchor), [view, anchor]);

  const fetchKey = `${tenantSlug}|${vehicleId}|${from.toISOString()}|${to.toISOString()}`;
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey);
  if (prevFetchKey !== fetchKey) {
    setPrevFetchKey(fetchKey);
    setLoading(true);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getVehicleTimeline(
        tenantSlug,
        vehicleId,
        from.toISOString(),
        to.toISOString()
      );
      setEvents(rows);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, vehicleId, from, to]);

  useEffect(() => {
    let cancelledFetch = false;
    getVehicleTimeline(tenantSlug, vehicleId, from.toISOString(), to.toISOString())
      .then((rows) => {
        if (!cancelledFetch) setEvents(rows);
      })
      .catch((err: unknown) => {
        if (!cancelledFetch) {
          setActionError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelledFetch) setLoading(false);
      });
    return () => {
      cancelledFetch = true;
    };
  }, [tenantSlug, vehicleId, from, to]);

  // Escape closes the detail popover.
  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const slots = useMemo(() => toSlots(events), [events]);
  const today = new Date();

  function openDetail(slot: Slot, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    setSelected({ slot, x: rect.left, y: rect.bottom + 8 });
  }

  async function handleCancel(eventId: string) {
    if (!window.confirm(t.cancelConfirm)) return;
    setActionError(null);
    try {
      await cancelTimelineEvent(tenantSlug, eventId);
      setSelected(null);
      await load();
      router.refresh();
    } catch (err: unknown) {
      // Surface the backend's message verbatim — it is already friendly RU.
      setActionError(err instanceof Error ? err.message : t.cancelError);
    }
  }

  return (
    <section className="rounded-card border border-line bg-surface shadow-card">
      {/* ------------------------------ toolbar ----------------------------- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-4 py-3">
        <div
          className="flex gap-0.5 rounded-field border border-line bg-surface p-0.5"
          role="group"
          aria-label={t.viewSwitchLabel}
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              className={cx(
                "rounded-[0.375rem] px-3 py-1.5 text-sm font-medium transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-brand-500/40",
                view === v.id
                  ? "bg-brand-700 text-white shadow-card"
                  : "text-ink-2 hover:bg-sunken hover:text-ink"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center rounded-field border border-line bg-surface shadow-card">
          <button
            type="button"
            onClick={() => setAnchor((a) => shift(view, a, -1))}
            aria-label={t.prev}
            className="rounded-l-field p-1.5 text-ink-2 transition-colors hover:bg-sunken hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[190px] px-3 py-1.5 text-center text-sm font-medium capitalize text-ink tnum">
            {periodLabel(view, anchor)}
          </span>
          <button
            type="button"
            onClick={() => setAnchor((a) => shift(view, a, 1))}
            aria-label={t.next}
            className="rounded-r-field p-1.5 text-ink-2 transition-colors hover:bg-sunken hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <Button variant="secondary" size="sm" onClick={() => setAnchor(startOfDay(new Date()))}>
          {t.today}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {loading && <span className="text-xs text-ink-3">{t.loading}</span>}
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t.addEvent}
          </Button>
        </div>
      </div>

      {/* ------------------------------- legend ----------------------------- */}
      <ul
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-line-soft px-4 py-2.5 text-xs text-ink-2"
        aria-label={t.legend}
      >
        {EVENT_TYPES.map((type) => {
          const meta = typeMeta(type);
          return (
            <li key={type} className="inline-flex items-center gap-1.5">
              <span className={cx("h-2.5 w-2.5 rounded-sm", meta.dot)} aria-hidden="true" />
              {meta.label}
            </li>
          );
        })}
        <li className="inline-flex items-center gap-1.5 text-ink-3">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" aria-hidden="true" />
          <span className="line-through">{t.cancelledLabel}</span>
        </li>
      </ul>

      {actionError && (
        <div
          role="alert"
          className="mx-4 mt-3 rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {actionError}
        </div>
      )}

      {/* -------------------------------- grid ------------------------------ */}
      <div className="p-4">
        {slots.length === 0 && !loading ? (
          <div className="rounded-card border border-dashed border-line px-6 py-12 text-center text-sm text-ink-3">
            {t.empty}
          </div>
        ) : view === "day" ? (
          <DayGrid day={from} slots={slots} onSelect={openDetail} />
        ) : (
          <MonthGrid
            from={from}
            to={to}
            anchorMonth={view === "month" ? anchor.getMonth() : null}
            slots={slots}
            today={today}
            onSelect={openDetail}
          />
        )}
      </div>

      {selected && (
        <EventPopover
          slot={selected.slot}
          x={selected.x}
          y={selected.y}
          tenantSlug={tenantSlug}
          onClose={() => setSelected(null)}
          onCancelEvent={handleCancel}
        />
      )}

      {showAdd && (
        <AddEventModal
          tenantSlug={tenantSlug}
          vehicleId={vehicleId}
          defaultDate={anchor}
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false);
            await load();
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

/* ========================================================================== */
/*  Month / week grid — bars span whole days, stacked into lanes per week row  */
/* ========================================================================== */

type WeekSegment = {
  slot: Slot;
  /** 0-6 within the week row. */
  col: number;
  span: number;
  /** The bar is clipped on that side, so the cap is drawn square. */
  clippedLeft: boolean;
  clippedRight: boolean;
};

function MonthGrid({
  from,
  to,
  anchorMonth,
  slots,
  today,
  onSelect,
}: {
  from: Date;
  to: Date;
  anchorMonth: number | null;
  slots: Slot[];
  today: Date;
  onSelect: (slot: Slot, el: HTMLElement) => void;
}) {
  const weekCount = Math.max(1, Math.round((to.getTime() - from.getTime()) / (7 * MS_DAY)));
  const weeks = Array.from({ length: weekCount }, (_, i) => addDays(from, i * 7));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-7 border-b border-line">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-3"
            >
              {d}
            </div>
          ))}
        </div>
        {weeks.map((weekStart) => (
          <WeekRow
            key={weekStart.toISOString()}
            weekStart={weekStart}
            anchorMonth={anchorMonth}
            slots={slots}
            today={today}
            windowEnd={to}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function WeekRow({
  weekStart,
  anchorMonth,
  slots,
  today,
  windowEnd,
  onSelect,
}: {
  weekStart: Date;
  anchorMonth: number | null;
  slots: Slot[];
  today: Date;
  windowEnd: Date;
  onSelect: (slot: Slot, el: HTMLElement) => void;
}) {
  const weekEnd = addDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const segments: WeekSegment[] = [];
  for (const slot of slots) {
    // Open-ended events run to the edge of the visible window.
    const end = slot.end ?? windowEnd;
    if (end < weekStart || slot.start >= weekEnd) continue;
    const startCol = Math.max(
      0,
      Math.floor((startOfDay(slot.start).getTime() - weekStart.getTime()) / MS_DAY)
    );
    const endCol = Math.min(
      6,
      Math.floor((startOfDay(end).getTime() - weekStart.getTime()) / MS_DAY)
    );
    segments.push({
      slot,
      col: startCol,
      span: Math.max(1, endCol - startCol + 1),
      clippedLeft: slot.start < weekStart,
      clippedRight: end >= weekEnd,
    });
  }

  const { placed, laneCount } = assignLanes(
    segments,
    (s) => s.col,
    (s) => s.col + s.span
  );

  return (
    <div className="grid grid-cols-7 border-b border-line-soft last:border-b-0">
      {/* Day numbers */}
      {days.map((day) => {
        const outside = anchorMonth !== null && day.getMonth() !== anchorMonth;
        const isToday = isSameDay(day, today);
        const weekend = day.getDay() === 0 || day.getDay() === 6;
        return (
          <div
            key={day.toISOString()}
            className={cx(
              "border-r border-line-soft px-2 pt-1.5 text-right text-[11px] tnum last:border-r-0",
              weekend && "bg-sunken/40",
              isToday
                ? "font-semibold text-brand-700"
                : outside
                  ? "text-ink-3/60"
                  : "text-ink-2"
            )}
          >
            <span
              className={cx(
                isToday &&
                  "inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-50"
              )}
            >
              {day.getDate()}
            </span>
          </div>
        );
      })}

      {/* Lanes — one grid row per lane so bars never overlap each other. */}
      <div className="col-span-7 space-y-1 px-1 pb-2 pt-1" style={{ minHeight: 44 }}>
        {Array.from({ length: laneCount }, (_, lane) => (
          <div key={lane} className="grid grid-cols-7 gap-1">
            {placed
              .filter((p) => p.lane === lane)
              .map(({ item }) => (
                <EventBar
                  key={`${item.slot.event.id}-${item.col}`}
                  slot={item.slot}
                  onSelect={onSelect}
                  style={{ gridColumn: `${item.col + 1} / span ${item.span}` }}
                  clippedLeft={item.clippedLeft}
                  clippedRight={item.clippedRight}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Day grid — all 24 hourly slots, bars positioned by real pickup/drop time   */
/* ========================================================================== */

const HOUR_PX = 44;

function DayGrid({
  day,
  slots,
  onSelect,
}: {
  day: Date;
  slots: Slot[];
  onSelect: (slot: Slot, el: HTMLElement) => void;
}) {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);

  const visible = slots.filter((s) => {
    const end = s.end ?? dayEnd;
    return end > dayStart && s.start < dayEnd;
  });

  const { placed, laneCount } = assignLanes(
    visible,
    (s) => Math.max(dayStart.getTime(), s.start.getTime()),
    (s) => Math.min(dayEnd.getTime(), (s.end ?? dayEnd).getTime())
  );

  const now = new Date();
  const showNow = isSameDay(now, dayStart);

  return (
    <div className="flex">
      {/* Hour gutter */}
      <div className="w-14 shrink-0">
        {HOURS.map((h) => (
          <div
            key={h}
            className="relative border-t border-line-soft pr-2 text-right text-[10px] text-ink-3 tnum"
            style={{ height: HOUR_PX }}
          >
            <span className="absolute -top-1.5 right-2">
              {String(h).padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      {/* Slot column */}
      <div
        className="relative flex-1 rounded-field border border-line-soft"
        style={{ height: HOUR_PX * 24 }}
      >
        {HOURS.map((h) => (
          <div
            key={h}
            className={cx(
              "border-t border-line-soft/70 first:border-t-0",
              h % 6 === 0 && "bg-sunken/30"
            )}
            style={{ height: HOUR_PX }}
          />
        ))}

        {showNow && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-danger"
            style={{
              top: `${((now.getTime() - dayStart.getTime()) / MS_DAY) * 100}%`,
            }}
            aria-hidden="true"
          />
        )}

        {placed.map(({ item, lane }) => {
          const start = Math.max(dayStart.getTime(), item.start.getTime());
          const end = Math.min(dayEnd.getTime(), (item.end ?? dayEnd).getTime());
          const top = ((start - dayStart.getTime()) / MS_DAY) * 100;
          const height = Math.max(2.2, ((end - start) / MS_DAY) * 100);
          const width = 100 / laneCount;
          return (
            <EventBar
              key={item.event.id}
              slot={item}
              onSelect={onSelect}
              vertical
              clippedLeft={item.start < dayStart}
              clippedRight={(item.end ?? dayEnd) > dayEnd}
              style={{
                position: "absolute",
                top: `${top}%`,
                height: `${height}%`,
                left: `calc(${lane * width}% + 2px)`,
                width: `calc(${width}% - 4px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  A single bar                                                              */
/* ========================================================================== */

function EventBar({
  slot,
  onSelect,
  style,
  vertical = false,
  clippedLeft = false,
  clippedRight = false,
}: {
  slot: Slot;
  onSelect: (slot: Slot, el: HTMLElement) => void;
  style?: React.CSSProperties;
  vertical?: boolean;
  clippedLeft?: boolean;
  clippedRight?: boolean;
}) {
  const meta = typeMeta(slot.event.type);
  const label = slot.event.title?.trim() || meta.label;
  // Type + status are always in the text, never colour alone.
  const aria = `${meta.label}: ${label}. ${fmtPeriod(slot.start, slot.end)}${
    slot.event.status ? `. ${t.status}: ${slot.event.status}` : ""
  }`;

  return (
    <button
      type="button"
      onClick={(e) => onSelect(slot, e.currentTarget)}
      title={aria}
      aria-label={aria}
      style={style}
      className={cx(
        "flex min-w-0 items-center gap-1 overflow-hidden px-1.5 text-[11px] font-medium",
        "transition-opacity hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1",
        vertical ? "items-start rounded-field py-0.5 text-left" : "h-5 rounded-full",
        clippedLeft && !vertical && "rounded-l-none",
        clippedRight && !vertical && "rounded-r-none",
        slot.cancelled
          ? "bg-slate-200 text-slate-500 line-through opacity-70"
          : meta.bar
      )}
    >
      <span className="truncate">
        {fmtTime(slot.start)} · {label}
      </span>
    </button>
  );
}

/* ========================================================================== */
/*  Detail popover                                                            */
/* ========================================================================== */

function EventPopover({
  slot,
  x,
  y,
  tenantSlug,
  onClose,
  onCancelEvent,
}: {
  slot: Slot;
  x: number;
  y: number;
  tenantSlug: string;
  onClose: () => void;
  onCancelEvent: (eventId: string) => void | Promise<void>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const meta = typeMeta(slot.event.type);
  const { event } = slot;

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const left = Math.min(Math.max(8, x), (typeof window !== "undefined" ? window.innerWidth : 1200) - 340);
  const metaEntries = Object.entries(event.meta ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
        aria-label={t.close}
        tabIndex={-1}
      />
      <div
        ref={ref}
        role="dialog"
        aria-label={`${t.detailTitle}: ${meta.label}`}
        tabIndex={-1}
        style={{ position: "fixed", top: y, left, width: 320 }}
        className="z-50 rounded-card border border-line bg-surface p-4 shadow-pop focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              meta.soft
            )}
          >
            <span className={cx("h-2 w-2 rounded-full", meta.dot)} aria-hidden="true" />
            {meta.label}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="rounded-field p-1 text-ink-3 transition-colors hover:bg-sunken hover:text-ink-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3
          className={cx(
            "text-sm font-semibold text-ink",
            slot.cancelled && "text-ink-3 line-through"
          )}
        >
          {event.title?.trim() || meta.label}
        </h3>

        <dl className="mt-2 space-y-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-ink-3">{t.period}</dt>
            <dd className="text-right text-ink-2">{fmtPeriod(slot.start, slot.end)}</dd>
          </div>
          {event.status && (
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-ink-3">{t.status}</dt>
              <dd className="text-right font-medium text-ink-2">
                {slot.cancelled ? t.cancelledLabel : event.status}
              </dd>
            </div>
          )}
          {metaEntries.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="shrink-0 text-ink-3">{k}</dt>
              <dd className="truncate text-right text-ink-2">{String(v)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
          {event.rentalId && (
            <Link
              href={`/${tenantSlug}/rentals/${event.rentalId}`}
              className="text-xs font-medium text-brand-700 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              {t.linkedRental}
            </Link>
          )}
          {event.documentId && (
            <a
              href={`/api/files/${event.documentId}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-brand-700 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              {t.linkedDocument}
            </a>
          )}
          {!slot.cancelled && (
            <Button
              variant="danger"
              size="sm"
              className="ml-auto"
              onClick={() => void onCancelEvent(event.id)}
            >
              {t.cancelEvent}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

/* ========================================================================== */
/*  Add-event modal                                                           */
/* ========================================================================== */

/** `yyyy-MM-ddTHH:mm` for <input type="datetime-local"> in local time. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function AddEventModal({
  tenantSlug,
  vehicleId,
  defaultDate,
  onClose,
  onSaved,
}: {
  tenantSlug: string;
  vehicleId: string;
  defaultDate: Date;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [type, setType] = useState<VehicleTimelineEventType>("rental");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date(defaultDate);
    d.setHours(11, 0, 0, 0); // 11:00 — the usual pickup hour.
    return toLocalInput(d);
  });
  const [endsAt, setEndsAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!startsAt) {
      setError(t.form.startRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addTimelineEvent(tenantSlug, {
        vehicleId,
        type,
        startsAt: new Date(startsAt),
        endsAt: endsAt ? new Date(endsAt) : null,
        title: title.trim() || null,
      });
      await onSaved();
    } catch (err: unknown) {
      // The backend throws a friendly RU message on overlap
      // ("Машина уже забронирована на этот период") — show it as-is.
      setError(err instanceof Error ? err.message : t.form.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t.form.title} onClose={onClose} width="md">
      {error && <ModalError>{error}</ModalError>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="tl-type">{t.form.type}</Label>
          <Select
            id="tl-type"
            className="w-full"
            value={type}
            onChange={(e) => setType(e.target.value as VehicleTimelineEventType)}
          >
            {EVENT_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {typeMeta(tp).label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="tl-title">{t.form.eventTitle}</Label>
          <Input
            id="tl-title"
            className="w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.form.titlePlaceholder}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="tl-start">{t.form.startsAt}</Label>
            <Input
              id="tl-start"
              type="datetime-local"
              required
              className="w-full"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="tl-end">{t.form.endsAt}</Label>
            <Input
              id="tl-end"
              type="datetime-local"
              className="w-full"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-ink-3">{t.form.endsAtHint}</p>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.form.cancel}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t.form.submitting : t.form.submit}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

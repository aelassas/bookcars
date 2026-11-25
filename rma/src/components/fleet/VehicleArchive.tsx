/* ---------------------------------------------------------------------------
   Живой архив — the chronological read of the very same timeline the calendar
   draws. Newest first, grouped by day, one line per thing that happened to
   this car: rental, handover, return, maintenance, service, damage, fine and
   document.

   Presentation only; server-safe (no hooks, no client state).
--------------------------------------------------------------------------- */

import type { ReactNode } from "react";
import Link from "next/link";
import type {
  VehicleTimelineEvent,
  VehicleTimelineEventType,
} from "@/modules/fleet/timeline-queries";
import { cx } from "@/components/ui";
import {
  AlertTriangle,
  Car,
  FileText,
  KeyRound,
  Receipt,
  Undo2,
  Wrench,
  Settings,
  History,
  ArrowLeftRight,
} from "lucide-react";
import { ru } from "@/lib/i18n/ru";
import { fmtPeriod, isCancelled, toDate, typeMeta } from "./vehicle-timeline-ui";

const t = ru.vehicleCalendar;

const TYPE_ICON: Record<VehicleTimelineEventType, ReactNode> = {
  rental: <Car className="h-3.5 w-3.5" />,
  handover: <KeyRound className="h-3.5 w-3.5" />,
  return: <Undo2 className="h-3.5 w-3.5" />,
  maintenance: <Wrench className="h-3.5 w-3.5" />,
  service: <Settings className="h-3.5 w-3.5" />,
  damage: <AlertTriangle className="h-3.5 w-3.5" />,
  fine: <Receipt className="h-3.5 w-3.5" />,
  document: <FileText className="h-3.5 w-3.5" />,
  purpose_change: <ArrowLeftRight className="h-3.5 w-3.5" />,
};

function iconFor(type: string): ReactNode {
  return TYPE_ICON[type as VehicleTimelineEventType] ?? <History className="h-3.5 w-3.5" />;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function dayHeading(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function VehicleArchive({
  events,
  tenantSlug,
}: {
  events: VehicleTimelineEvent[];
  tenantSlug: string;
}) {
  // Newest first, then grouped by calendar day preserving that order.
  const rows = events
    .map((event) => ({ event, start: toDate(event.startsAt) }))
    .filter((r): r is { event: VehicleTimelineEvent; start: Date } => r.start !== null)
    .sort((a, b) => b.start.getTime() - a.start.getTime());

  const groups: Array<{ key: string; day: Date; items: typeof rows }> = [];
  for (const row of rows) {
    const key = dayKey(row.start);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(row);
    else groups.push({ key, day: row.start, items: [row] });
  }

  return (
    <section className="rounded-card border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-ink-3">
            <History className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
            {t.archiveTitle}
          </span>
          <span className="rounded-full bg-sunken px-1.5 py-px text-[11px] font-semibold text-ink-2 tnum">
            {rows.length}
          </span>
        </div>
        <span className="hidden text-xs text-ink-3 sm:block">{t.archiveHint}</span>
      </div>

      {groups.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-ink-3">{t.archiveEmpty}</div>
      ) : (
        <ol className="max-h-[640px] overflow-y-auto px-4 py-3">
          {groups.map((group) => (
            <li key={group.key} className="mb-4 last:mb-0">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                {dayHeading(group.day)}
              </h3>
              <ul className="space-y-1.5 border-l border-line-soft pl-3">
                {group.items.map(({ event, start }) => {
                  const meta = typeMeta(event.type);
                  const cancelled = isCancelled(event.status);
                  const end = toDate(event.endsAt);
                  return (
                    <li
                      key={event.id}
                      className="relative rounded-field px-2 py-1.5 transition-colors hover:bg-sunken/50"
                    >
                      <span
                        className={cx(
                          "absolute -left-[1.1rem] top-3 h-2 w-2 rounded-full ring-2 ring-surface",
                          cancelled ? "bg-slate-300" : meta.dot
                        )}
                        aria-hidden="true"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cx(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            cancelled ? "bg-sunken text-ink-3" : meta.soft
                          )}
                        >
                          {iconFor(event.type)}
                          {meta.label}
                        </span>
                        <span
                          className={cx(
                            "truncate text-sm font-medium text-ink",
                            cancelled && "text-ink-3 line-through"
                          )}
                        >
                          {event.title?.trim() || meta.label}
                        </span>
                        {event.status && (
                          <span className="text-[11px] text-ink-3">
                            · {cancelled ? t.cancelledLabel : event.status}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-ink-3">
                        <span className="tnum">{fmtPeriod(start, end)}</span>
                        {event.rentalId && (
                          <Link
                            href={`/${tenantSlug}/rentals/${event.rentalId}`}
                            className="font-medium text-brand-700 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                          >
                            {t.openRental}
                          </Link>
                        )}
                        {event.documentId && (
                          <a
                            href={`/api/files/${event.documentId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-brand-700 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                          >
                            {t.linkedDocument}
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

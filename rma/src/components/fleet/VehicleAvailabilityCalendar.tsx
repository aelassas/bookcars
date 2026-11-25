"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Button, ButtonLink, EmptyState, cx } from "@/components/ui";
import { getCalendarSlots } from "@/modules/rental/booking-queries";
import { rentalIsLongTerm } from "@/modules/rental/operations";
import { CreateRentalModal } from "@/components/modals/CreateRentalModal";
import { ChevronLeft, ChevronRight, CalendarRange, Car, Plus } from "lucide-react";

type Vehicle = {
  id: string;
  make: string;
  model: string;
  plate: string;
};

type RentalSlot = {
  rental: {
    id: string;
    vehicleId: string;
    startDate: Date | null;
    returnDate: Date | null;
    actualReturnDate: Date | null;
    status: string;
    extensionStatus?: string | null;
  };
  customerName: string | null;
  /** "rental" = canonical platform rental (clickable); "booking" = legacy sheet import (display-only). */
  source?: "rental" | "booking";
};


/* Booking bars — semantic tones from the design system. */
const STATUS_STYLE: Record<string, string> = {
  reserved: "bg-warn",
  active: "bg-success",
  returned: "bg-info",
  completed: "bg-line",
  cancelled: "bg-line-soft opacity-50",
};

const LEGEND: Array<{ label: string; dot: string }> = [
  { label: "Reserved", dot: "bg-warn" },
  { label: "Active", dot: "bg-success" },
  { label: "Returned", dot: "bg-info" },
  { label: "Completed", dot: "bg-line" },
];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(d: Date | null | undefined) {
  if (!d) return null;
  const parsed = d instanceof Date ? d : new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function VehicleAvailabilityCalendar({
  tenantId,
  tenantSlug,
  actorId,
  vehicles,
  initialRentals,
  initialMonth,
}: {
  tenantId: string;
  tenantSlug: string;
  actorId?: string;
  vehicles: Vehicle[];
  initialRentals: RentalSlot[];
  initialMonth: Date;
}) {
  const [month, setMonth] = useState(startOfMonth(initialMonth));
  const [rentals, setRentals] = useState<RentalSlot[]>(initialRentals);
  // The mount effect immediately refetches the month, so loading starts true;
  // the render-time adjustment below re-arms it whenever the month changes.
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchKey = `${tenantId}|${toDateKey(startOfMonth(month))}`;
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey);
  if (prevFetchKey !== fetchKey) {
    setPrevFetchKey(fetchKey);
    setLoading(true);
  }

  const days = useMemo(() => daysInMonth(month), [month]);
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const refresh = useCallback(() => {
    setLoading(true);
    return getCalendarSlots(tenantId, startOfMonth(month), endOfMonth(month))
      .then((rows) => setRentals(rows as RentalSlot[]))
      .finally(() => setLoading(false));
  }, [month, tenantId]);

  useEffect(() => {
    let cancelled = false;
    getCalendarSlots(tenantId, startOfMonth(month), endOfMonth(month))
      .then((rows) => {
        if (!cancelled) setRentals(rows as RentalSlot[]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, tenantId]);


  const rentalsByVehicle = useMemo(() => {
    const map = new Map<string, RentalSlot[]>();
    for (const r of rentals) {
      const list = map.get(r.rental.vehicleId) ?? [];
      list.push(r);
      map.set(r.rental.vehicleId, list);
    }
    return map;
  }, [rentals]);

  function prevMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  function nextMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  const today = new Date();

  return (
    <div>
      <PageHeader
        title="Fleet availability"
        subtitle="Vehicle bookings by day"
        icon={<CalendarRange className="h-4.5 w-4.5" />}
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> New booking
            </Button>
            <ButtonLink href={`/${tenantSlug}/fleet`} variant="secondary" size="sm">
              Fleet list
            </ButtonLink>
            <div className="flex items-center rounded-field border border-line bg-surface shadow-card">
              <button
                onClick={prevMonth}
                className="rounded-l-field p-1.5 text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[140px] px-3 py-1.5 text-center text-sm font-medium text-ink tnum">
                {monthLabel}
              </span>
              <button
                onClick={nextMonth}
                className="rounded-r-field p-1.5 text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      />

      {showModal && (
        <CreateRentalModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          actorId={actorId}
          vehicles={vehicles}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            void refresh();
          }}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-2">
        {LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className={cx("h-2 w-2 rounded-full", l.dot)} /> {l.label}
          </span>
        ))}
        {loading && <span className="ml-auto text-ink-3">Updating…</span>}
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          icon={<Car className="h-5 w-5" />}
          title="No vehicles found"
          description="Add rental vehicles to the fleet to see their availability here."
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
          <div
            className="grid min-w-[800px]"
            style={{ gridTemplateColumns: `180px repeat(${days}, minmax(28px, 1fr))` }}
          >
            {/* Header */}
            <div className="sticky left-0 z-10 border-b border-r border-line bg-sunken px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-2">
              Vehicle
            </div>
            {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
              const date = new Date(month.getFullYear(), month.getMonth(), day);
              const isToday = isSameDay(date, today);
              return (
                <div
                  key={day}
                  className={cx(
                    "border-b border-r border-line-soft px-1 py-2 text-center text-[10px] font-medium tnum",
                    isToday ? "bg-brand-50 font-semibold text-brand-700" : "bg-sunken/60 text-ink-2"
                  )}
                >
                  {day}
                </div>
              );
            })}

            {/* Rows */}
            {vehicles.map((vehicle) => (
              <VehicleRow
                key={vehicle.id}
                vehicle={vehicle}
                month={month}
                days={days}
                rentals={rentalsByVehicle.get(vehicle.id) ?? []}
                tenantSlug={tenantSlug}
                today={today}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VehicleRow({
  vehicle,
  month,
  days,
  rentals,
  tenantSlug,
  today,
}: {
  vehicle: Vehicle;
  month: Date;
  days: number;
  rentals: RentalSlot[];
  tenantSlug: string;
  today: Date;
}) {
  const dayCells = useMemo(() => {
    return Array.from({ length: days }, (_, i) => {
      const day = new Date(month.getFullYear(), month.getMonth(), i + 1);
      const covering = rentals.filter((r) => {
        const start = parseDate(r.rental.startDate);
        const end = parseDate(r.rental.actualReturnDate ?? r.rental.returnDate);
        if (!start) return false;
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
        return start <= dayEnd && (rentalIsLongTerm(r.rental) || Boolean(end && end >= dayStart));
      });
      return { day, covering };
    });
  }, [days, month, rentals]);

  return (
    <>
      <div className="sticky left-0 z-10 border-b border-r border-line bg-surface px-3 py-2 text-sm font-medium text-ink">
        <div>{vehicle.plate}</div>
        <div className="text-xs text-ink-3">
          {vehicle.make} {vehicle.model}
        </div>
      </div>
      {dayCells.map(({ day, covering }) => {
        const key = toDateKey(day);
        const weekend = day.getDay() === 0 || day.getDay() === 6;
        const isToday = isSameDay(day, today);
        return (
          <div
            key={key}
            className={cx(
              "relative min-h-[44px] border-b border-r border-line-soft",
              isToday ? "bg-brand-50/50" : weekend ? "bg-sunken/50" : undefined
            )}
          >
            {covering.length > 0 && (
              <div className="absolute inset-0 flex flex-col justify-center gap-0.5 p-0.5">
                {covering.slice(0, 3).map((r) =>
                  r.source === "booking" ? (
                    // Legacy sheet booking — no detail page to link to.
                    <div
                      key={r.rental.id}
                      title={`${r.customerName ?? "Booking"} · ${r.rental.status} (imported)`}
                      className={cx("block h-2 w-full rounded-full", STATUS_STYLE[r.rental.status] ?? "bg-line")}
                    />
                  ) : (
                    <Link
                      key={r.rental.id}
                      href={`/${tenantSlug}/rentals/${r.rental.id}`}
                      title={`${r.customerName ?? "Rental"} · ${r.rental.status}${rentalIsLongTerm(r.rental) ? " · long-term" : ""}`}
                      className={cx(
                        "block h-2 w-full rounded-full transition-opacity hover:opacity-75",
                        STATUS_STYLE[r.rental.status] ?? "bg-line"
                      )}
                    />
                  )
                )}
                {covering.length > 3 && (
                  <span className="text-[9px] text-ink-3 tnum">+{covering.length - 3}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

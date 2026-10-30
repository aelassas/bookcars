import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getServerLang } from "@/platform/i18n/lang";
import { getRentVehicles } from "@/modules/rental/queries";
import { getCalendarSlots } from "@/modules/rental/booking-queries";
import { getRentalsReturningToday, getRentalsOverdue } from "@/modules/returns/queries";
import { VehicleAvailabilityCalendar } from "@/components/fleet/VehicleAvailabilityCalendar";
import { FleetSchedulerBoard } from "@/components/fleet/FleetSchedulerBoard";
import { PageHeader } from "@/components/ui";
import { CalendarRange, RotateCcw, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

// The rent cockpit: the car×day calendar is the spine, with a Returns-Today
// strip on top (the demo's proven centerpiece, on live data). Branded "Rental
// Companies" because it spans Cardiwan + EasyRent/ETM, not one brand.
export default async function FleetAvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ board?: string; view?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const lang = await getServerLang();
  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  // Gate on the rentals module (fleet exists for rent brands AND take-auto sales,
  // which owns the shared fleet-home). Leasing-only tenants without it bounce home.
  if (!t.modules.includes("rentals")) redirect(`/${tenantSlug}`);
  // Brand the same board for its audience: rent brands span Cardiwan + EasyRent;
  // take-auto is the sales/fleet-home view.
  const isRent = t.modules.includes("rentals");

  const today = new Date();
  // The permit-board (DayPilot) is the default rent home now; `?view=month`
  // falls back to the classic month calendar. The board wants a wider window so
  // you can scroll into history — 1 month back to 3 months ahead.
  const sp = await searchParams;
  const boardMode = sp.view !== "month"; // default = board (incl. legacy ?board=1)
  const rangeStart = boardMode ? new Date(today.getFullYear(), today.getMonth() - 1, 1) : startOfMonth(today);
  const rangeEnd = boardMode ? new Date(today.getFullYear(), today.getMonth() + 3, 0, 23, 59, 59, 999) : endOfMonth(today);
  const boardDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000);

  const [vehicles, slots, returningToday, overdue] = await Promise.all([
    getRentVehicles(t.id),
    getCalendarSlots(t.id, rangeStart, rangeEnd),
    getRentalsReturningToday(t.id).catch(() => []),
    getRentalsOverdue(t.id).catch(() => []),
  ]);

  return (
    <main className="p-6">
      <PageHeader
        title={isRent ? `${t.name} — Rentals` : "TAKE Auto — Fleet"}
        subtitle={
          isRent
            ? "Fleet calendar & today's returns"
            : "Fleet board & today's returns"
        }
        icon={<CalendarRange className="h-4.5 w-4.5" />}
        action={
          <div className="inline-flex overflow-hidden rounded-field border border-line text-xs font-medium">
            <Link
              href={`/${tenantSlug}/fleet/availability`}
              className={boardMode ? "bg-brand-600 px-3 py-1.5 text-white" : "bg-surface px-3 py-1.5 text-ink-2 hover:bg-sunken"}
            >
              Board
            </Link>
            <Link
              href={`/${tenantSlug}/fleet/availability?view=month`}
              className={!boardMode ? "bg-brand-600 px-3 py-1.5 text-white" : "bg-surface px-3 py-1.5 text-ink-2 hover:bg-sunken"}
            >
              Month
            </Link>
          </div>
        }
      />

      {/* Returns-Today strip — the operational centerpiece, on live data. */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
          <RotateCcw className="h-4 w-4 text-brand-600" /> Returns today
          <span className="ml-1 rounded-full bg-brand-600/10 px-2 py-0.5 text-brand-700 tnum">{returningToday.length}</span>
        </span>
        {overdue.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600">
            <AlertTriangle className="h-4 w-4" /> Overdue
            <span className="ml-1 rounded-full bg-red-500/10 px-2 py-0.5 tnum">{overdue.length}</span>
          </span>
        )}
        {/* Top few due-today cars, then the full one-tap return flow. */}
        <div className="flex flex-wrap items-center gap-2">
          {returningToday.slice(0, 5).map((r) => (
            <span key={r.rental.id} className="rounded-field border border-line bg-sunken px-2 py-0.5 text-xs text-ink-2">
              {[r.vehicleMake, r.vehicleModel].filter(Boolean).join(" ") || r.vehiclePlate || "car"}
              {r.customerName ? ` · ${r.customerName}` : ""}
            </span>
          ))}
        </div>
        <Link
          href={`/${tenantSlug}/returns`}
          className="ml-auto rounded-field bg-brand-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Open returns
        </Link>
      </div>

      {boardMode ? (
        <FleetSchedulerBoard
          vehicles={vehicles.map((v) => ({ id: v.id, make: v.make, model: v.model, plate: v.plate, status: v.status }))}
          slots={slots}
          startDate={rangeStart.toISOString().slice(0, 10)}
          days={boardDays}
          tenantId={t.id}
          actorId={session.user.id}
          tenantSlug={tenantSlug}
          lang={lang}
        />
      ) : (
        <VehicleAvailabilityCalendar
          tenantId={t.id}
          tenantSlug={tenantSlug}
          actorId={session.user.id}
          vehicles={vehicles.map((v) => ({
            id: v.id,
            make: v.make,
            model: v.model,
            plate: v.plate,
          }))}
          initialRentals={slots}
          initialMonth={today}
        />
      )}
    </main>
  );
}

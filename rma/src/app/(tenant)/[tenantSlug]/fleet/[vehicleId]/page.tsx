import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getVehicleById } from "@/modules/fleet/queries";
import {
  getVehicleDocuments,
  getVehicleServiceHistory,
  getVehicleTimeline,
} from "@/modules/fleet/timeline-queries";
import { getVehicleAvailabilitySummary } from "@/modules/fleet/finder-queries";
import { getVehiclePulse } from "@/modules/fleet/pulse-queries";
import { VehiclePulsePanel } from "@/components/fleet/VehiclePulsePanel";
import { VehicleCalendar } from "@/components/fleet/VehicleCalendar";
import { VehicleArchive } from "@/components/fleet/VehicleArchive";
import { VehicleKaitenPanel } from "@/components/fleet/VehicleKaitenPanel";
import { VehicleServicePanel } from "@/components/fleet/VehicleServicePanel";
import { VehicleTripsPanel } from "@/components/fleet/VehicleTripsPanel";
import { EditVehicleButton } from "@/components/fleet/EditVehicleModal";
import { BrandLogo } from "@/components/fleet/BrandLogo";
import { PageHeader, Badge, ButtonLink, TH, TD, cx } from "@/components/ui";
import { CalendarDays, FileText, Paperclip } from "lucide-react";
import { ru } from "@/lib/i18n/ru";
import { getServerLang } from "@/platform/i18n/lang";

export const dynamic = "force-dynamic";

const t = ru.vehicleCalendar;

/** Vehicle status → RU label + badge tone (text carries the meaning, not colour). */
const STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  available: { label: "Available", tone: "success" },
  on_rent: { label: "On rent", tone: "warning" },
  in_service: { label: "In service", tone: "info" },
  overdue: { label: "Overdue", tone: "danger" },
  sold: { label: "Sold", tone: "neutral" },
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Monday-based week start — must match the calendar's default month window. */
function startOfWeek(d: Date) {
  return addDays(startOfDay(d), -((d.getDay() + 6) % 7));
}

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function VehicleCardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; vehicleId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug, vehicleId } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  if (!tenant.modules.includes("fleet")) redirect(`/${tenantSlug}`);

  const vehicle = await getVehicleById(tenant.id, vehicleId);
  if (!vehicle) notFound();

  // Initial window = the month view's default: full weeks around this month.
  const today = new Date();
  const from = startOfWeek(new Date(today.getFullYear(), today.getMonth(), 1));
  const to = addDays(
    startOfWeek(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    7
  );

  const lang = await getServerLang();

  const [events, documents, availability, pulse, serviceHistory] = await Promise.all([
    getVehicleTimeline(tenantSlug, vehicleId, from.toISOString(), to.toISOString()),
    getVehicleDocuments(tenantSlug, vehicleId),
    getVehicleAvailabilitySummary(tenant.id, vehicleId),
    getVehiclePulse(tenant.id, { vehicleId, make: vehicle.make, model: vehicle.model }),
    getVehicleServiceHistory(tenantSlug, vehicleId),
  ]);

  const status = STATUS[vehicle.status] ?? { label: vehicle.status, tone: "neutral" as const };
  const title = `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate;

  return (
    <main className="p-6">
      <PageHeader
        icon={<CalendarDays className="h-4.5 w-4.5" />}
        title={`${vehicle.plate} · ${title}`}
        subtitle={t.subtitle}
        action={
          <>
            <Badge tone={status.tone}>{status.label}</Badge>
            <ButtonLink href={`/${tenantSlug}/fleet`} variant="secondary" size="sm">
              {t.backToFleet}
            </ButtonLink>
          </>
        }
      />

      {/* Identity strip — plate, make/model, year, odometer, rate. */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
        <BrandLogo name={vehicle.make} fallback={vehicle.plate} size={36} className="shrink-0" />
        <div>
          <div className="font-mono text-sm font-semibold tracking-wide text-ink">
            {vehicle.plate}
          </div>
          <div className="text-xs text-ink-3">
            {title}
            {vehicle.year ? ` · ${vehicle.year}` : ""}
          </div>
        </div>
        <dl className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
          <div>
            <dt className="text-ink-3">Mileage</dt>
            <dd className="font-medium text-ink tnum">
              {(vehicle.odometer ?? 0).toLocaleString("en-GB")} km
            </dd>
          </div>
          <div>
            <dt className="text-ink-3">Rate</dt>
            <dd className="font-medium text-ink tnum">
              {vehicle.dailyRate ? `${vehicle.dailyRate} AED / day` : "—"}
            </dd>
          </div>
          <EditVehicleButton
            tenantId={tenant.id}
            lang={lang}
            vehicle={{
              id: vehicle.id,
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              plate: vehicle.plate,
              dailyRate: vehicle.dailyRate,
              odometer: vehicle.odometer,
              status: vehicle.status,
              location: vehicle.location,
              nextServiceDate: vehicle.nextServiceDate,
              nextServiceOdometer: vehicle.nextServiceOdometer,
              oilChangeIntervalKm: vehicle.oilChangeIntervalKm,
            }}
          />
        </dl>
      </div>

      {/* "Пульс машины" — live demand signal (open deals wanting this car). */}
      <VehiclePulsePanel pulse={pulse} tenantSlug={tenantSlug} />

      {/* Kaiten side of the profile — photos, sales spec, hand, live free/booked.
          Renders nothing for cars with no Kaiten carry-through. */}
      <VehicleKaitenPanel
        photos={(vehicle.photos as { url: string; name: string }[] | null) ?? null}
        notes={vehicle.kaitenNotes ?? null}
        kaitenColumn={vehicle.kaitenColumn ?? null}
        companyName={vehicle.companyName ?? null}
        availability={availability}
      />

      {/* Service — planned next service (due/overdue highlight), service
          history from the timeline, and the "Log service" form. */}
      <VehicleServicePanel
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        vehicleId={vehicleId}
        currentOdometer={vehicle.odometer ?? 0}
        nextServiceDate={vehicle.nextServiceDate ?? null}
        nextServiceOdometer={vehicle.nextServiceOdometer ?? null}
        oilChangeIntervalKm={vehicle.oilChangeIntervalKm}
        history={serviceHistory}
        lang={lang}
      />

      {/* Trips — Pilot GPS track history: range picker, summary strip, trip
          table and the CSV report. Honest notices for no-device / Pilot-down. */}
      <VehicleTripsPanel tenantSlug={tenantSlug} vehicleId={vehicleId} lang={lang} />

      {/* The calendar owns the add-event ("＋ Событие") and cancel affordances;
          both surface the backend's RU errors verbatim. */}
      <VehicleCalendar
        tenantSlug={tenantSlug}
        vehicleId={vehicleId}
        initialEvents={events}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <VehicleArchive events={events} tenantSlug={tenantSlug} />
        </div>

        {/* -------------------------- documents dossier -------------------- */}
        <section className="rounded-card border border-line bg-surface shadow-card lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-ink-3">
                <Paperclip className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
                {t.documentsTitle}
              </span>
              <span className="rounded-full bg-sunken px-1.5 py-px text-[11px] font-semibold text-ink-2 tnum">
                {documents.length}
              </span>
            </div>
            <span className="hidden text-xs text-ink-3 sm:block">{t.documentsHint}</span>
          </div>

          {documents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-ink-3">{t.documentsEmpty}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <TH>{t.docType}</TH>
                    <TH>{t.docName}</TH>
                    <TH>{t.docDate}</TH>
                    <TH className="text-right">{t.docOpen}</TH>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-sunken/40">
                      <TD>
                        <span className="inline-flex items-center gap-1.5 text-ink-2">
                          <FileText className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
                          {doc.type ?? "—"}
                        </span>
                      </TD>
                      <TD>
                        <span className="block max-w-[220px] truncate text-ink">
                          {doc.fileName ?? "—"}
                        </span>
                        {doc.rentalId && (
                          <a
                            href={`/${tenantSlug}/rentals/${doc.rentalId}`}
                            className="text-[11px] font-medium text-brand-700 underline underline-offset-2"
                          >
                            {t.docRental}
                          </a>
                        )}
                      </TD>
                      <TD className="tnum">{fmtDate(doc.createdAt)}</TD>
                      <TD className="text-right">
                        <a
                          href={`/api/files/${doc.id}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`${t.docOpen}: ${doc.fileName ?? doc.type ?? doc.id}`}
                          className={cx(
                            "text-xs font-medium text-brand-700 underline underline-offset-2",
                            "focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                          )}
                        >
                          {t.docOpen}
                        </a>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

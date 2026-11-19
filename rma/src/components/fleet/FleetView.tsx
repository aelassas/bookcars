"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { FleetVehicle } from "@/modules/fleet/queries";
import { PageHeader, Badge, Button, ButtonLink, Input, EmptyState } from "@/components/ui";
import { VehicleDrawer } from "./VehicleDrawer";
import { BrandLogo } from "./BrandLogo";
import { EditVehicleButton } from "./EditVehicleModal";
import { deleteVehicle, markVehicleAsSold, restoreVehicle } from "@/modules/fleet/actions";
import { CreateVehicleModal } from "@/components/modals/CreateVehicleModal";
import { DocumentPanel } from "@/components/documents/DocumentPanel";
import { Paperclip, Car, Plus, MapPin, Gauge, Clock, SearchX, CalendarDays, Trash2 } from "lucide-react";
import { t, type Lang } from "@/platform/i18n/dict";

const ACCENT: Record<string, string> = {
  slate: "bg-slate-700",
  emerald: "bg-emerald-600",
  amber: "bg-amber-500",
  sky: "bg-sky-600",
  rose: "bg-rose-500",
  violet: "bg-violet-600",
  indigo: "bg-indigo-600",
  teal: "bg-teal-600",
};

const ACCENT_KEYS = Object.keys(ACCENT);

function accentFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ACCENT_KEYS[Math.abs(h) % ACCENT_KEYS.length];
}

function relTime(iso?: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const min = Math.round((Date.now() - then) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  return `${Math.round(hr / 24)} d ago`;
}

type Filter = "all" | "moving" | "parked" | "blocked" | "sold" | "deleted";

export function FleetView({
  vehicles,
  archivedVehicles = [],
  mode,
  tenantSlug,
  tenantId,
  lang,
  canBlockEngine,
}: {
  vehicles: FleetVehicle[];
  /** Soft-deleted (archived) cars, only rendered when the Deleted chip is on. */
  archivedVehicles?: FleetVehicle[];
  mode: "live" | "mock";
  tenantSlug: string;
  tenantId: string;
  lang: Lang;
  canBlockEngine: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [docVehicle, setDocVehicle] = useState<FleetVehicle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [markSoldForId, setMarkSoldForId] = useState<string | null>(null);
  const [markSoldBusy, setMarkSoldBusy] = useState(false);
  const vehicleList = vehicles;

  async function handleDelete(vehicle: FleetVehicle) {
    const confirmation = prompt(t(lang, "vehicle.deletePrompt"));
    if (confirmation !== "DELETE") return;
    setDeletingId(vehicle.id);
    setDeleteError("");
    setMarkSoldForId(null);
    try {
      const result = await deleteVehicle(tenantId, vehicle.id, confirmation);
      if (result.error) {
        setDeleteError(result.error);
        if (result.canMarkSold) {
          // Offer a one-click fallback inline — the error alone is not actionable.
          setMarkSoldForId(vehicle.id);
        } else {
          alert(result.error);
        }
        return;
      }
      window.location.reload();
    } catch {
      setDeleteError(t(lang, "vehicle.saveError"));
      alert(t(lang, "vehicle.saveError"));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRestore(vehicleId: string) {
    setRestoringId(vehicleId);
    setDeleteError("");
    try {
      await restoreVehicle(tenantId, vehicleId);
      window.location.reload();
    } catch (err) {
      setDeleteError(err instanceof Error && err.message ? err.message : t(lang, "vehicle.saveError"));
    } finally {
      setRestoringId(null);
    }
  }

  async function handleMarkSold(vehicleId: string) {
    setMarkSoldBusy(true);
    setDeleteError("");
    try {
      await markVehicleAsSold(tenantId, vehicleId);
      window.location.reload();
    } catch (err) {
      setDeleteError(err instanceof Error && err.message ? err.message : t(lang, "vehicle.saveError"));
    } finally {
      setMarkSoldBusy(false);
      setMarkSoldForId(null);
    }
  }

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "moving", label: "Moving" },
    { id: "parked", label: "Parked" },
    { id: "blocked", label: "Engine blocked" },
    { id: "sold", label: t(lang, "fleetBoard.filterSold") },
    // Archive view: soft-deleted cars. Separate list — not merged into the main
    // grid so the daily operational numbers stay honest.
    { id: "deleted", label: archivedVehicles.length > 0 ? `Deleted (${archivedVehicles.length})` : "Deleted" },
  ];

  // Operational counts exclude sold cars — they've left the fleet.
  const counts = useMemo(
    () => ({
      moving: vehicleList.filter((v) => v.status !== "sold" && (v.speed ?? 0) > 0).length,
      parked: vehicleList.filter((v) => v.status !== "sold" && (v.speed ?? 0) === 0).length,
      ignition: vehicleList.filter((v) => v.status !== "sold" && v.ignition).length,
      blocked: vehicleList.filter((v) => v.status !== "sold" && v.gpsBlocked).length,
    }),
    [vehicleList]
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Deleted filter switches the source list to the archived rows.
    const source = filter === "deleted" ? archivedVehicles : vehicleList;
    return source.filter((v) => {
      if (filter === "deleted") {
        if (q && !`${v.make} ${v.model} ${v.plate} ${v.imei ?? ""}`.toLowerCase().includes(q)) return false;
        return true;
      }
      // Sold cars stay out of every operational view; the Sold chip is the
      // only place they're listed (never lost, just out of the way).
      if (filter === "sold") {
        if (v.status !== "sold") return false;
      } else if (v.status === "sold") return false;
      if (filter === "moving" && (v.speed ?? 0) <= 0) return false;
      if (filter === "parked" && (v.speed ?? 0) > 0) return false;
      if (filter === "blocked" && !v.gpsBlocked) return false;
      if (q && !`${v.make} ${v.model} ${v.plate} ${v.imei ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [vehicleList, archivedVehicles, query, filter]);

  // Select by id (not imei): demo/Pilot vehicles can have null imei, which would
  // make a null selectedImei match a row and auto-open the drawer un-closeably.
  const selected = selectedId ? (vehicleList.find((v) => v.id === selectedId) ?? null) : null;

  return (
    <div>
      <PageHeader
        icon={<Car className="h-4.5 w-4.5" />}
        title="Fleet"
        subtitle={`${vehicles.length} vehicles · live GPS and engine status`}
        action={
          <>
            <Badge tone={mode === "live" ? "success" : "neutral"}>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  mode === "live" ? "bg-success" : "bg-ink-3"
                }`}
              />
              {mode === "live" ? "Pilot · live" : "Pilot · demo data"}
            </Badge>
            <ButtonLink href={`/${tenantSlug}/fleet/availability`} variant="secondary">
              Availability
            </ButtonLink>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </>
        }
      />

      {showModal && (
        <CreateVehicleModal
          tenantId={tenantId}
          onClose={() => setShowModal(false)}
          onCreated={() => window.location.reload()}
        />
      )}

      {docVehicle && (
        <div className="mb-6">
          <DocumentPanel
            tenantId={tenantId}
            entityType="vehicle"
            entityId={docVehicle.id}
            entityLabel={`${docVehicle.make} ${docVehicle.model} ${docVehicle.plate}`}
            onClose={() => setDocVehicle(null)}
          />
        </div>
      )}

      {/* Live status chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="success">{counts.moving} moving</Badge>
        <Badge tone="neutral">{counts.parked} parked</Badge>
        <Badge tone="warning">{counts.ignition} ignition on</Badge>
        <Badge tone="danger">{counts.blocked} engine blocked</Badge>
      </div>

      {/* Search + filter */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search make, model, plate or IMEI…"
          className="w-full max-w-xs"
        />
        <div className="flex gap-0.5 rounded-field border border-line bg-surface p-0.5 shadow-card">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-[0.375rem] px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.id
                  ? "bg-brand-600 text-white shadow-card"
                  : "text-ink-2 hover:bg-sunken hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {deleteError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
          <span>{deleteError}</span>
          {markSoldForId && (
            <Button
              variant="secondary"
              size="sm"
              disabled={markSoldBusy}
              onClick={() => handleMarkSold(markSoldForId)}
            >
              {markSoldBusy ? t(lang, "vehicle.markingSold") : t(lang, "vehicle.markSold")}
            </Button>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-5 w-5" />}
          title="No vehicles match"
          description="Try a different search term or clear the filter."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((v) => {
            const hasFix = (v.lat ?? 0) !== 0 || (v.lon ?? 0) !== 0;
            const title = `${v.make} ${v.model}`.trim() || v.plate || "—";
            const seed = v.imei ?? v.id;
            // Pilot-only devices that have no DB row use their IMEI as id —
            // there is no vehicle card to open for those.
            const cardHref = v.id !== v.imei ? `/${tenantSlug}/fleet/${v.id}` : null;
            return (
              <div
                key={v.id}
                className="group overflow-hidden rounded-card border border-line bg-surface text-left shadow-card transition hover:border-brand-300 hover:shadow-lifted"
              >
                {/* Banner — deterministic accent per vehicle */}
                <button
                  onClick={() => setSelectedId(v.id)}
                  className={`relative flex h-20 w-full items-center justify-center gap-2 px-3 ${
                    ACCENT[accentFor(seed)] ?? "bg-slate-700"
                  }`}
                >
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-black/15" />
                  <BrandLogo name={v.make} fallback={v.plate} className="relative shrink-0" />
                  <span className="relative text-center text-sm font-semibold text-white drop-shadow-sm">
                    {title}
                  </span>
                </button>

                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    {cardHref ? (
                      <Link
                        href={cardHref}
                        aria-label={`Vehicle card ${v.plate || title}`}
                        className="truncate rounded bg-sunken px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide text-ink-2 transition-colors hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                      >
                        {v.plate || "—"}
                      </Link>
                    ) : (
                      <span className="truncate rounded bg-sunken px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide text-ink-2">
                        {v.plate || "—"}
                      </span>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      {/* "/T" in the sheet = handed to TAKE Auto to sell. The car
                          still rents while it waits for a buyer, so this sits
                          next to the status rather than replacing it. */}
                      {v.sheetBrandKey?.toUpperCase().endsWith("/T") && (
                        <Badge tone="warning">For sale</Badge>
                      )}
                      {v.status === "sold" && <Badge tone="neutral">{t(lang, "fleetBoard.statusSold")}</Badge>}
                      {v.gpsBlocked && <Badge tone="danger">Blocked</Badge>}
                      {(v.speed ?? 0) > 0 ? (
                        <Badge tone="success">{Math.round(v.speed!)} km/h</Badge>
                      ) : v.ignition ? (
                        <Badge tone="warning">Idling</Badge>
                      ) : (
                        <Badge tone="neutral">Parked</Badge>
                      )}
                    </div>
                  </div>

                  {/* Current hand (company) — shared-fleet model: who holds the
                      car now, not who owns it. Only shown when assigned. */}
                  {v.companyName && (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center rounded-full bg-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-2">
                        {v.companyName}
                      </span>
                    </div>
                  )}

                  <dl className="mt-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-ink-3">
                        <MapPin className="h-3 w-3" />
                        GPS
                      </dt>
                      <dd className="truncate text-ink-2 tnum">
                        {hasFix ? `${v.lat!.toFixed(5)}, ${v.lon!.toFixed(5)}` : "No fix"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-ink-3">
                        <Clock className="h-3 w-3" />
                        Last fix
                      </dt>
                      <dd className="text-ink-2">{relTime(v.lastFixAt)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-ink-3">
                        <Gauge className="h-3 w-3" />
                        Odometer
                      </dt>
                      <dd className="text-ink-2 tnum">{v.odometer.toLocaleString()} km</dd>
                    </div>
                    {v.dailyRate > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-ink-3">Day rate</dt>
                        <dd className="font-medium text-ink tnum">{v.dailyRate} AED</dd>
                      </div>
                    )}
                    {v.weeklyRate > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-ink-3">Week rate</dt>
                        <dd className="font-medium text-ink tnum">{v.weeklyRate} AED</dd>
                      </div>
                    )}
                    {v.monthlyRate > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-ink-3">Month rate</dt>
                        <dd className="font-medium text-ink tnum">{v.monthlyRate} AED</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-3">IMEI</dt>
                      <dd className="truncate font-mono text-[11px] text-ink-2">{v.imei ?? "—"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="flex items-center gap-1 border-t border-line-soft px-3 py-2">
                  {cardHref && (
                    <Link
                      href={cardHref}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-field py-1.5 text-xs font-medium text-ink-3 transition-colors hover:bg-sunken hover:text-ink-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    >
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      Calendar
                    </Link>
                  )}
                  <button
                    onClick={() => setDocVehicle(v)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-field py-1.5 text-xs font-medium transition-colors ${
                      docVehicle?.id === v.id
                        ? "bg-brand-50 text-brand-700"
                        : "text-ink-3 hover:bg-sunken hover:text-ink-2"
                    }`}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Documents
                  </button>
                </div>
                {cardHref && (
                  <div className="flex items-center justify-end gap-2 border-t border-line-soft px-3 py-2">
                    {v.deletedAt ? (
                      <>
                        <span className="mr-auto text-[11px] text-ink-3">
                          Archived {new Date(v.deletedAt).toLocaleDateString()}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={restoringId === v.id}
                          onClick={() => handleRestore(v.id)}
                        >
                          {restoringId === v.id ? "Restoring…" : "Restore"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <EditVehicleButton tenantId={tenantId} vehicle={v} lang={lang} />
                        <Button variant="danger" size="sm" disabled={deletingId === v.id} onClick={() => handleDelete(v)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingId === v.id ? "Deleting…" : t(lang, "vehicle.delete")}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <VehicleDrawer
          vehicle={selected}
          tenantId={tenantId}
          canBlockEngine={canBlockEngine}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

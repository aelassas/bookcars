"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { FleetVehicle } from "@/modules/fleet/queries";
import { BrandLogo } from "./BrandLogo";
import { EditVehicleButton } from "./EditVehicleModal";
import { EngineBlockButton } from "./EngineBlockButton";
import { t, LANG_COOKIE, type Lang } from "@/platform/i18n/dict";

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{children}</dd>
    </div>
  );
}

/** Per-browser language cookie — client-safe by design (see i18n/dict.ts). */
function clientLang(): Lang {
  const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
  return m?.[1] === "ru" ? "ru" : "en";
}

type TrackTrip = { ts: string; te: string; lengthKm: number };

/** A trip whose end is this fresh is still in progress. */
const ONGOING_WINDOW_MS = 15 * 60 * 1000;

export function VehicleDrawer({
  vehicle,
  tenantId,
  canBlockEngine,
  onClose,
}: {
  vehicle: FleetVehicle;
  tenantId: string;
  canBlockEngine: boolean;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const [currentTrip, setCurrentTrip] = useState<TrackTrip | null>(null);

  useEffect(() => {
    setLang(clientLang());
  }, []);

  // "Current trip" — best-effort from the hub route-playback feed (last 24h).
  // Any failure hides the line silently; the drawer works without it.
  useEffect(() => {
    if (!vehicle.imei) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/fleet/api/track?imei=${encodeURIComponent(vehicle.imei!)}&hours=24`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { trips?: TrackTrip[] };
        const now = Date.now();
        const ongoing = (data.trips ?? []).find((trip) => {
          const endMs = new Date(trip.te).getTime();
          return now - endMs >= 0 && now - endMs <= ONGOING_WINDOW_MS;
        });
        if (!cancelled && ongoing) setCurrentTrip(ongoing);
      } catch {
        // silent — the line simply never appears
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicle.imei]);

  const hasFix = (vehicle.lat ?? 0) !== 0 || (vehicle.lon ?? 0) !== 0;
  const mapUrl = hasFix ? `https://www.google.com/maps?q=${vehicle.lat},${vehicle.lon}` : "";

  const speedLabel =
    (vehicle.speed ?? 0) > 0
      ? `${Math.round(vehicle.speed!)} km/h`
      : vehicle.ignition
        ? "Idling"
        : "Stopped";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} role="button" aria-label="Close drawer" />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo name={vehicle.make} fallback={vehicle.plate} size={44} className="shrink-0" />
              <h2 className="text-base font-semibold text-slate-900">
                {`${vehicle.make} ${vehicle.model ?? ""}`.trim()}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">{vehicle.plate || "—"}</p>
            <p className="text-[11px] text-slate-400">IMEI {vehicle.imei ?? "—"}</p>
            {vehicle.gpsBlocked && (
              <span className="mt-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                Engine blocked
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Position first — the map is the drawer's centrepiece. */}
          {hasFix ? (
            <a href={mapUrl} target="_blank" rel="noreferrer" className="mb-5 block">
              {/* Keyless static map (Yandex Static API 1.x) — plain img, works everywhere */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`Vehicle location — ${vehicle.plate || `${vehicle.make} ${vehicle.model ?? ""}`.trim()}`}
                src={`https://static-maps.yandex.ru/1.x/?ll=${vehicle.lon},${vehicle.lat}&z=14&size=560,260&l=map&pt=${vehicle.lon},${vehicle.lat},pm2rdm`}
                loading="lazy"
                className="h-[260px] w-full rounded-lg border border-slate-200 object-cover"
              />
            </a>
          ) : (
            <div className="mb-5 flex h-[120px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-400">
              {t(lang, "drawer.gpsOffline")}
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t(lang, "drawer.liveStatus")}
            </h3>
            <dl className="grid grid-cols-2 gap-2.5">
              <Cell label="Location">
                {hasFix ? (
                  <a href={mapUrl} target="_blank" rel="noreferrer" className="text-sky-700 underline underline-offset-2">
                    {vehicle.lat!.toFixed(5)}, {vehicle.lon!.toFixed(5)}
                  </a>
                ) : (
                  <span className="text-slate-400">{t(lang, "drawer.noGpsFix")}</span>
                )}
              </Cell>
              <Cell label="Ignition">
                <span className={vehicle.ignition ? "text-emerald-600" : "text-slate-500"}>
                  {vehicle.ignition ? "On" : "Off"}
                </span>
              </Cell>
              <Cell label="Movement">{speedLabel}</Cell>
              <Cell label="Engine block">
                <span className={vehicle.gpsBlocked ? "text-rose-600" : "text-emerald-600"}>
                  {vehicle.gpsBlocked ? "Blocked" : "Unblocked"}
                </span>
              </Cell>
              <Cell label="Odometer">{vehicle.odometer.toLocaleString()} km</Cell>
              <Cell label="Daily rate">{vehicle.dailyRate > 0 ? `${vehicle.dailyRate} AED` : "—"}</Cell>
              <Cell label="Status">
                <span className="capitalize">{vehicle.status.replace("_", " ")}</span>
              </Cell>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {vehicle.id !== vehicle.imei && <EditVehicleButton tenantId={tenantId} vehicle={vehicle} lang={lang} />}
              <EngineBlockButton tenantId={tenantId} vehicle={vehicle} allowed={canBlockEngine} />
            </div>

            {currentTrip && (
              <p className="mt-3 text-sm text-slate-600">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                {t(lang, "drawer.onTripSince")}{" "}
                {new Date(currentTrip.ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                {" · "}
                {currentTrip.lengthKm.toFixed(1)} {t(lang, "trips.unitKm")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

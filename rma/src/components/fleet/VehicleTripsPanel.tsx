"use client";

import { useCallback, useEffect, useState } from "react";
import { Route, Download } from "lucide-react";
import { TH, TD, cx } from "@/components/ui";
import { t, type Lang } from "@/platform/i18n/dict";

type Trip = {
  startIso: string;
  endIso: string;
  durationMin: number;
  lengthKm: number;
  maxSpeed: number;
  avgSpeed: number;
  ongoing: boolean;
};

type TripsResponse =
  | { ok: true; trips: Trip[]; kmTotal: number; dayCount: number }
  | { ok: false; reason: "no-device" | "pilot-unavailable" | "range-too-long" | "bad-range" };

const DAY_MS = 24 * 3600 * 1000;
const MAX_DAYS = 31;

function dayISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  return { from: dayISO(new Date(now.getTime() - 6 * DAY_MS)), to: dayISO(now) };
}

/** Russian needs three plural forms; English two (one/many). */
function plural(n: number, lang: Lang, one: string, few: string, many: string): string {
  if (lang === "en") return n === 1 ? one : many;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function fmtDuration(min: number, lang: Lang): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} ${t(lang, "trips.minShort")}`;
  return `${h} ${t(lang, "trips.hourShort")} ${m} ${t(lang, "trips.minShort")}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/**
 * Trip history panel (Pilot GPS): date range (default last 7 days, max 31),
 * a summary strip, the trip table with the ongoing trip highlighted, and a
 * CSV report download. Every failure mode renders an honest one-line notice —
 * never fake rows.
 */
export function VehicleTripsPanel({
  tenantSlug,
  vehicleId,
  lang,
}: {
  tenantSlug: string;
  vehicleId: string;
  lang: Lang;
}) {
  const [{ from, to }, setRange] = useState(defaultRange);
  const [data, setData] = useState<TripsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const rangeTooLong =
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS > MAX_DAYS - 1;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/${tenantSlug}/fleet/${vehicleId}/trips?from=${from}&to=${to}`,
        { cache: "no-store" },
      );
      setData((await res.json()) as TripsResponse);
    } catch {
      setData({ ok: false, reason: "pilot-unavailable" });
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, vehicleId, from, to]);

  useEffect(() => {
    if (rangeTooLong) return;
    void load();
  }, [load, rangeTooLong]);

  const csvHref = `/${tenantSlug}/fleet/${vehicleId}/trips?from=${from}&to=${to}&format=csv`;

  // Newest first in the table; the module returns oldest first.
  const rows = data?.ok ? [...data.trips].reverse() : [];
  const tripWord = (n: number) =>
    plural(n, lang, t(lang, "trips.unitTripOne"), t(lang, "trips.unitTripFew"), t(lang, "trips.unitTripMany"));
  const dayWord = (n: number) =>
    plural(n, lang, t(lang, "trips.unitDayOne"), t(lang, "trips.unitDayFew"), t(lang, "trips.unitDayMany"));

  return (
    <section className="mb-5 rounded-card border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-ink-3">
            <Route className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
            {t(lang, "trips.title")}
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-ink-3">
            {t(lang, "trips.from")}
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
              className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-ink-3">
            {t(lang, "trips.to")}
            <input
              type="date"
              value={to}
              min={from}
              max={dayISO(new Date())}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
              className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </label>
          {/* Plain anchor (not next/link) so the browser downloads the CSV. */}
          <a
            href={csvHref}
            className={cx(
              "inline-flex h-8 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-field px-3 text-sm font-medium transition-colors",
              "border border-line bg-surface text-ink-2 shadow-card hover:bg-sunken hover:text-ink",
            )}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {t(lang, "trips.download")}
          </a>
        </div>
      </div>

      {rangeTooLong ? (
        <p className="px-4 py-6 text-sm text-ink-3">{t(lang, "trips.rangeTooLong")}</p>
      ) : loading && !data ? (
        <p className="px-4 py-6 text-sm text-ink-3">{t(lang, "trips.loading")}</p>
      ) : !data ? null : !data.ok ? (
        <p className="px-4 py-6 text-sm text-ink-3">
          {data.reason === "no-device" ? t(lang, "trips.noDevice") : t(lang, "trips.unavailable")}
        </p>
      ) : (
        <>
          {/* Summary strip: "12 trips · 184 km · 3 days". */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line-soft px-4 py-3 text-sm text-ink-2">
            <span className="font-semibold text-ink tnum">{data.trips.length}</span>
            <span>{tripWord(data.trips.length)}</span>
            <span className="text-ink-3">·</span>
            <span className="font-semibold text-ink tnum">{data.kmTotal}</span>
            <span>{t(lang, "trips.unitKm")}</span>
            <span className="text-ink-3">·</span>
            <span className="font-semibold text-ink tnum">{data.dayCount}</span>
            <span>{dayWord(data.dayCount)}</span>
            {loading && <span className="ml-2 text-xs text-ink-3">{t(lang, "trips.loading")}</span>}
          </div>

          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-3">{t(lang, "trips.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <TH>#</TH>
                    <TH>{t(lang, "trips.colDate")}</TH>
                    <TH>{t(lang, "trips.colTime")}</TH>
                    <TH>{t(lang, "trips.colDuration")}</TH>
                    <TH className="text-right">{t(lang, "trips.colKm")}</TH>
                    <TH className="text-right">{t(lang, "trips.colMaxSpeed")}</TH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((trip, i) => (
                    <tr
                      key={trip.startIso}
                      className={cx(
                        "hover:bg-sunken/40",
                        trip.ongoing && "bg-emerald-50/60 hover:bg-emerald-50",
                      )}
                    >
                      <TD className="tnum text-ink-3">{rows.length - i}</TD>
                      <TD className="tnum">{fmtDate(trip.startIso)}</TD>
                      <TD className="tnum">
                        {fmtTime(trip.startIso)}–{fmtTime(trip.endIso)}
                        {trip.ongoing && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {t(lang, "trips.ongoing")}
                          </span>
                        )}
                      </TD>
                      <TD className="tnum">{fmtDuration(trip.durationMin, lang)}</TD>
                      <TD className="tnum text-right">{trip.lengthKm.toFixed(1)}</TD>
                      <TD className="tnum text-right">{trip.maxSpeed}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ChevronDown } from "lucide-react";
import { cx } from "@/components/ui";
import type { VehiclePulse } from "@/modules/fleet/pulse-queries";

// "Пульс машины" — compact, collapsible demand strip for a single car. Shows
// live demand count, last toucher + when, and the last customer line. Designed
// to sit on the vehicle profile (or a calendar row) without stealing space:
// one line collapsed, a small drill-down expanded.

function fmtWhen(at: Date | string | null): string {
  if (!at) return "—";
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function VehiclePulsePanel({
  pulse,
  tenantSlug,
  defaultOpen = false,
}: {
  pulse: VehiclePulse;
  tenantSlug: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hot = pulse.demandTotal > 0;

  return (
    <section className="mb-5 overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        <span
          className={cx(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full",
            hot ? "bg-brand-50 text-brand-700" : "bg-sunken text-ink-3"
          )}
        >
          <Activity className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">Vehicle pulse</span>
        <span
          className={cx(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold tnum",
            hot ? "bg-brand-50 text-brand-700" : "bg-sunken text-ink-3"
          )}
          title="Active deals for this vehicle (direct + by make/model)"
        >
          {pulse.demandTotal} {pulse.demandTotal === 1 ? "request" : "requests"}
        </span>

        {!open && pulse.lastToucher && (
          <span className="ml-auto hidden truncate text-xs text-ink-3 sm:block">
            {pulse.lastToucher.name ?? "—"} · {fmtWhen(pulse.lastToucher.at)}
          </span>
        )}
        <ChevronDown
          className={cx(
            "h-4 w-4 shrink-0 text-ink-3 transition-transform",
            open ? "rotate-180" : "",
            open ? "" : pulse.lastToucher ? "" : "ml-auto"
          )}
        />
      </button>

      {open && (
        <div className="border-t border-line-soft px-4 py-3">
          {pulse.demandTotal === 0 ? (
            <p className="text-xs text-ink-3">No active demand for this vehicle in the last 90 days.</p>
          ) : (
            <>
              <dl className="mb-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-ink-3">Direct</dt>
                  <dd className="font-semibold text-ink tnum" title="Deals with this vehicle attached">
                    {pulse.demandDirect}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3">By make/model</dt>
                  <dd className="font-semibold text-ink tnum">{pulse.demandBrand}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Last touch</dt>
                  <dd className="font-medium text-ink">
                    {pulse.lastToucher?.name ?? "—"}
                    <span className="text-ink-3"> · {fmtWhen(pulse.lastToucher?.at ?? null)}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3">Last customer line</dt>
                  <dd className="truncate font-medium text-ink" title={pulse.lastLine ?? undefined}>
                    {pulse.lastLine ?? "—"}
                  </dd>
                </div>
              </dl>

              <ul className="space-y-1">
                {pulse.topDeals.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/${tenantSlug}/deals/${d.id}`}
                      className="flex items-center justify-between gap-2 rounded-field px-2 py-1 text-xs hover:bg-sunken"
                    >
                      <span className="truncate text-ink">{d.headline}</span>
                      <span className="shrink-0 text-ink-3">
                        {d.owner ?? "—"}
                        {d.days != null && <span className="tnum"> · {d.days}d</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui";
import { getFleetTimeline, type TLVehicle } from "@/modules/fleet/timeline";

const DAY = 86400000;
const STATUS: Record<string, string> = {
  booked: "bg-brand-500", reserved: "bg-sky-500", on_rent: "bg-amber-500",
  active: "bg-amber-500", overdue: "bg-danger", returned: "bg-emerald-500",
};

export function FleetTimeline({ tenantId }: { tenantId: string }) {
  const DAYS = 28;
  const [data, setData] = useState<{ vehicles: TLVehicle[]; days: number } | null>(null);
  useEffect(() => { getFleetTimeline(tenantId, { days: DAYS }).then(setData).catch(console.error); }, [tenantId]);
  if (!data) return <p className="text-sm text-ink-3">Loading calendar…</p>;

  const start = new Date(); start.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: DAYS }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  function pos(from: string | null, to: string | null) {
    if (!from) return null;
    const f = new Date(from), t = to ? new Date(to) : new Date(from);
    const left = (f.getTime() - start.getTime()) / DAY;
    const end = (t.getTime() - start.getTime()) / DAY + 1;
    if (end <= 0 || left >= DAYS) return null;
    const L = Math.max(0, left), W = Math.max(0.5, Math.min(DAYS, end) - L);
    return { left: `${(L / DAYS) * 100}%`, width: `${(W / DAYS) * 100}%` };
  }
  const withB = data.vehicles.filter((v) => v.bookings.length).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ink-2">
        <span>Vehicles: <b className="text-ink">{data.vehicles.length}</b></span>
        <span>With bookings in window: <b className="text-ink">{withB}</b></span>
        {Object.entries({ "booked": "booked", "on_rent": "on rent", "reserved": "reserved", "overdue": "overdue" }).map(([k, label]) => (
          <span key={k} className="inline-flex items-center gap-1"><span className={cx("h-2.5 w-2.5 rounded", STATUS[k])} />{label}</span>
        ))}
      </div>
      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <div className="flex border-b border-line bg-canvas text-[10px] font-semibold text-ink-3">
          <div className="w-44 shrink-0 px-2 py-1.5">Vehicle</div>
          <div className="flex flex-1">
            {dates.map((d, i) => (
              <div key={i} className={cx("flex-1 border-l border-line/50 py-1.5 text-center", (d.getDay() === 5 || d.getDay() === 6) && "bg-sunken/60")}>
                {d.getDate()}/{d.getMonth() + 1}
              </div>
            ))}
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {data.vehicles.map((v) => (
            <div key={v.id} className="flex border-b border-line/40 hover:bg-sunken/40">
              <div className="w-44 shrink-0 px-2 py-2">
                <div className="truncate text-xs font-medium text-ink">{v.plate}</div>
                <div className="truncate text-[10px] text-ink-3">{v.make} {v.model}</div>
              </div>
              <div className="relative h-10 flex-1">
                {dates.map((_, i) => <div key={i} className="absolute bottom-0 top-0 border-l border-line/25" style={{ left: `${(i / DAYS) * 100}%` }} />)}
                {v.bookings.map((b) => {
                  const p = pos(b.dateFrom, b.dateTo);
                  if (!p) return null;
                  return (
                    <div key={b.id} title={`${b.customerName ?? ""} · ${b.dateFrom ?? ""}→${b.dateTo ?? ""} · ${b.status}`}
                      className={cx("absolute top-1.5 bottom-1.5 flex items-center overflow-hidden rounded px-1 text-[10px] text-white", STATUS[b.status] ?? "bg-slate-400")}
                      style={{ left: p.left, width: p.width }}>
                      <span className="truncate">{b.customerName ?? b.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

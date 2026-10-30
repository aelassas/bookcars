"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { getCrmFunnel } from "@/modules/crm/queries";

type FunnelData = {
  newLeads: number;
  qualified: number;
  offersSent: number;
  won: number;
  lost: number;
  winRate: number;
};

type Scope = "all" | "my";

const nf = new Intl.NumberFormat("en-US");

/** Conversion % between consecutive stages; graceful when the base is 0 or the % is tiny. */
function conv(part: number, whole: number): string {
  if (whole <= 0) return "—";
  const p = (part / whole) * 100;
  if (p === 0) return "0%";
  if (p < 0.1) return "<0.1%";
  if (p < 10) return `${p.toFixed(1)}%`;
  return `${Math.round(p)}%`;
}

/** Bitrix-style chevron segments: notch on the left, arrow point on the right. */
const ARROW = 14;
function clipFor(i: number, n: number): string {
  const first = `polygon(0 0, calc(100% - ${ARROW}px) 0, 100% 50%, calc(100% - ${ARROW}px) 100%, 0 100%)`;
  const mid = `polygon(0 0, calc(100% - ${ARROW}px) 0, 100% 50%, calc(100% - ${ARROW}px) 100%, 0 100%, ${ARROW}px 50%)`;
  const last = `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${ARROW}px 50%)`;
  return i === 0 ? first : i === n - 1 ? last : mid;
}

/** Static class maps so Tailwind sees every class at build time. */
const HUES = {
  sky: { seg: "bg-sky-500/10", label: "text-sky-700", bar: "bg-sky-500", track: "bg-sky-500/15" },
  blue: { seg: "bg-blue-500/10", label: "text-blue-700", bar: "bg-blue-500", track: "bg-blue-500/15" },
  amber: { seg: "bg-amber-500/10", label: "text-amber-700", bar: "bg-amber-500", track: "bg-amber-500/15" },
  emerald: { seg: "bg-emerald-500/10", label: "text-emerald-700", bar: "bg-emerald-500", track: "bg-emerald-500/15" },
} as const;

export function SalesFunnel({ tenantId }: { tenantId: string }) {
  const [scope, setScope] = useState<Scope>("all");
  const [data, setData] = useState<FunnelData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const cache = useRef(new Map<string, FunnelData>());
  const seq = useRef(0);

  useEffect(() => {
    const key = `${tenantId}:${scope}`;
    const cached = cache.current.get(key);
    if (cached) {
      setData(cached);
      return;
    }
    const id = ++seq.current;
    setRefreshing(true);
    getCrmFunnel(tenantId, { ownerId: scope === "my" ? "me" : undefined })
      .then((d) => {
        if (seq.current !== id) return;
        cache.current.set(key, d);
        setData(d);
      })
      .catch(console.error)
      .finally(() => {
        if (seq.current === id) setRefreshing(false);
      });
  }, [tenantId, scope]);

  const d = data ?? { newLeads: 0, qualified: 0, offersSent: 0, won: 0, lost: 0, winRate: 0 };
  const base = Math.max(d.newLeads, 1);
  const share = (n: number) => (n <= 0 ? 0 : Math.max(4, Math.min(100, (n / base) * 100)));

  const stages = [
    { key: "new", label: "New leads", value: nf.format(d.newLeads), sub: "incoming",
      bar: d.newLeads > 0 ? 100 : 0, hue: HUES.sky, zero: d.newLeads === 0 },
    { key: "qualified", label: "Qualified", value: nf.format(d.qualified), sub: `${conv(d.qualified, d.newLeads)} of new`,
      bar: share(d.qualified), hue: HUES.blue, zero: d.qualified === 0 },
    { key: "offers", label: "Offers sent", value: nf.format(d.offersSent), sub: `${conv(d.offersSent, d.qualified)} of qualified`,
      bar: share(d.offersSent), hue: HUES.amber, zero: d.offersSent === 0 },
    { key: "win", label: "Win rate", value: `${d.winRate}%`,
      sub: d.won + d.lost > 0 ? `${nf.format(d.won)} won · ${nf.format(d.lost)} lost` : "no closed deals",
      bar: d.winRate, hue: HUES.emerald, zero: d.won + d.lost === 0 },
  ];

  return (
    <section className="mb-6 rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Sales funnel</h2>
        <div role="group" aria-label="Responsible filter" className="flex gap-0.5 rounded-field border border-line bg-canvas p-0.5">
          {(["all", "my"] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)} aria-pressed={scope === s}
              className={cx("rounded-field px-3 py-1 text-xs font-medium",
                scope === s ? "bg-brand-600 text-white" : "text-ink-2 hover:bg-sunken")}>
              {s === "all" ? "All" : "My"}
            </button>
          ))}
        </div>
      </div>

      {data === null ? (
        <div className="flex items-stretch gap-[3px]" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[104px] min-w-0 flex-1 animate-pulse bg-sunken" style={{ clipPath: clipFor(i, 4) }} />
          ))}
        </div>
      ) : (
        <div className={cx("flex items-stretch gap-[3px] transition-opacity", refreshing && "opacity-60")}>
          {stages.map((s, i) => (
            <div key={s.key} title={`${s.label}: ${s.value}`} className={cx("min-w-0 flex-1", s.hue.seg)}
              style={{ clipPath: clipFor(i, stages.length) }}>
              <div className={cx("flex h-full flex-col px-3 py-2.5", i > 0 && "pl-6", i < stages.length - 1 && "pr-5")}>
                <div className={cx("truncate text-[11px] font-semibold uppercase tracking-wide", s.hue.label)}>{s.label}</div>
                <div className={cx("mt-1 text-2xl font-semibold tabular-nums", s.zero ? "text-ink-3" : "text-ink")}>{s.value}</div>
                <div className="mt-0.5 truncate text-[11px] text-ink-3">{s.sub}</div>
                <div className={cx("mt-2 h-1.5 w-full overflow-hidden rounded-full", s.hue.track)}>
                  <div className={cx("h-full rounded-full", s.hue.bar)} style={{ width: `${s.bar}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

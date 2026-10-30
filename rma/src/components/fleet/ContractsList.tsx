"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui";
import { getContracts, type Contract } from "@/modules/fleet/contracts";

const KIND: Record<string, { label: string; cls: string }> = {
  open: { label: "handover", cls: "bg-emerald-500/15 text-emerald-700" },
  close: { label: "return", cls: "bg-amber-500/15 text-amber-700" },
  switch: { label: "swap", cls: "bg-sky-500/15 text-sky-700" },
};
const money = (n: number | null) => (n == null ? "—" : Number(n).toLocaleString("en-US"));

export function ContractsList({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<Contract[] | null>(null);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    getContracts(tenantId)
      .then((res) => {
        setAvailable(res.available);
        setRows(res.rows);
      })
      .catch((e) => {
        console.error(e);
        setRows([]); // stop the spinner even on unexpected failure
      });
  }, [tenantId]);
  if (!rows) return <p className="text-sm text-ink-3">Loading contracts…</p>;
  if (!available) {
    return (
      <div className="rounded-card border border-dashed border-line p-8 text-center text-sm text-ink-3">
        Telegram contract import isn&apos;t set up for this workspace.
      </div>
    );
  }

  const salikSum = rows.reduce((s, r) => s + (Number(r.salik) || 0), 0);
  const fineSum = rows.reduce((s, r) => s + (Number(r.fine) || 0), 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ink-2">
        <span>Contracts: <b className="text-ink">{rows.length}</b></span>
        <span>Salik to withhold: <b className="text-amber-700">{money(salikSum)} AED</b></span>
        <span>Fines: <b className="text-danger">{money(fineSum)} AED</b></span>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-line p-8 text-center text-sm text-ink-3">
          No Telegram contracts yet. Once managers send #opencontract/#closecontract, they&apos;ll appear here automatically.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas text-left text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-3 py-2">Type</th><th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Vehicle</th><th className="px-3 py-2">Period</th>
                <th className="px-3 py-2 text-right">Rent</th><th className="px-3 py-2 text-right">Deposit</th>
                <th className="px-3 py-2 text-right">Salik</th><th className="px-3 py-2 text-right">Fine</th>
                <th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">Manager</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const k = KIND[r.kind] ?? { label: r.kind, cls: "bg-slate-500/15 text-slate-700" };
                return (
                  <tr key={r.id} className="border-b border-line/50 hover:bg-sunken/40">
                    <td className="px-3 py-2"><span className={cx("rounded-full px-2 py-0.5 text-[11px] font-semibold", k.cls)}>{k.label}</span></td>
                    <td className="px-3 py-2"><div className="font-medium text-ink">{r.client_name ?? "—"}</div><div className="text-[11px] text-ink-3 tabular-nums">{r.phone ?? ""}</div></td>
                    <td className="px-3 py-2"><div className="font-mono text-xs text-ink">{r.plate ?? "—"}</div><div className="text-[11px] text-ink-3">{r.car_model ?? ""}</div></td>
                    <td className="px-3 py-2 text-[11px] text-ink-2">{r.delivery_date ?? "?"} → {r.pickup_date ?? "?"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.rent)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.deposit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-700">{money(r.salik)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-danger">{money(r.fine)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(r.total)}</td>
                    <td className="px-3 py-2 text-[11px] text-ink-3">{r.manager ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

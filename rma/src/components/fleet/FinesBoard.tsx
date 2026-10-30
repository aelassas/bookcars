"use client";

import { useState } from "react";
import { Siren, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { checkVehicleFines, type FinesCheckResult } from "@/app/(tenant)/[tenantSlug]/fines/actions";
import type { RtaFine } from "@/platform/integrations/rta/client";

type VehicleRow = { id: string; plate: string; label: string; checkable: boolean };
type State = { status: "idle" | "loading" | "done" | "error"; data?: FinesCheckResult };

export function FinesBoard({ tenantId, vehicles }: { tenantId: string; vehicles: VehicleRow[] }) {
  const [states, setStates] = useState<Record<string, State>>({});
  const [checkingAll, setCheckingAll] = useState(false);

  async function check(id: string) {
    setStates((s) => ({ ...s, [id]: { status: "loading" } }));
    try {
      const data = await checkVehicleFines(tenantId, id);
      setStates((s) => ({ ...s, [id]: { status: data.ok ? "done" : "error", data } }));
    } catch (e) {
      setStates((s) => ({
        ...s,
        [id]: { status: "error", data: { ok: false, error: e instanceof Error ? e.message : "failed" } },
      }));
    }
  }

  async function checkAll() {
    setCheckingAll(true);
    for (const v of vehicles.filter((x) => x.checkable)) {
      await check(v.id); // sequential — be polite to the RTA gateway
    }
    setCheckingAll(false);
  }

  const totalFines = Object.values(states).reduce((n, s) => {
    return n + (s.data?.ok ? s.data.result.fines.length : 0);
  }, 0);
  const totalAed = Object.values(states).reduce((n, s) => {
    return n + (s.data?.ok ? s.data.result.totalAmount : 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Salik strip — honest status, not a dead page */}
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <Siren className="h-4 w-4 text-brand-600" /> Salik tolls
        </span>
        <span className="text-ink-2">
          One Salik account for all cars (per intake form). Live toll sync turns on the moment the account login is
          shared — until then RTA fines below already work on the real plates.
        </span>
        <button
          type="button"
          onClick={checkAll}
          disabled={checkingAll}
          className="ml-auto inline-flex items-center gap-1.5 rounded-field bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {checkingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Check all cars (RTA)
        </button>
      </div>

      {totalFines > 0 && (
        <div className="rounded-card border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {totalFines} open fine{totalFines === 1 ? "" : "s"} · {totalAed.toLocaleString("en-AE")} AED total
        </div>
      )}

      <div className="space-y-3">
        {vehicles.map((v) => {
          const st = states[v.id] ?? { status: "idle" as const };
          return (
            <div key={v.id} className="rounded-card border border-line bg-surface">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink tnum">{v.plate}</div>
                  <div className="text-xs text-ink-3">{v.label}</div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {st.status === "done" && st.data?.ok && (
                    st.data.result.fines.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <CheckCircle2 className="h-4 w-4" /> No open fines
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        {st.data.result.fines.length} fine{st.data.result.fines.length === 1 ? "" : "s"} ·{" "}
                        {st.data.result.totalAmount.toLocaleString("en-AE")} AED
                      </span>
                    )
                  )}
                  {st.status === "error" && (
                    <span className="text-xs text-amber-700">{st.data && !st.data.ok ? st.data.error : "failed"}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => check(v.id)}
                    disabled={!v.checkable || st.status === "loading"}
                    className="inline-flex items-center gap-1.5 rounded-field border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2 hover:bg-sunken hover:text-ink disabled:opacity-40"
                    title={v.checkable ? "Check RTA payable fines" : "Plate format not checkable via RTA"}
                  >
                    {st.status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Check RTA
                  </button>
                </div>
              </div>
              {st.status === "done" && st.data?.ok && st.data.result.fines.length > 0 && (
                <table className="w-full border-t border-line-soft text-xs">
                  <thead>
                    <tr className="text-left text-ink-3">
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Description</th>
                      <th className="px-4 py-2 font-medium">Source</th>
                      <th className="px-4 py-2 font-medium">Ref №</th>
                      <th className="px-4 py-2 text-right font-medium">AED</th>
                      <th className="px-4 py-2 text-right font-medium">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {st.data.result.fines.map((f: RtaFine) => (
                      <tr key={f.referenceNo} className="border-t border-line-soft text-ink-2">
                        <td className="px-4 py-2 tnum">{f.ticketDate.slice(0, 10)}</td>
                        <td className="px-4 py-2">{f.description}</td>
                        <td className="px-4 py-2">{f.source}</td>
                        <td className="px-4 py-2 tnum">{f.referenceNo}</td>
                        <td className="px-4 py-2 text-right font-semibold text-red-600 tnum">{f.amount.toLocaleString("en-AE")}</td>
                        <td className="px-4 py-2 text-right tnum">{f.blackPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

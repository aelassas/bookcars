"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  Button,
  EmptyState,
} from "@/components/ui";
import { buildDispatchPlan } from "@/modules/returns/dispatch";
import type { DispatchPlan } from "@/modules/returns/dispatch";
import { ProcessReturnModal } from "@/components/modals/ProcessReturnModal";
import { RotateCcw, Route, Phone, AlertTriangle, CalendarCheck } from "lucide-react";
import ReturnChecklist from "@/components/returns/ReturnChecklist";

type ReturnRow = {
  rental: {
    id: string;
    returnDate: Date | null;
    status: string;
    dailyRate: number;
    totalDays: number;
    balanceDue: number;
    /** Present on upcoming rows — drives the fines badge (checked? how much?). */
    returnChecklist?: { fines?: { checked: boolean; amount?: number | null } | null } | null;
  };
  customerName: string | null;
  customerPhone: string | null;
  vehiclePlate: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
};

const CALL_LINK_CLS =
  "inline-flex items-center gap-1 rounded-field border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink";

export default function ReturnsToday({
  returns,
  overdue,
  upcoming = [],
  tenantId,
  tenantSlug,
  actorId,
}: {
  returns: ReturnRow[];
  overdue: ReturnRow[];
  /** Due back tomorrow onward — the window where a fine is still chargeable. */
  upcoming?: ReturnRow[];
  tenantId: string;
  tenantSlug: string;
  actorId?: string;
}) {
  const [plan, setPlan] = useState<DispatchPlan | null>(null);
  const [rows] = useState<ReturnRow[]>(returns);
  const [overdueRows] = useState<ReturnRow[]>(overdue);
  const [returnRental, setReturnRental] = useState<ReturnRow | null>(null);
  const [copied, setCopied] = useState(false);

  /** Plain-text plan for pasting into the dispatcher's chat (Telegram/WhatsApp). */
  function formatPlan(p: DispatchPlan): string {
    const lines = [
      `Driver dispatch — ${p.totalStops} stop${p.totalStops === 1 ? "" : "s"} (~${p.estimatedDurationMinutes} min)`,
      "",
    ];
    p.stops.forEach((stop, i) => {
      const time = stop.returnDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const phone = stop.customerPhone ? ` — ${stop.customerPhone}` : "";
      lines.push(
        `${i + 1}. ${stop.customerName} · ${stop.vehiclePlate} — ${stop.vehicleMake ?? ""} ${stop.vehicleModel ?? ""} — return by ${time}${phone}`.replace(/\s+/g, " ").trim()
      );
    });
    return lines.join("\n");
  }

  // Build the plan and copy it to the clipboard so the dispatcher can paste it
  // into their driver chat. There is no in-app driver bot to send to, so this
  // is an honest copy-to-clipboard action rather than a fake "sent" state.
  async function generatePlan() {
    const stops = rows.map((r) => ({
      rentalId: r.rental.id,
      customerName: r.customerName ?? "Customer",
      customerPhone: r.customerPhone,
      vehiclePlate: r.vehiclePlate ?? "—",
      vehicleMake: r.vehicleMake,
      vehicleModel: r.vehicleModel,
      returnDate: r.rental.returnDate ? new Date(r.rental.returnDate) : new Date(),
      location: "Dubai",
    }));
    const built = buildDispatchPlan(stops);
    setPlan(built);
    try {
      await navigator.clipboard.writeText(formatPlan(built));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked (permissions/insecure context) — the plan is still
      // rendered below for manual copy.
      setCopied(false);
    }
  }

  function handleReturn(r: ReturnRow) {
    setReturnRental(r);
  }

  return (
    <div>
      <PageHeader
        title="Returns Today"
        subtitle={`${rows.length} return${rows.length === 1 ? "" : "s"} scheduled · ${overdueRows.length} overdue`}
        icon={<RotateCcw className="h-4.5 w-4.5" />}
        action={
          <Button onClick={generatePlan} disabled={rows.length === 0}>
            <Route className="h-4 w-4" /> {copied ? "Copied to clipboard ✓" : "Copy dispatch plan"}
          </Button>
        }
      />

      {returnRental && (
        <ProcessReturnModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          actorId={actorId}
          rental={{
            id: returnRental.rental.id,
            returnDate: returnRental.rental.returnDate,
            dailyRate: returnRental.rental.dailyRate,
            totalDays: returnRental.rental.totalDays,
            balanceDue: returnRental.rental.balanceDue,
          }}
          onClose={() => setReturnRental(null)}
          onReturned={() => window.location.reload()}
        />
      )}

      {overdueRows.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-danger-line bg-danger-soft px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-medium text-danger">
              {overdueRows.length} rental{overdueRows.length === 1 ? " is" : "s are"} overdue
            </p>
            <p className="text-xs text-danger/80">
              These customers have passed their return date. Contact them immediately.
            </p>
          </div>
        </div>
      )}

      {plan && (
        <Card className="mb-5 overflow-hidden">
          <CardHeader
            title="Driver route"
            icon={<Route className="h-3.5 w-3.5" />}
            action={
              <span className="text-xs text-ink-3 tnum">
                {plan.totalStops} stops · ~{plan.estimatedDurationMinutes} min
              </span>
            }
          />
          <p className="border-b border-line-soft px-4 py-2 text-xs text-ink-3">
            {copied
              ? "Copied to clipboard — paste into your driver chat."
              : "Copy the button above to send this into your driver chat."}
          </p>
          <ol className="divide-y divide-line-soft">
            {plan.stops.map((stop, i) => (
              <li key={stop.rentalId} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white tnum">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">
                    {stop.customerName} · {stop.vehiclePlate}
                  </div>
                  <div className="text-xs text-ink-2">
                    {stop.vehicleMake} {stop.vehicleModel} · Return by{" "}
                    {stop.returnDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                {stop.customerPhone && (
                  <a href={`tel:${stop.customerPhone}`} className={CALL_LINK_CLS}>
                    <Phone className="h-3 w-3" /> Call
                  </a>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="h-5 w-5" />}
          title="No returns scheduled for today"
          description="Vehicles due back today will show up here with a one-tap return flow."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.rental.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink">{r.customerName ?? "—"}</span>
                <Badge tone="success">Today</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-2">
                {r.vehiclePlate} · {r.vehicleMake} {r.vehicleModel}
              </p>
              <p className="mt-2 text-xs text-ink-3">
                Return by{" "}
                {r.rental.returnDate
                  ? new Date(r.rental.returnDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </p>
              <div className="mt-3 flex items-center gap-2">
                {r.customerPhone && (
                  <a href={`tel:${r.customerPhone}`} className={CALL_LINK_CLS}>
                    <Phone className="h-3 w-3" /> {r.customerPhone}
                  </a>
                )}
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => handleReturn(r)}
                >
                  <RotateCcw className="h-3 w-3" /> Return
                </Button>
              </div>
              <ReturnChecklist tenantId={tenantId} rentalId={r.rental.id} />
            </Card>
          ))}
        </div>
      )}

      {overdueRows.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-2">Overdue</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overdueRows.map((r) => (
              <Card key={r.rental.id} className="border-danger-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{r.customerName ?? "—"}</span>
                  <Badge tone="danger">Overdue</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-2">
                  {r.vehiclePlate} · {r.vehicleMake} {r.vehicleModel}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {r.customerPhone && (
                    <a href={`tel:${r.customerPhone}`} className={CALL_LINK_CLS}>
                      <Phone className="h-3 w-3" /> {r.customerPhone}
                    </a>
                  )}
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => handleReturn(r)}
                  >
                    <RotateCcw className="h-3 w-3" /> Return
                  </Button>
                </div>
                <ReturnChecklist tenantId={tenantId} rentalId={r.rental.id} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Coming back — the whole point of this section is the days BEFORE the
          handover. A fine lands on the plate's owner and shows up late, so once
          the customer has driven off with their deposit back, it is the
          company's fine. Looking it up the morning the car returns is already
          late; looking it up now is not. */}
      {upcoming.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-2">
            Coming back · next 7 days
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((r) => {
              const fines = r.rental.returnChecklist?.fines;
              const finesChecked = fines?.checked === true;
              const finesAmount = typeof fines?.amount === "number" ? fines.amount : 0;
              // Three states: not looked up yet (act on it), looked up with money
              // owed (loud — recover it before the deposit goes back), or clean.
              const finesBadge = !finesChecked
                ? { tone: "warning" as const, label: "Check fines" }
                : finesAmount > 0
                  ? { tone: "danger" as const, label: `${finesAmount.toLocaleString()} AED fines` }
                  : { tone: "success" as const, label: "No fines" };
              return (
                <Card key={r.rental.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-ink">{r.customerName ?? "—"}</span>
                    <Badge tone={finesBadge.tone}>{finesBadge.label}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-2">
                    {r.vehiclePlate} · {r.vehicleMake} {r.vehicleModel}
                  </p>
                  <p className="mt-1 text-xs text-ink-3">
                    Due {r.rental.returnDate ? new Date(r.rental.returnDate).toLocaleDateString() : "—"}
                  </p>
                  {r.customerPhone && (
                    <div className="mt-3">
                      <a href={`tel:${r.customerPhone}`} className={CALL_LINK_CLS}>
                        <Phone className="h-3 w-3" /> {r.customerPhone}
                      </a>
                    </div>
                  )}
                  {/* Same checklist as the day-of card: whoever looks the plate
                      up records it here, and it is already filled when the car
                      arrives. No second place to keep the answer. */}
                  <ReturnChecklist tenantId={tenantId} rentalId={r.rental.id} />
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

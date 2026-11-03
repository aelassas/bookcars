"use client";

import { useState, type ReactNode } from "react";
import { BackLink } from "@/components/ui/BackLink";
import {
  Card,
  CardHeader,
  Badge,
  Button,
  Table,
  TH,
  TD,
  cx,
  type BadgeTone,
} from "@/components/ui";
import { RecordPaymentModal } from "@/components/modals/RecordPaymentModal";
import { ProcessReturnModal } from "@/components/modals/ProcessReturnModal";
import { DocumentPanel } from "@/components/documents/DocumentPanel";
import { ContractSection } from "@/components/rental/ContractSection";
import { startRental, completeRental, cancelRental, resolveDeposit } from "@/modules/rental/actions";
import { confirmPayment } from "@/modules/rental/payment-actions";
import { BOOKING_BASIS_LABEL } from "@/modules/rental/booking";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Banknote,
  Paperclip,
  Calendar,
  Gauge,
  Fuel,
  Wallet,
  Receipt,
  StickyNote,
  FileText,
} from "lucide-react";

type Rental = {
  id: string;
  startDate: Date | null;
  returnDate: Date | null;
  actualReturnDate: Date | null;
  dailyRate: number;
  totalDays: number;
  deposit: number;
  total: number;
  balanceDue: number;
  status: string;
  finalOdometer: number | null;
  fuelLevel: number | null;
  extraDays: number | null;
  lateFee: number | null;
  damageFee: number | null;
  depositRefunded: number | null;
  returnNotes: string | null;
  notes: string | null;
  // Deposit-contract lifecycle (optional — present on the DB row at runtime).
  contractType?: string | null;
  bookingBasis?: string | null;
  depositStatus?: string | null;
  depositWithheldReason?: string | null;
  depositResolvedAt?: Date | null;
  salesAgentId?: string | null;
  contractUrl?: string | null;
};

type Payment = {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  status: string;
  createdAt: Date | null;
};

const STATUS_TONE: Record<string, BadgeTone> = {
  reserved: "warning",
  active: "success",
  returned: "info",
  completed: "neutral",
  cancelled: "neutral",
};

/** Quiet definition-list row used across the detail cards. */
function Row({ label, value, valueClass }: { label: string; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-2">{label}</dt>
      <dd className={cx("font-medium text-ink tnum", valueClass)}>{value}</dd>
    </div>
  );
}

export function RentalDetail({
  tenantId,
  tenantSlug,
  rental: initialRental,
  customerName,
  customerPhone,
  vehicleLabel,
  payments: initialPayments,
  actorId,
  canConfirm = false,
}: {
  tenantId: string;
  tenantSlug: string;
  rental: Rental;
  customerName: string | null;
  customerPhone: string | null;
  vehicleLabel: string;
  payments: Payment[];
  actorId?: string;
  canConfirm?: boolean;
}) {
  const [r, setR] = useState<Rental>(initialRental);
  const [payments] = useState<Payment[]>(initialPayments);
  const [showPayment, setShowPayment] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      await startRental(tenantId, actorId, r.id, tenantSlug);
      setR((prev) => ({ ...prev, status: "active" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    const balanceDue = Number(r.balanceDue) || 0;
    const confirmMsg =
      balanceDue > 0
        ? `This rental still owes ${balanceDue}. Completing will write off the outstanding balance. Continue?`
        : "Complete this rental?";
    if (!confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    try {
      await completeRental(tenantId, actorId, r.id, tenantSlug, balanceDue > 0);
      setR((prev) => ({ ...prev, status: "completed", balanceDue: 0 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Complete failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this rental?")) return;
    setBusy(true);
    setError(null);
    try {
      await cancelRental(tenantId, actorId, r.id, tenantSlug);
      setR((prev) => ({ ...prev, status: "cancelled" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(paymentId: string) {
    setBusy(true);
    setError(null);
    try {
      await confirmPayment(tenantId, paymentId, tenantSlug);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
      setBusy(false);
    }
  }

  async function handleResolveDeposit(outcome: "returned" | "partial" | "withheld") {
    let refundedAmount: number | undefined;
    let reason: string | undefined;
    if (outcome === "withheld") {
      reason = prompt("Reason for withholding the deposit:")?.trim() || undefined;
      if (!reason) return;
      if (!confirm(`Withhold the full ${formatCurrency(r.deposit)} deposit?\nReason: ${reason}`)) return;
    } else if (outcome === "partial") {
      const raw = prompt(`Amount to RETURN to the renter (deposit is ${r.deposit} AED):`);
      if (raw == null) return;
      refundedAmount = Number(raw);
      reason = prompt("Reason for withholding the remainder:")?.trim() || undefined;
      if (!reason) return;
    } else {
      if (!confirm(`Return the full ${formatCurrency(r.deposit)} deposit to the renter?`)) return;
    }
    setBusy(true);
    setError(null);
    try {
      await resolveDeposit(tenantId, actorId, r.id, { outcome, refundedAmount, reason }, tenantSlug);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deposit resolution failed");
      setBusy(false);
    }
  }

  const showStart = r.status === "reserved";
  const canReturn = r.status === "active";
  const depositStatus = r.depositStatus ?? "held";
  const canResolveDeposit =
    canConfirm && r.deposit > 0 && depositStatus === "held" && (r.status === "returned" || r.status === "completed");
  const showComplete = r.status === "returned";
  const showCancel = r.status === "reserved";
  const showPaymentButton = (r.status === "active" || r.status === "returned") && r.balanceDue > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink href={`/${tenantSlug}/rentals`}>Back to rentals</BackLink>

      {showPayment && (
        <RecordPaymentModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          rentalId={r.id}
          customerName={customerName}
          maxAmount={r.balanceDue}
          onClose={() => setShowPayment(false)}
          onRecorded={() => window.location.reload()}
        />
      )}

      {showReturnModal && (
        <ProcessReturnModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          actorId={actorId}
          rental={{
            id: r.id,
            returnDate: r.returnDate,
            dailyRate: r.dailyRate,
            balanceDue: r.balanceDue,
          }}
          onClose={() => setShowReturnModal(false)}
          onReturned={() => window.location.reload()}
        />
      )}

      {showDocs && (
        <div className="mb-6">
          <DocumentPanel
            tenantId={tenantId}
            entityType="rental"
            entityId={r.id}
            entityLabel={`Rental — ${customerName}`}
            onClose={() => setShowDocs(false)}
          />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              Rental <span className="tnum">{r.id.slice(0, 8)}</span>
            </h1>
            <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>
              <span className={r.status === "cancelled" ? "line-through" : undefined}>{r.status}</span>
            </Badge>
            <Badge tone="brand">{BOOKING_BASIS_LABEL[r.bookingBasis ?? "booked"] ?? "Booked"}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-ink-2">
            {customerName} · {customerPhone} · {vehicleLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showPaymentButton && (
            <Button size="sm" onClick={() => setShowPayment(true)} disabled={busy}>
              <Banknote className="h-4 w-4" /> Record payment
            </Button>
          )}
          {showStart && (
            <Button size="sm" onClick={handleStart} disabled={busy}>
              <Play className="h-4 w-4" /> Start
            </Button>
          )}
          {canReturn && (
            <Button size="sm" onClick={() => setShowReturnModal(true)} disabled={busy}>
              <RotateCcw className="h-4 w-4" /> Process return
            </Button>
          )}
          {showComplete && (
            <Button size="sm" onClick={handleComplete} disabled={busy}>
              <CheckCircle2 className="h-4 w-4" /> Complete
            </Button>
          )}
          {showCancel && (
            <Button variant="secondary" size="sm" onClick={handleCancel} disabled={busy}>
              <XCircle className="h-4 w-4" /> Cancel
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setShowDocs(true)}>
            <Paperclip className="h-4 w-4" /> Docs
          </Button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardHeader title="Rental terms" icon={<Calendar className="h-3.5 w-3.5" />} />
          <dl className="space-y-3 p-4 text-sm">
            <Row label="Start date" value={formatDate(r.startDate)} />
            <Row label="Expected return" value={formatDate(r.returnDate)} />
            {r.actualReturnDate && (
              <Row label="Actual return" value={formatDate(r.actualReturnDate)} valueClass="text-info" />
            )}
            <Row label="Duration" value={`${r.totalDays} days`} />
            <Row label="Daily rate" value={formatCurrency(r.dailyRate)} />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Financials" icon={<Wallet className="h-3.5 w-3.5" />} />
          <dl className="space-y-3 p-4 text-sm">
            <Row label="Rental total" value={formatCurrency(r.total)} />
            <Row label="Deposit" value={formatCurrency(r.deposit)} />
            <Row
              label="Late fee"
              value={formatCurrency(r.lateFee ?? 0)}
              valueClass={(r.lateFee ?? 0) > 0 ? "text-danger" : "text-ink-3"}
            />
            <Row
              label="Damage fee"
              value={formatCurrency(r.damageFee ?? 0)}
              valueClass={(r.damageFee ?? 0) > 0 ? "text-danger" : "text-ink-3"}
            />
            <div className="flex items-baseline justify-between gap-3 border-t border-line-soft pt-3">
              <dt className="font-medium text-ink">Balance due</dt>
              <dd className={cx("font-semibold tnum", r.balanceDue > 0 ? "text-danger" : "text-success")}>
                {formatCurrency(r.balanceDue)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Return inspection" icon={<Gauge className="h-3.5 w-3.5" />} />
          <div className="p-4">
            {r.status === "reserved" || r.status === "active" ? (
              <p className="text-sm text-ink-3">Inspection will be available after return.</p>
            ) : (
              <dl className="space-y-3 text-sm">
                <Row label="Final odometer" value={`${r.finalOdometer ?? "—"} km`} />
                <Row
                  label="Fuel level"
                  value={
                    <span className="inline-flex items-center gap-1">
                      <Fuel className="h-3 w-3 text-ink-3" />
                      {r.fuelLevel ?? "—"}%
                    </span>
                  }
                />
                <Row label="Extra days" value={r.extraDays ?? 0} />
                <Row label="Deposit refunded" value={formatCurrency(r.depositRefunded ?? 0)} />
                {r.returnNotes && (
                  <div className="pt-2">
                    <dt className="text-ink-2">Notes</dt>
                    <dd className="mt-1 whitespace-pre-wrap rounded-field bg-sunken p-2 text-ink">
                      {r.returnNotes}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Contract" icon={<FileText className="h-3.5 w-3.5" />} />
        <div className="p-4">
          <ContractSection
            rentalId={r.id}
            tenantId={tenantId}
            contractUrl={r.contractUrl}
            canGenerate={canConfirm}
          />
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Deposit-contract" icon={<Banknote className="h-3.5 w-3.5" />} />
        <div className="p-4">
          <dl className="space-y-3 text-sm">
            <Row label="Deposit held" value={formatCurrency(r.deposit)} />
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-2">Status</dt>
              <dd>
                {depositStatus === "returned" ? (
                  <Badge tone="success">returned in full</Badge>
                ) : depositStatus === "partial" ? (
                  <Badge tone="warning">partially returned</Badge>
                ) : depositStatus === "withheld" ? (
                  <Badge tone="danger">withheld</Badge>
                ) : (
                  <Badge tone="neutral">held</Badge>
                )}
              </dd>
            </div>
            {depositStatus !== "held" && (
              <Row label="Returned to renter" value={formatCurrency(r.depositRefunded ?? 0)} />
            )}
            {r.depositWithheldReason && (
              <div className="pt-1">
                <dt className="text-ink-2">Withheld reason</dt>
                <dd className="mt-1 whitespace-pre-wrap rounded-field border border-danger-line bg-danger-soft p-2 text-danger">
                  {r.depositWithheldReason}
                </dd>
              </div>
            )}
          </dl>
          {canResolveDeposit && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line-soft pt-4">
              <Button size="sm" onClick={() => handleResolveDeposit("returned")} disabled={busy}>
                <CheckCircle2 className="h-4 w-4" /> Return in full
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleResolveDeposit("partial")} disabled={busy}>
                Partial return
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleResolveDeposit("withheld")} disabled={busy}>
                <XCircle className="h-4 w-4" /> Withhold
              </Button>
            </div>
          )}
          {!canResolveDeposit && depositStatus === "held" && r.deposit > 0 && (
            <p className="mt-3 text-xs text-ink-3">
              Deposit can be resolved by sales once the vehicle is returned.
            </p>
          )}
        </div>
      </Card>

      <Card className="mt-5 overflow-hidden">
        <CardHeader title="Payment history" count={payments.length} icon={<Receipt className="h-3.5 w-3.5" />} />
        {payments.length === 0 ? (
          <p className="p-4 text-sm text-ink-3">No payments recorded.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <TH>Date</TH>
                <TH>Method</TH>
                <TH>Status</TH>
                <TH className="text-right">Amount</TH>
                <TH></TH>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-sunken/50">
                  <TD className="whitespace-nowrap tnum">{formatDate(p.createdAt)}</TD>
                  <TD className="capitalize">{p.method}</TD>
                  <TD>
                    {p.status === "confirmed" ? (
                      <Badge tone="success">confirmed</Badge>
                    ) : p.status === "rejected" ? (
                      <Badge tone="danger">rejected</Badge>
                    ) : (
                      <Badge tone="warning">pending confirmation</Badge>
                    )}
                  </TD>
                  <TD
                    className={cx(
                      "text-right font-medium tnum",
                      p.status === "confirmed" ? "text-success" : "text-warn"
                    )}
                  >
                    {formatCurrency(p.amount)}
                  </TD>
                  <TD className="text-right">
                    {p.status === "pending" && canConfirm && (
                      <Button size="sm" onClick={() => handleConfirm(p.id)} disabled={busy}>
                        Confirm &amp; post
                      </Button>
                    )}
                  </TD>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {r.notes && (
        <Card className="mt-5">
          <CardHeader title="Notes" icon={<StickyNote className="h-3.5 w-3.5" />} />
          <p className="whitespace-pre-wrap p-4 text-sm text-ink">{r.notes}</p>
        </Card>
      )}
    </div>
  );
}

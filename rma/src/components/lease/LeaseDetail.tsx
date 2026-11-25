"use client";

import { useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import {
  Card,
  CardHeader,
  Badge,
  Button,
  Table,
  TH,
  TD,
  type BadgeTone,
} from "@/components/ui";
import { recordLeasePayment, confirmLeasePayment, startLease, completeLease, defaultLease, cancelLease } from "@/modules/lease/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Play, CheckCircle2, AlertTriangle, XCircle, Banknote } from "lucide-react";

type Lease = {
  id: string;
  contractRef: string;
  startDate: Date | null;
  endDate: Date | null;
  termMonths: number;
  downPayment: number;
  monthlyPayment: number;
  residualValue: number;
  totalAmount: number;
  balanceDue: number;
  status: string;
  notes: string | null;
};

type Installment = {
  id: string;
  installmentNumber: number;
  dueDate: Date | null;
  amount: number;
  status: string;
  paidAt: Date | null;
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
  draft: "neutral",
  active: "success",
  completed: "neutral",
  defaulted: "danger",
  cancelled: "neutral",
  pending: "warning",
  paid: "success",
  overdue: "danger",
  waived: "neutral",
};

const SUCCESS_BTN =
  "inline-flex h-9 select-none items-center justify-center gap-2 whitespace-nowrap rounded-field bg-success px-3.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

export function LeaseDetail({
  tenantId,
  tenantSlug,
  lease: initialLease,
  customerName,
  customerPhone,
  vehicleLabel,
  installments: initialInstallments,
  payments: initialPayments,
  actorId,
  canConfirm = false,
}: {
  tenantId: string;
  tenantSlug: string;
  lease: Lease;
  customerName: string | null;
  customerPhone: string | null;
  vehicleLabel: string;
  installments: Installment[];
  payments: Payment[];
  actorId?: string;
  canConfirm?: boolean;
}) {
  const [l, setL] = useState<Lease>(initialLease);
  const [installments, setInstallments] = useState<Installment[]>(initialInstallments);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setBusy("start");
    setError(null);
    try {
      await startLease(tenantId, actorId, l.id, tenantSlug);
      setL((prev) => ({ ...prev, status: "active" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleComplete() {
    if (!confirm("Complete this lease and clear balance due?")) return;
    setBusy("complete");
    setError(null);
    try {
      await completeLease(tenantId, actorId, l.id, tenantSlug);
      setL((prev) => ({ ...prev, status: "completed", balanceDue: 0 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Complete failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleDefault() {
    if (!confirm("Mark this lease as defaulted?")) return;
    setBusy("default");
    setError(null);
    try {
      await defaultLease(tenantId, actorId, l.id, tenantSlug);
      setL((prev) => ({ ...prev, status: "defaulted" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Default failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this lease?")) return;
    setBusy("cancel");
    setError(null);
    try {
      await cancelLease(tenantId, actorId, l.id, tenantSlug);
      setL((prev) => ({ ...prev, status: "cancelled" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(null);
    }
  }

  // Two-step: record creates a PENDING payment (installment stays unpaid, balance
  // unchanged) until sales confirms. Reload to reflect server state.
  async function handlePay(installment: Installment) {
    setBusy(`pay-${installment.id}`);
    setError(null);
    try {
      await recordLeasePayment(tenantId, actorId, l.id, { amount: installment.amount, method: "cash", installmentId: installment.id }, tenantSlug);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
      setBusy(null);
    }
  }

  async function handleConfirmPayment(paymentId: string) {
    setBusy(`confirm-${paymentId}`);
    setError(null);
    try {
      await confirmLeasePayment(tenantId, paymentId, tenantSlug);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
      setBusy(null);
    }
  }
  void setL; void setInstallments; void setPayments;

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink href={`/${tenantSlug}/leases`}>Back to leases</BackLink>

      {error && (
        <div className="mb-4 rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{l.contractRef}</h1>
          <p className="mt-0.5 text-sm text-ink-2">
            {customerName} • {customerPhone} • {vehicleLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[l.status] ?? "neutral"}>
            <span className={l.status === "cancelled" ? "line-through" : undefined}>{l.status}</span>
          </Badge>
          {l.status === "draft" && (
            <Button onClick={handleStart} disabled={busy === "start"}>
              <Play className="h-4 w-4" /> Start
            </Button>
          )}
          {l.status === "active" && (
            <>
              <button
                onClick={handleComplete}
                disabled={busy === "complete"}
                className={SUCCESS_BTN}
              >
                <CheckCircle2 className="h-4 w-4" /> Complete
              </button>
              <Button variant="danger" onClick={handleDefault} disabled={busy === "default"}>
                <AlertTriangle className="h-4 w-4" /> Default
              </Button>
            </>
          )}
          {(l.status === "draft" || l.status === "active") && (
            <Button variant="secondary" onClick={handleCancel} disabled={busy === "cancel"}>
              <XCircle className="h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader title="Contract terms" />
          <dl className="space-y-3 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-2">Start date</dt>
              <dd className="font-medium text-ink tnum">{formatDate(l.startDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">End date</dt>
              <dd className="font-medium text-ink tnum">{formatDate(l.endDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Term</dt>
              <dd className="font-medium text-ink tnum">{l.termMonths} months</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Monthly payment</dt>
              <dd className="font-medium text-ink tnum">{formatCurrency(l.monthlyPayment)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Financials" />
          <dl className="space-y-3 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-2">Down payment</dt>
              <dd className="font-medium text-ink tnum">{formatCurrency(l.downPayment)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Residual / buyout</dt>
              <dd className="font-medium text-ink tnum">{formatCurrency(l.residualValue)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Total value</dt>
              <dd className="font-medium text-ink tnum">{formatCurrency(l.totalAmount)}</dd>
            </div>
            <div className="flex justify-between border-t border-line-soft pt-3">
              <dt className="font-medium text-ink">Balance due</dt>
              <dd className={`font-semibold tnum ${l.balanceDue > 0 ? "text-danger" : "text-success"}`}>
                {formatCurrency(l.balanceDue)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Progress" />
          <div className="space-y-3 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-2">Installments paid</span>
              <span className="font-medium text-ink tnum">
                {installments.filter((i) => i.status === "paid").length} / {installments.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Pending</span>
              <span className="font-medium text-warn tnum">{installments.filter((i) => i.status === "pending").length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-2">Overdue</span>
              <span className="font-medium text-danger tnum">
                {installments.filter((i) => i.status === "overdue" || (i.status === "pending" && i.dueDate && new Date(i.dueDate) < new Date())).length}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Installment schedule" count={installments.length} />
          {installments.length === 0 ? (
            <p className="p-4 text-sm text-ink-3">No installments.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <TH>#</TH>
                  <TH>Due date</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Status</TH>
                  <TH></TH>
                </tr>
              </thead>
              <tbody>
                {installments.map((i) => {
                  const isOverdue = i.status === "pending" && i.dueDate && new Date(i.dueDate) < new Date();
                  const displayStatus = isOverdue ? "overdue" : i.status;
                  return (
                    <tr key={i.id} className="transition-colors hover:bg-sunken/50">
                      <TD className="tnum">{i.installmentNumber}</TD>
                      <TD className="whitespace-nowrap tnum">{formatDate(i.dueDate)}</TD>
                      <TD className="whitespace-nowrap text-right font-medium text-ink tnum">
                        {formatCurrency(i.amount)}
                      </TD>
                      <TD>
                        <Badge tone={STATUS_TONE[displayStatus] ?? "neutral"}>
                          <span className={displayStatus === "waived" ? "line-through" : undefined}>
                            {displayStatus}
                          </span>
                        </Badge>
                      </TD>
                      <TD>
                        {i.status === "pending" && l.status === "active" && (
                          <button
                            onClick={() => handlePay(i)}
                            disabled={busy === `pay-${i.id}`}
                            className="inline-flex items-center gap-1 rounded-field bg-success-soft px-2 py-1 text-xs font-medium text-success transition-colors hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <Banknote className="h-3 w-3" /> Pay
                          </button>
                        )}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Payment history" count={payments.length} />
          {payments.length === 0 ? (
            <p className="p-4 text-sm text-ink-3">No payments recorded.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <TH>Date</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Amount</TH>
                  <TH></TH>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-sunken/50">
                    <TD className="whitespace-nowrap tnum">{formatDate(p.createdAt)}</TD>
                    <TD>
                      <Badge
                        tone={
                          p.status === "confirmed"
                            ? "success"
                            : p.status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {p.status === "pending" ? "pending confirmation" : p.status}
                      </Badge>
                    </TD>
                    <TD
                      className={`whitespace-nowrap text-right font-medium tnum ${p.status === "confirmed" ? "text-success" : "text-warn"}`}
                    >
                      {formatCurrency(p.amount)}
                    </TD>
                    <TD className="text-right">
                      {p.status === "pending" && canConfirm && (
                        <button
                          onClick={() => handleConfirmPayment(p.id)}
                          disabled={busy === `confirm-${p.id}`}
                          className="rounded-field bg-success px-2 py-1 text-xs font-semibold text-white shadow-card transition-colors hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Confirm &amp; post
                        </button>
                      )}
                    </TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      {l.notes && (
        <Card className="mt-6">
          <CardHeader title="Notes" />
          <p className="whitespace-pre-wrap p-4 text-sm text-ink-2">{l.notes}</p>
        </Card>
      )}
    </div>
  );
}

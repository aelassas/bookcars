"use client";

import { useState } from "react";
import { Badge, Button, Input, Select, Table, TH, TD, cx } from "@/components/ui";
import { deletePayment, updatePayment } from "@/modules/rental/payment-actions";
import { PAYMENT_METHODS } from "@/modules/rental/payment-rules";
import { formatCurrency, formatDate } from "@/lib/format";

type Payment = {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  status: string;
  rentalChargeId?: string | null;
  createdAt: Date | null;
};

export function PaymentHistory({ tenantId, tenantSlug, payments, canConfirm, canEditPayments, busy, onConfirm, onReject }: {
  tenantId: string;
  tenantSlug: string;
  payments: Payment[];
  canConfirm: boolean;
  canEditPayments: boolean;
  busy: boolean;
  onConfirm: (paymentId: string) => void;
  onReject: (paymentId: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(payment: Payment) {
    setEditingId(payment.id);
    setAmount(String(payment.amount));
    setMethod(payment.method);
    setNotes(payment.notes ?? "");
    setError(null);
  }

  async function saveEdit(paymentId: string) {
    setSaving(true);
    setError(null);
    try {
      await updatePayment(tenantId, paymentId, { amount: Number(amount), method, notes }, tenantSlug);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update payment");
    } finally {
      setSaving(false);
    }
  }

  async function remove(payment: Payment) {
    const message = payment.status === "confirmed"
      ? `Delete confirmed payment of ${payment.amount} AED? The rental balance will increase or the charge will reopen. Engine state will not be changed automatically.`
      : `Delete ${payment.status} payment of ${payment.amount} AED? Balance is unchanged.`;
    if (!confirm(message)) return;
    setSaving(true);
    setError(null);
    try {
      await deletePayment(tenantId, payment.id, tenantSlug);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete payment");
    } finally {
      setSaving(false);
    }
  }

  if (payments.length === 0) return <p className="p-4 text-sm text-ink-3">No payments recorded.</p>;

  return (
    <>
      {error && <p role="alert" className="p-4 text-sm text-danger">{error}</p>}
      <Table>
        <thead>
          <tr><TH>Date</TH><TH>Method</TH><TH>Status</TH><TH className="text-right">Amount</TH><TH></TH></tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="transition-colors hover:bg-sunken/50">
              <TD className="whitespace-nowrap tnum">{formatDate(p.createdAt)}</TD>
              <TD className="capitalize">
                {editingId === p.id ? (
                  <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
                  </Select>
                ) : <div>{p.method.replaceAll("_", " ")}{p.notes && <div className="mt-1 max-w-48 truncate text-xs font-normal normal-case text-ink-3" title={p.notes}>{p.notes}</div>}</div>}
              </TD>
              <TD>
                {p.status === "confirmed" ? <Badge tone="success">confirmed</Badge>
                  : p.status === "rejected" ? <Badge tone="danger">rejected</Badge>
                  : <Badge tone="warning">pending confirmation</Badge>}
              </TD>
              <TD className={cx("text-right font-medium tnum", p.status === "confirmed" ? "text-success" : "text-warn")}>
                {editingId === p.id ? <Input type="number" min={p.rentalChargeId ? 0.01 : 1} step={p.rentalChargeId ? 0.01 : 1} required value={amount} disabled={Boolean(p.rentalChargeId)} title={p.rentalChargeId ? "The amount must match the linked charge" : undefined} onChange={(e) => setAmount(e.target.value)} className="ml-auto w-28 text-right" /> : formatCurrency(p.amount)}
              </TD>
              <TD className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {p.status === "pending" && canConfirm && (
                    <>
                      <Button size="sm" onClick={() => onConfirm(p.id)} disabled={busy || saving}>Confirm &amp; post</Button>
                      <Button size="sm" variant="secondary" onClick={() => onReject(p.id)} disabled={busy || saving}>Reject</Button>
                    </>
                  )}
                  {canEditPayments && editingId !== p.id && (
                    <Button size="sm" variant="secondary" onClick={() => startEdit(p)} disabled={saving}>Edit</Button>
                  )}
                  {canEditPayments && editingId === p.id && (
                    <>
                      <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes / reference" className="w-40" />
                      <Button size="sm" onClick={() => saveEdit(p.id)} disabled={saving || !amount}>{saving ? "Saving…" : "Save"}</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)} disabled={saving}>Cancel</Button>
                    </>
                  )}
                  {canEditPayments && <Button size="sm" variant="danger" onClick={() => remove(p)} disabled={saving}>Delete</Button>}
                </div>
              </TD>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

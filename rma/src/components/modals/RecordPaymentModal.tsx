"use client";

import { useState } from "react";
import { recordPayment } from "@/modules/rental/payment-actions";
import { Button, Input, Select, Label, Textarea } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";

const METHODS = ["cash", "card", "bank_transfer", "other"];

export function RecordPaymentModal({
  tenantId,
  tenantSlug,
  rentalId,
  customerName,
  maxAmount,
  onClose,
  onRecorded,
}: {
  tenantId: string;
  tenantSlug: string;
  rentalId: string;
  customerName: string | null;
  maxAmount: number;
  onClose: () => void;
  onRecorded?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    try {
      const amount = Number(fd.get("amount"));
      if (!amount || amount <= 0 || amount > maxAmount) {
        throw new Error(`Amount must be between 1 and ${maxAmount} AED`);
      }
      await recordPayment(
        tenantId,
        {
          rentalId,
          amount,
          method: String(fd.get("method")),
          notes: String(fd.get("notes") || ""),
        },
        tenantSlug
      );
      onRecorded?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Record Payment" onClose={onClose} busy={submitting} protectChanges>
      {error && <ModalError>{error}</ModalError>}

      <div className="mb-4 rounded-field border border-line bg-sunken px-3 py-2 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-2">Customer</span>
          <span className="font-medium text-ink">{customerName ?? "—"}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-ink-2">Balance due</span>
          <span className="font-medium text-danger tnum">{maxAmount.toLocaleString()} AED</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Amount (AED) *</Label>
            <Input
              name="amount"
              type="number"
              min={1}
              max={maxAmount}
              required
              className="w-full"
              placeholder="0"
            />
          </div>
          <div>
            <Label>Method *</Label>
            <Select name="method" required className="w-full">
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace("_", " ")}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea name="notes" rows={2} className="w-full" placeholder="Reference number, receipt info..." />
        </div>

        <ModalFooter>
          <ModalCancel>Cancel</ModalCancel>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Record Payment"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

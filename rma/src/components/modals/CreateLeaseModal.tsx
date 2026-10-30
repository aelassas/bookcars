"use client";

import { useMemo, useState } from "react";
import { createLease } from "@/modules/lease/actions";
import { formatCurrency } from "@/lib/format";
import { Button, Input, Select, Label, Textarea } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";

export function CreateLeaseModal({
  tenantId,
  tenantSlug,
  actorId,
  vehicles,
  customers,
  onClose,
  onCreated,
}: {
  tenantId: string;
  tenantSlug: string;
  actorId?: string;
  vehicles: { id: string; make: string; model: string; plate: string }[];
  customers: { id: string; name: string; phone: string | null }[];
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [contractRef, setContractRef] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [termMonths, setTermMonths] = useState("12");
  const [downPayment, setDownPayment] = useState("0");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [residualValue, setResidualValue] = useState("0");
  const [notes, setNotes] = useState("");

  const totalAmount = useMemo(() => {
    const down = Number(downPayment) || 0;
    const monthly = Number(monthlyPayment) || 0;
    const months = Number(termMonths) || 0;
    const residual = Number(residualValue) || 0;
    return down + monthly * months + residual;
  }, [downPayment, monthlyPayment, termMonths, residualValue]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createLease(
        tenantId,
        actorId,
        {
          customerId,
          vehicleId,
          contractRef: contractRef.trim(),
          startDate: new Date(String(startDate)),
          termMonths: Number(termMonths),
          downPayment: Number(downPayment) || 0,
          monthlyPayment: Number(monthlyPayment) || 0,
          residualValue: Number(residualValue) || 0,
          notes: notes.trim(),
        },
        tenantSlug
      );
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lease");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Create Lease-to-Own Contract" onClose={onClose} busy={submitting} protectChanges width="lg">
      {error && <ModalError>{error}</ModalError>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Customer *</Label>
            <Select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full"
            >
              <option value="">Select…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `· ${c.phone}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Vehicle *</Label>
            <Select
              required
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full"
            >
              <option value="">Select…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} · {v.make} {v.model}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Contract ref *</Label>
            <Input
              type="text"
              required
              value={contractRef}
              onChange={(e) => setContractRef(e.target.value)}
              placeholder="L-2026-001"
              className="w-full"
            />
          </div>
          <div>
            <Label>Start date *</Label>
            <Input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Term (months) *</Label>
            <Input
              type="number"
              min={1}
              required
              value={termMonths}
              onChange={(e) => setTermMonths(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label>Down payment (AED)</Label>
            <Input
              type="number"
              min={0}
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label>Residual (AED)</Label>
            <Input
              type="number"
              min={0}
              value={residualValue}
              onChange={(e) => setResidualValue(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <Label>Monthly payment (AED) *</Label>
          <Input
            type="number"
            min={1}
            required
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="rounded-field border border-line bg-sunken px-3 py-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-2">Total contract value</span>
            <span className="font-semibold text-ink tnum">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="text-xs text-ink-3 tnum">
            {formatCurrency(Number(downPayment) || 0)} down + {termMonths} × {formatCurrency(Number(monthlyPayment) || 0)} + {formatCurrency(Number(residualValue) || 0)} residual
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full"
          />
        </div>

        <ModalFooter>
          <ModalCancel>Cancel</ModalCancel>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Lease"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

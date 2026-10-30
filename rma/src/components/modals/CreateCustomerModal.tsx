"use client";

import { useId, useState } from "react";
import { createCustomer, updateCustomer } from "@/modules/crm/customer-actions";
import { Button, Input, Select, Label, Textarea } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";

const SOURCES = ["whatsapp", "instagram", "facebook", "localrent", "yango", "walk_in"];
const DIVISIONS = ["rent", "lease"];

export type EditableCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  division: string;
  source: string | null;
  notes: string | null;
};

export function CreateCustomerModal({
  tenantId,
  onClose,
  onCreated,
  customer,
}: {
  tenantId: string;
  onClose: () => void;
  onCreated?: () => void;
  customer?: EditableCustomer;
}) {
  const fieldId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    try {
      const data = {
        name: String(fd.get("name")).trim(),
        phone: String(fd.get("phone") || ""),
        email: String(fd.get("email") || ""),
        division: String(fd.get("division") || "rent"),
        source: String(fd.get("source") || ""),
        notes: String(fd.get("notes") || ""),
      };
      if (customer) await updateCustomer(tenantId, customer.id, data);
      else await createCustomer(tenantId, data);
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not save customer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={customer ? "Edit customer" : "Add customer"} onClose={onClose} busy={submitting} protectChanges>
      {error && <ModalError>{error}</ModalError>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor={`${fieldId}-name`}>Name *</Label>
          <Input id={`${fieldId}-name`} name="name" required defaultValue={customer?.name} autoComplete="name" className="w-full" placeholder="Customer name" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${fieldId}-phone`}>Phone</Label>
            <Input id={`${fieldId}-phone`} name="phone" type="tel" defaultValue={customer?.phone ?? ""} autoComplete="tel" className="w-full" placeholder="+971..." />
          </div>
          <div>
            <Label htmlFor={`${fieldId}-email`}>Email</Label>
            <Input id={`${fieldId}-email`} name="email" type="email" defaultValue={customer?.email ?? ""} autoComplete="email" className="w-full" placeholder="email@example.com" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${fieldId}-source`}>Source</Label>
            <Select id={`${fieldId}-source`} name="source" defaultValue={customer?.source ?? ""} className="w-full">
              <option value="">Select source...</option>
              {customer?.source && !SOURCES.includes(customer.source) && <option value={customer.source}>{customer.source}</option>}
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s === "walk_in" ? "Walk-in" : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`${fieldId}-division`}>Division</Label>
            <Select id={`${fieldId}-division`} name="division" defaultValue={customer?.division ?? "rent"} className="w-full">
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d === "rent" ? "Rental" : "Leasing"}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor={`${fieldId}-notes`}>Notes</Label>
          <Textarea id={`${fieldId}-notes`} name="notes" defaultValue={customer?.notes ?? ""} rows={3} className="w-full" placeholder="Any additional info..." />
        </div>

        <ModalFooter>
          <ModalCancel />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : customer ? "Save changes" : "Add customer"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

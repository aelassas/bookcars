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
  dateOfBirth?: string | null;
  nationality?: string | null;
  emiratesId?: string | null;
  emiratesIdExpiry?: string | null;
  passportNumber?: string | null;
  driverLicenseNumber?: string | null;
  driverLicenseExpiry?: string | null;
};

export function CreateCustomerModal({
  tenantId,
  onClose,
  onCreated,
  customer,
}: {
  tenantId: string;
  onClose: () => void;
  onCreated?: (customer: { id: string; name: string }) => void;
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
        dateOfBirth: String(fd.get("dateOfBirth") || ""),
        nationality: String(fd.get("nationality") || ""),
        emiratesId: String(fd.get("emiratesId") || ""),
        emiratesIdExpiry: String(fd.get("emiratesIdExpiry") || ""),
        passportNumber: String(fd.get("passportNumber") || ""),
        driverLicenseNumber: String(fd.get("driverLicenseNumber") || ""),
        driverLicenseExpiry: String(fd.get("driverLicenseExpiry") || ""),
      };
      const saved = customer
        ? await updateCustomer(tenantId, customer.id, data)
        : await createCustomer(tenantId, data);
      onCreated?.({ id: saved.id, name: saved.name });
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor={`${fieldId}-emiratesId`}>Emirates ID</Label><Input id={`${fieldId}-emiratesId`} name="emiratesId" defaultValue={customer?.emiratesId ?? ""} className="w-full" /></div>
          <div><Label htmlFor={`${fieldId}-emiratesIdExpiry`}>Emirates ID expiry</Label><Input id={`${fieldId}-emiratesIdExpiry`} name="emiratesIdExpiry" type="date" defaultValue={customer?.emiratesIdExpiry ?? ""} className="w-full" /></div>
          <div><Label htmlFor={`${fieldId}-passportNumber`}>Passport number</Label><Input id={`${fieldId}-passportNumber`} name="passportNumber" defaultValue={customer?.passportNumber ?? ""} className="w-full" /></div>
          <div><Label htmlFor={`${fieldId}-driverLicenseNumber`}>Driving licence number</Label><Input id={`${fieldId}-driverLicenseNumber`} name="driverLicenseNumber" defaultValue={customer?.driverLicenseNumber ?? ""} className="w-full" /></div>
          <div><Label htmlFor={`${fieldId}-driverLicenseExpiry`}>Licence expiry</Label><Input id={`${fieldId}-driverLicenseExpiry`} name="driverLicenseExpiry" type="date" defaultValue={customer?.driverLicenseExpiry ?? ""} className="w-full" /></div>
          <div><Label htmlFor={`${fieldId}-nationality`}>Nationality</Label><Input id={`${fieldId}-nationality`} name="nationality" defaultValue={customer?.nationality ?? ""} className="w-full" /></div>
          <div><Label htmlFor={`${fieldId}-dateOfBirth`}>Date of birth</Label><Input id={`${fieldId}-dateOfBirth`} name="dateOfBirth" type="date" defaultValue={customer?.dateOfBirth ?? ""} className="w-full" /></div>
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

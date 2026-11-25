"use client";

import { useState } from "react";
import { createLead } from "@/modules/crm/actions";
import { Button, Input, Select, Label, Textarea } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";

const SOURCES = ["whatsapp", "instagram", "facebook", "localrent", "yango", "walk_in"];

export function CreateLeadModal({
  tenantId,
  onClose,
  onCreated,
}: {
  tenantId: string;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    try {
      await createLead(tenantId, {
        customerName: String(fd.get("customerName")),
        phone: String(fd.get("phone") || ""),
        email: String(fd.get("email") || ""),
        source: String(fd.get("source") || ""),
        notes: String(fd.get("notes") || ""),
      });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Failed to create lead");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Create Lead" onClose={onClose} busy={submitting} protectChanges>
      {error && <ModalError>{error}</ModalError>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Name *</Label>
          <Input name="customerName" required className="w-full" placeholder="Customer name" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Phone</Label>
            <Input name="phone" type="tel" className="w-full" placeholder="+971..." />
          </div>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" className="w-full" placeholder="email@example.com" />
          </div>
        </div>

        <div>
          <Label>Source</Label>
          <Select name="source" className="w-full">
            <option value="">Select source...</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea name="notes" rows={3} className="w-full" placeholder="Any additional info..." />
        </div>

        <ModalFooter>
          <ModalCancel>Cancel</ModalCancel>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Lead"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

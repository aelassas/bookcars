"use client";

import { useState } from "react";
import { createDeal } from "@/modules/crm/actions";
import { Button, Input, Select, Label, Textarea } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";
import { LeadSearch } from "@/components/ui/LeadSearch";

const TYPES = ["rent", "lease", "purchase"];
const STAGES = ["inquiry", "quote", "contract", "handover", "closed"];

export function CreateDealModal({
  tenantId,
  defaultStage,
  onClose,
  onCreated,
}: {
  tenantId: string;
  defaultStage?: string;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    try {
      await createDeal(tenantId, {
        ref: String(fd.get("ref")),
        type: String(fd.get("type")) as "rent" | "lease" | "purchase",
        leadId: leadId || undefined,
        stage: String(fd.get("stage")) as "inquiry" | "quote" | "contract" | "handover" | "closed",
        value: Number(fd.get("value")) || undefined,
        notes: String(fd.get("notes") || ""),
      });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Create Deal" onClose={onClose} busy={submitting} protectChanges>
      {error && <ModalError>{error}</ModalError>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Reference *</Label>
          <Input name="ref" required className="w-full" placeholder="Deal reference" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type *</Label>
            <Select name="type" required className="w-full">
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Stage</Label>
            <Select name="stage" defaultValue={defaultStage ?? "inquiry"} className="w-full">
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label>Value (AED)</Label>
          <Input name="value" type="number" min={0} className="w-full" placeholder="0" />
        </div>

        <div>
          <Label>Linked Lead</Label>
          <LeadSearch
            tenantId={tenantId}
            value={leadId}
            onChange={(id) => setLeadId(id)}
            placeholder="Search leads…"
          />
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea name="notes" rows={3} className="w-full" placeholder="Any additional info..." />
        </div>

        <ModalFooter>
          <ModalCancel>Cancel</ModalCancel>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Deal"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

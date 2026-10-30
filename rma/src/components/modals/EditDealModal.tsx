"use client";

import { useState } from "react";
import { updateDeal, deleteDeal, closeDeal } from "@/modules/crm/actions";
import { Button, Input, Select, Label, Textarea } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";
import { LeadSearch } from "@/components/ui/LeadSearch";

const TYPES = ["rent", "lease", "purchase"];
const STAGES = ["inquiry", "quote", "contract", "handover", "closed"];

const DANGER_OUTLINE_BTN =
  "inline-flex h-9 select-none items-center justify-center whitespace-nowrap rounded-field border border-danger-line bg-surface px-3.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50";
const SUCCESS_BTN =
  "inline-flex h-9 select-none items-center justify-center whitespace-nowrap rounded-field bg-success px-3.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

export function EditDealModal({
  tenantId,
  deal,
  onClose,
  onUpdated,
}: {
  tenantId: string;
  deal: {
    id: string;
    ref: string;
    type: "rent" | "lease" | "purchase";
    stage: string;
    status: string;
    value: number | null;
    notes: string | null;
    leadId: string | null;
  };
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState(deal.leadId ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    try {
      await updateDeal(tenantId, deal.id, {
        ref: String(fd.get("ref")),
        type: String(fd.get("type")) as "rent" | "lease" | "purchase",
        stage: String(fd.get("stage")) as "inquiry" | "quote" | "contract" | "handover" | "closed",
        value: fd.get("value") === "" ? null : Number(fd.get("value")),
        leadId: leadId || null,
        notes: String(fd.get("notes") || ""),
      });
      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update deal");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this deal? This cannot be undone.")) return;
    setSubmitting(true);
    try {
      await deleteDeal(tenantId, deal.id);
      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete deal");
      setSubmitting(false);
    }
  }

  async function handleClose(outcome: "won" | "lost") {
    setSubmitting(true);
    try {
      await closeDeal(tenantId, deal.id, outcome);
      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close deal");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Deal" onClose={onClose} busy={submitting} protectChanges hasChanges={leadId !== (deal.leadId ?? "")}>
      {error && <ModalError>{error}</ModalError>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Reference *</Label>
          <Input name="ref" required defaultValue={deal.ref} className="w-full" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type *</Label>
            <Select name="type" required defaultValue={deal.type} className="w-full">
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Stage *</Label>
            <Select name="stage" required defaultValue={deal.stage} className="w-full">
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Value (AED)</Label>
            <Input name="value" type="number" min={0} defaultValue={deal.value ?? ""} className="w-full" />
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
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea name="notes" rows={3} defaultValue={deal.notes ?? ""} className="w-full" />
        </div>

        <ModalFooter className="justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className={DANGER_OUTLINE_BTN}
          >
            Delete
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {deal.status === "open" && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleClose("lost")}
                  disabled={submitting}
                >
                  Mark lost
                </Button>
                <button
                  type="button"
                  onClick={() => handleClose("won")}
                  disabled={submitting}
                  className={SUCCESS_BTN}
                >
                  Mark won
                </button>
              </>
            )}
            <ModalCancel>Cancel</ModalCancel>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  );
}

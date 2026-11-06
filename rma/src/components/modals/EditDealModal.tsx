"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { updateDeal, deleteDeal, closeDeal } from "@/modules/crm/actions";
import type { KanbanDeal } from "@/modules/crm/queries";
import { Button, Input, Select, Label, Textarea } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";
import { LeadSearch } from "@/components/ui/LeadSearch";
import { rentalWindow } from "@/components/crm/pipeline-utils";
import { dealStageOptions, type DealStage } from "@/modules/crm/stages";

const TYPES = ["rent", "lease", "purchase"];

const DANGER_OUTLINE_BTN =
  "inline-flex h-9 select-none items-center justify-center whitespace-nowrap rounded-field border border-danger-line bg-surface px-3.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50";
const SUCCESS_BTN =
  "inline-flex h-9 select-none items-center justify-center whitespace-nowrap rounded-field bg-success px-3.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

export function EditDealModal({
  tenantId,
  tenantSlug,
  deal,
  onClose,
  onUpdated,
}: {
  tenantId: string;
  tenantSlug: string;
  deal: KanbanDeal;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState(deal.leadId ?? "");
  const window = rentalWindow(deal.dateFrom, deal.dateTo);
  const hasRentalContext = deal.customerName || deal.phone || deal.requestedCar || window || deal.aiNote;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    try {
      await updateDeal(tenantId, deal.id, {
        ref: String(fd.get("ref")),
        type: String(fd.get("type")) as "rent" | "lease" | "purchase",
        stage: String(fd.get("stage")) as DealStage,
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
    <Modal
      title={deal.customerName?.trim() || "Edit deal"}
      subtitle={`${deal.ref} · Quick edit`}
      onClose={onClose}
      busy={submitting}
      protectChanges
      hasChanges={leadId !== (deal.leadId ?? "")}
    >
      {error && <ModalError>{error}</ModalError>}

      {hasRentalContext && (
        <section className="mb-4 rounded-field border border-line bg-sunken/60 p-3" aria-label="Rental request">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-3">Rental request</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {deal.phone && <div><dt className="text-ink-3">Customer</dt><dd className="mt-0.5 text-ink tnum">{deal.phone}</dd></div>}
            {(deal.requestedCar || deal.vehicleLabel) && <div><dt className="text-ink-3">Car</dt><dd className="mt-0.5 font-medium text-ink">{deal.requestedCar || deal.vehicleLabel}</dd></div>}
            {window && <div><dt className="text-ink-3">Dates</dt><dd className="mt-0.5 text-ink">{window}</dd></div>}
            {deal.ownerName && <div><dt className="text-ink-3">Owner</dt><dd className="mt-0.5 text-ink">{deal.ownerName}</dd></div>}
          </dl>
          {deal.aiNote && (
            <div className="mt-3 flex items-start gap-1.5 border-t border-line-soft pt-2 text-xs text-ink-2">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-brand-500" />
              <span>{deal.aiNote}</span>
            </div>
          )}
        </section>
      )}

      <Link
        href={`/${tenantSlug}/deals/${deal.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800"
      >
        Open full deal and WhatsApp conversation
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>

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
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Stage *</Label>
            <Select name="stage" required defaultValue={deal.stage} className="w-full">
              {dealStageOptions(tenantSlug).map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
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
            <LeadSearch tenantId={tenantId} value={leadId} onChange={(id) => setLeadId(id)} placeholder="Search leads…" />
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea name="notes" rows={3} defaultValue={deal.notes ?? ""} className="w-full" />
        </div>

        <ModalFooter className="justify-between">
          <button type="button" onClick={handleDelete} disabled={submitting} className={DANGER_OUTLINE_BTN}>Delete</button>
          <div className="flex flex-wrap items-center gap-2">
            {deal.status === "open" && (
              <>
                <Button type="button" variant="secondary" onClick={() => handleClose("lost")} disabled={submitting}>Mark lost</Button>
                <button type="button" onClick={() => handleClose("won")} disabled={submitting} className={SUCCESS_BTN}>Mark won</button>
              </>
            )}
            <ModalCancel>Cancel</ModalCancel>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  );
}

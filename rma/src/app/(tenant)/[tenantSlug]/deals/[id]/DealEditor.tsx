"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDeal, updateDealStage, detachVehicleFromDeal, setDealIntent } from "@/modules/crm/actions";
import { INTENT_ORDER, INTENT_LABELS, effectiveIntent, isExplicit, type Intent } from "@/modules/crm/intent";
import { getRentVehicles } from "@/modules/rental/queries";
import { CreateRentalModal } from "@/components/modals/CreateRentalModal";
import { CarFinder } from "@/components/crm/CarFinder";
import {
  Card,
  CardHeader,
  Button,
  Input,
  Select,
  Textarea,
  Label,
  Badge,
  cx,
  STAGE_CLS,
} from "@/components/ui";
import { CalendarPlus, Car, X } from "lucide-react";
import { LeadSearch } from "@/components/ui/LeadSearch";

type VehicleOption = { id: string; make: string; model: string; plate: string; dailyRate?: number };

const STAGES = ["inquiry", "quote", "contract", "handover", "closed"] as const;
type Stage = (typeof STAGES)[number];
type DealType = "rent" | "lease" | "purchase";
type DealStatus = "open" | "won" | "lost";

type DealFields = {
  id: string;
  ref: string;
  type: string;
  status: string;
  stage: string;
  stageDetail: string | null;
  intent: string | null;
  value: number | null;
  balanceDue: number;
  notes: string | null;
  leadId: string | null;
};

type AttachedVehicle = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  plate: string;
  status: string;
} | null;

export default function DealEditor({
  tenantId,
  tenantSlug,
  actorId,
  deal,
  attachedVehicle,
}: {
  tenantId: string;
  tenantSlug: string;
  actorId?: string;
  deal: DealFields;
  attachedVehicle?: AttachedVehicle;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stagePending, setStagePending] = useState<Stage | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFinder, setShowFinder] = useState(false);
  const [detaching, startDetach] = useTransition();

  const [type, setType] = useState(deal.type);
  const [status, setStatus] = useState(deal.status);
  const [stage, setStage] = useState(deal.stage);
  const [value, setValue] = useState(deal.value != null ? String(deal.value) : "");
  const [balanceDue, setBalanceDue] = useState(String(deal.balanceDue));
  const [notes, setNotes] = useState(deal.notes ?? "");
  const [leadId, setLeadId] = useState(deal.leadId ?? "");

  // ── Customer intent (Watchers board) ──────────────────────────────────────
  // `intent` is the explicit tag (null until a manager picks one); `derived` is
  // the heuristic fallback the board would use meanwhile. The picker highlights
  // whichever is in effect and marks the derived one with "(авто)".
  const [intent, setIntentState] = useState<string | null>(deal.intent);
  const [intentPending, setIntentPending] = useState<string | null>(null);
  const derivedIntent = effectiveIntent({
    intent: deal.intent,
    ref: deal.ref,
    notes,
    stageDetail: deal.stageDetail,
    type,
  });
  const explicit = isExplicit(intent);
  const activeIntent: Intent = isExplicit(intent) ? (intent as Intent) : derivedIntent;

  async function handleIntentClick(next: Intent | null) {
    if (intentPending) return;
    setError(null);
    setIntentPending(next ?? "__clear__");
    try {
      await setDealIntent(tenantId, deal.id, next);
      setIntentState(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save intent.");
    } finally {
      setIntentPending(null);
    }
  }

  // "Create booking from deal" — opens CreateRentalModal pre-linked to this deal.
  const [showBooking, setShowBooking] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);

  useEffect(() => {
    if (showBooking) {
      getRentVehicles(tenantId)
        .then((v) => {
          setVehicles(v as VehicleOption[]);
        })
        .catch((e) =>
          setError(e instanceof Error ? e.message : "Failed to load vehicles.")
        );
    }
  }, [showBooking, tenantId]);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateDeal(tenantId, deal.id, {
          type: type as DealType,
          status: status as DealStatus,
          stage: stage as Stage,
          value: value.trim() === "" ? null : Number(value),
          balanceDue: balanceDue.trim() === "" ? 0 : Number(balanceDue),
          notes: notes.trim() === "" ? null : notes,
          leadId: leadId === "" ? null : leadId,
        });
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save deal.");
      }
    });
  }

  async function handleStageClick(s: Stage) {
    if (s === stage || stagePending) return;
    setError(null);
    setSaved(false);
    setStagePending(s);
    try {
      await updateDealStage(tenantId, deal.id, s);
      setStage(s);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update stage.");
    } finally {
      setStagePending(null);
    }
  }

  function handleDetach() {
    setError(null);
    startDetach(async () => {
      try {
        await detachVehicleFromDeal(tenantId, deal.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to detach vehicle.");
      }
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {showBooking && (
        <CreateRentalModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          actorId={actorId}
          vehicles={vehicles}
          dealId={deal.id}
          leadId={deal.leadId ?? undefined}
          initialVehicleId={attachedVehicle?.id}
          onClose={() => setShowBooking(false)}
          onCreated={() => {
            setShowBooking(false);
            router.push(`/${tenantSlug}/rentals`);
          }}
        />
      )}

      {showFinder && (
        <CarFinder
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          dealId={deal.id}
          defaultQuery={deal.ref}
          attachedVehicleId={attachedVehicle?.id ?? null}
          onClose={() => setShowFinder(false)}
        />
      )}

      {/* Attached car ("Подбор авто" result) — the actual vehicle being offered. */}
      <Card className="overflow-hidden">
        <CardHeader title="Car match" />
        <div className="flex flex-wrap items-center gap-3 p-4">
          {attachedVehicle ? (
            <>
              <a
                href={`/${tenantSlug}/fleet/${attachedVehicle.id}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:underline"
              >
                <Car className="h-4 w-4 text-ink-3" />
                {`${attachedVehicle.make} ${attachedVehicle.model}`.trim()}
                {attachedVehicle.year ? ` · ${attachedVehicle.year}` : ""}
              </a>
              {attachedVehicle.plate ? (
                <span className="font-mono text-xs text-ink-3">{attachedVehicle.plate}</span>
              ) : (
                <span className="text-xs text-ink-3">no plate</span>
              )}
              <Badge tone="info">{attachedVehicle.status}</Badge>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowFinder(true)}>
                  Replace
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDetach} disabled={detaching}>
                  <X className="h-4 w-4" /> {detaching ? "…" : "Detach"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <span className="text-sm text-ink-3">No car selected yet.</span>
              <Button className="ml-auto" variant="secondary" onClick={() => setShowFinder(true)}>
                <Car className="h-4 w-4" /> Find a car
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Customer intent — the fast picker that feeds the Watchers board. */}
      <Card className="overflow-hidden">
        <CardHeader title="Customer intent" />
        <div className="flex flex-wrap items-center gap-2 p-4">
          {INTENT_ORDER.map((k) => {
            const active = activeIntent === k;
            const isDerived = active && !explicit;
            return (
              <button
                key={k}
                type="button"
                onClick={() => handleIntentClick(k)}
                disabled={intentPending !== null}
                title={INTENT_LABELS[k].hint}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-field border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                  active
                    ? isDerived
                      ? "border-dashed border-brand-400 bg-brand-50/60 text-brand-700"
                      : "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-line bg-surface text-ink-2 hover:bg-sunken hover:text-ink"
                )}
              >
                {intentPending === k ? "…" : INTENT_LABELS[k].short}
                {isDerived && <span className="text-[10px] font-normal text-ink-3">(auto)</span>}
              </button>
            );
          })}
          {explicit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleIntentClick(null)}
              disabled={intentPending !== null}
            >
              <X className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>
        {!explicit && (
          <p className="border-t border-line-soft px-4 py-2 text-xs text-ink-3">
            No tag set — on the Watchers board this deal is filed under «{INTENT_LABELS[derivedIntent].short}»
            by heuristic. Click to confirm.
          </p>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Pipeline stage" />
        <div className="flex flex-wrap gap-2 p-4">
          {STAGES.map((s) => {
            const active = s === stage;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleStageClick(s)}
                disabled={stagePending !== null}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-field border px-3 py-1.5 text-sm font-medium capitalize transition-colors disabled:cursor-not-allowed",
                  active
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-line bg-surface text-ink-2 hover:bg-sunken hover:text-ink"
                )}
              >
                <span className={cx("h-2 w-2 rounded-full", STAGE_CLS[s])} />
                {stagePending === s ? "Moving…" : s}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Deal details" />
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="deal-type">Type</Label>
            <Select
              id="deal-type"
              className="w-full"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="rent">Rent</option>
              <option value="lease">Lease</option>
              <option value="purchase">Purchase</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="deal-status">Status</Label>
            <Select
              id="deal-status"
              className="w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="deal-stage">Stage</Label>
            <Select
              id="deal-stage"
              className="w-full"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="deal-value">Value (AED)</Label>
            <Input
              id="deal-value"
              className="w-full"
              type="number"
              min={0}
              placeholder="—"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="deal-balance">Balance due (AED)</Label>
            <Input
              id="deal-balance"
              className="w-full"
              type="number"
              min={0}
              value={balanceDue}
              onChange={(e) => setBalanceDue(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="deal-lead">Lead</Label>
            <LeadSearch
              tenantId={tenantId}
              value={leadId}
              onChange={(id) => setLeadId(id)}
              placeholder="Search leads…"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label htmlFor="deal-notes">Notes</Label>
            <Textarea
              id="deal-notes"
              className="w-full"
              rows={3}
              placeholder="Notes about this deal…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-line-soft px-4 py-3">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
          <Button variant="secondary" onClick={() => setShowBooking(true)}>
            <CalendarPlus className="h-4 w-4" /> Create booking
          </Button>
          {saved && !isPending && <span className="text-sm text-success">Saved.</span>}
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      </Card>
    </div>
  );
}

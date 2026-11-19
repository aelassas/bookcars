"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";
import { recordVehicleService } from "@/modules/fleet/service-actions";
import { nextServiceLimitOdometer, serviceState } from "@/modules/fleet/maintenance";
import { Badge, Button, Input, Label, Select, Textarea, cx } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";
import { t, type Lang } from "@/platform/i18n/dict";

export interface ServiceHistoryItem {
  id: string;
  type: string;
  startsAt: Date | string;
  title: string | null;
  meta: Record<string, unknown> | null;
}

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function VehicleServicePanel({ tenantSlug, tenantId, vehicleId, currentOdometer, nextServiceDate, nextServiceOdometer, oilChangeIntervalKm, serviceLimitIntervalKm, lastServiceDate, lastServiceOdometer, lastServiceWork, history, lang }: {
  tenantSlug: string;
  tenantId: string;
  vehicleId: string;
  currentOdometer: number;
  nextServiceDate: string | null;
  nextServiceOdometer: number | null;
  oilChangeIntervalKm: number;
  serviceLimitIntervalKm: number;
  lastServiceDate: string | null;
  lastServiceOdometer: number | null;
  lastServiceWork: string | null;
  history: ServiceHistoryItem[];
  lang: Lang;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const service = serviceState({ currentOdometer, lastServiceOdometer, nextServiceOdometer, warningIntervalKm: oilChangeIntervalKm, limitIntervalKm: serviceLimitIntervalKm });
  const overdue = service.status === "due" || (nextServiceDate != null && nextServiceDate < todayISO());
  const dueSoon = overdue || service.status === "due_soon" || (nextServiceDate != null && nextServiceDate <= new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10));

  return (
    <section className="mb-5 rounded-card border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
        <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-ink-3" /><span className="text-xs font-semibold uppercase tracking-wider text-ink-2">{t(lang, "service.title")}</span>{dueSoon && <Badge tone={overdue ? "danger" : "warning"}>{overdue ? t(lang, "service.overdue") : t(lang, "service.dueSoon")}</Badge>}</div>
        <Button variant="secondary" size="sm" onClick={() => setLogOpen(true)}>{t(lang, "service.log")}</Button>
      </div>
      <div className="grid gap-4 px-4 py-3 sm:grid-cols-3">
        <div className={cx("rounded-field border px-3 py-2.5", dueSoon ? overdue ? "border-danger-line bg-danger-soft" : "border-warn-line bg-warn-soft" : "border-line bg-sunken/40")}>
          <div className="text-xs font-medium text-ink-3">Last oil / filter service</div>
          <div className="mt-1 text-sm font-medium text-ink">{lastServiceDate ? fmtDate(lastServiceDate) : "Not recorded"}{lastServiceOdometer != null ? ` · ${lastServiceOdometer.toLocaleString()} km` : ""}</div>
          {lastServiceWork && <div className="mt-1 text-xs text-ink-2">{lastServiceWork}</div>}
          <div className="mt-2 text-xs text-ink-3">Warning: {oilChangeIntervalKm.toLocaleString()} km · limit: {serviceLimitIntervalKm.toLocaleString()} km</div>
          <div className="mt-1 text-sm font-medium text-ink">{service.remainingKm == null ? "Set a service baseline" : `${service.remainingKm.toLocaleString()} km left before service`}</div>
          {nextServiceDate && <div className="mt-1 text-xs text-ink-3">Planned date: {fmtDate(nextServiceDate)}</div>}
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs font-medium text-ink-3">{t(lang, "service.history")}</div>
          {history.length === 0 ? <div className="mt-1 text-sm text-ink-3">{t(lang, "service.empty")}</div> : <ul className="mt-1 divide-y divide-line-soft">{history.map((event) => {
            const odometer = typeof event.meta?.odometer === "number" ? event.meta.odometer : null;
            const cost = typeof event.meta?.costAed === "number" ? event.meta.costAed : null;
            const category = typeof event.meta?.category === "string" ? event.meta.category : null;
            return <li key={event.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5 text-sm"><span className="tnum shrink-0 text-ink-2">{fmtDate(event.startsAt)}</span>{category && <span className="shrink-0 text-xs text-ink-3">{t(lang, `service.category.${category}`)}</span>}<span className="min-w-0 flex-1 truncate text-ink">{event.title ?? "—"}</span>{odometer != null && <span className="tnum shrink-0 text-xs text-ink-3">{odometer.toLocaleString()} km</span>}{cost != null && <span className="tnum shrink-0 text-xs text-ink-3">{cost} AED</span>}</li>;
          })}</ul>}
        </div>
      </div>
      {logOpen && <LogServiceModal tenantSlug={tenantSlug} tenantId={tenantId} vehicleId={vehicleId} currentOdometer={currentOdometer} serviceLimitIntervalKm={serviceLimitIntervalKm} lang={lang} onClose={() => setLogOpen(false)} />}
    </section>
  );
}

function LogServiceModal({ tenantSlug, tenantId, vehicleId, currentOdometer, serviceLimitIntervalKm, lang, onClose }: {
  tenantSlug: string;
  tenantId: string;
  vehicleId: string;
  currentOdometer: number;
  serviceLimitIntervalKm: number;
  lang: Lang;
  onClose: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(event.currentTarget);
    const odometerText = String(fd.get("odometer")).trim();
    const costText = String(fd.get("cost")).trim();
    const nextOdometerText = String(fd.get("nextServiceOdometer")).trim();
    try {
      await recordVehicleService(tenantId, tenantSlug, {
        vehicleId,
        date: String(fd.get("date")),
        odometer: odometerText ? Number(odometerText) : null,
        category: String(fd.get("category") || "service"),
        description: String(fd.get("description")).trim(),
        costAed: costText ? Number(costText) : null,
        nextServiceDate: String(fd.get("nextServiceDate") || "") || null,
        nextServiceOdometer: nextOdometerText ? Number(nextOdometerText) : null,
      });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t(lang, "service.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t(lang, "service.logTitle")} onClose={onClose} busy={submitting} protectChanges width="lg">
      {error && <ModalError>{error}</ModalError>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label>{t(lang, "service.category")} *</Label><Select name="category" required defaultValue="oil_change" className="w-full">{["oil_change", "service", "parking", "polishing", "other"].map((category) => <option key={category} value={category}>{t(lang, `service.category.${category}`)}</option>)}</Select></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>{t(lang, "service.date")} *</Label><Input name="date" type="date" required defaultValue={todayISO()} className="w-full" /></div><div><Label>{t(lang, "vehicle.odometer")}</Label><Input name="odometer" type="number" min={0} step={1} defaultValue={currentOdometer} className="w-full" /></div></div>
        <div><Label>{t(lang, "service.description")} *</Label><Textarea name="description" required rows={2} className="w-full" placeholder="Oil, oil filter, air filter, fuel filter…" /></div>
        <div><Label>{t(lang, "service.cost")}</Label><Input name="cost" type="number" min={0} step={0.01} className="w-full" /></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>{t(lang, "vehicle.nextServiceDate")}</Label><Input name="nextServiceDate" type="date" className="w-full" /></div><div><Label>{t(lang, "vehicle.nextServiceOdometer")}</Label><Input name="nextServiceOdometer" type="number" min={0} step={1} placeholder={`Auto: service odometer + ${serviceLimitIntervalKm} km`} className="w-full" /></div></div>
        <p className="text-xs text-ink-3">Oil/service records reset the countdown. Example: {currentOdometer.toLocaleString()} km now → service limit {nextServiceLimitOdometer(currentOdometer, serviceLimitIntervalKm).toLocaleString()} km.</p>
        <ModalFooter><ModalCancel>{t(lang, "vehicle.cancel")}</ModalCancel><Button type="submit" disabled={submitting}>{submitting ? t(lang, "vehicle.saving") : t(lang, "vehicle.save")}</Button></ModalFooter>
      </form>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";
import { addTimelineEvent } from "@/modules/fleet/timeline-actions";
import { updateVehicle } from "@/modules/fleet/actions";
import { Badge, Button, Input, Label, Textarea, cx } from "@/components/ui";
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
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Service panel for the vehicle profile: planned next service (with a
 * due/overdue highlight), the service history from the timeline, and the
 * "Log service" form, which writes a service timeline event and — when
 * filled — the car's next planned service.
 */
export function VehicleServicePanel({
  tenantSlug,
  tenantId,
  vehicleId,
  currentOdometer,
  nextServiceDate,
  nextServiceOdometer,
  history,
  lang,
}: {
  tenantSlug: string;
  tenantId: string;
  vehicleId: string;
  currentOdometer: number;
  nextServiceDate: string | null;
  nextServiceOdometer: number | null;
  history: ServiceHistoryItem[];
  lang: Lang;
}) {
  const [logOpen, setLogOpen] = useState(false);

  const today = startOfDay(new Date());
  const plannedDate = nextServiceDate ? new Date(nextServiceDate) : null;
  const odometerReached = nextServiceOdometer != null && nextServiceOdometer <= currentOdometer;
  const datePassed = plannedDate != null && plannedDate < today;
  const overdue = odometerReached || datePassed;
  // Due soon: date today or within 7 days (or odometer already reached).
  const dueSoon = overdue || (plannedDate != null && plannedDate <= addDays(today, 7));
  const planned = plannedDate != null || nextServiceOdometer != null;

  return (
    <section className="mb-5 rounded-card border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-ink-3">
            <Wrench className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
            {t(lang, "service.title")}
          </span>
          {dueSoon && (
            <Badge tone={overdue ? "danger" : "warning"}>
              {overdue ? t(lang, "service.overdue") : t(lang, "service.dueSoon")}
            </Badge>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setLogOpen(true)}>
          {t(lang, "service.log")}
        </Button>
      </div>

      <div className="grid gap-4 px-4 py-3 sm:grid-cols-3">
        {/* Planned next service */}
        <div
          className={cx(
            "rounded-field border px-3 py-2.5",
            dueSoon
              ? overdue
                ? "border-danger-line bg-danger-soft"
                : "border-warn-line bg-warn-soft"
              : "border-line bg-sunken/40",
          )}
        >
          <div className="text-xs font-medium text-ink-3">{t(lang, "service.planned")}</div>
          {planned ? (
            <div className="mt-1 text-sm font-medium text-ink">
              {plannedDate ? fmtDate(plannedDate) : "—"}
              {nextServiceOdometer != null && (
                <span className="text-ink-2">
                  {" "}
                  · {t(lang, "service.atOdometer")}{" "}
                  <span className="tnum">{nextServiceOdometer.toLocaleString("en-GB")}</span>{" "}
                  {t(lang, "service.km")}
                </span>
              )}
            </div>
          ) : (
            <div className="mt-1 text-sm text-ink-3">{t(lang, "service.notPlanned")}</div>
          )}
        </div>

        {/* History */}
        <div className="sm:col-span-2">
          <div className="text-xs font-medium text-ink-3">{t(lang, "service.history")}</div>
          {history.length === 0 ? (
            <div className="mt-1 text-sm text-ink-3">{t(lang, "service.empty")}</div>
          ) : (
            <ul className="mt-1 divide-y divide-line-soft">
              {history.map((ev) => {
                const odo = typeof ev.meta?.odometer === "number" ? ev.meta.odometer : null;
                const cost = typeof ev.meta?.costAed === "number" ? ev.meta.costAed : null;
                return (
                  <li key={ev.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5 text-sm">
                    <span className="tnum shrink-0 text-ink-2">{fmtDate(ev.startsAt)}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{ev.title ?? "—"}</span>
                    {odo != null && (
                      <span className="tnum shrink-0 text-xs text-ink-3">
                        {odo.toLocaleString("en-GB")} {t(lang, "service.km")}
                      </span>
                    )}
                    {cost != null && (
                      <span className="tnum shrink-0 text-xs text-ink-3">{cost} AED</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {logOpen && (
        <LogServiceModal
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          vehicleId={vehicleId}
          currentOdometer={currentOdometer}
          lang={lang}
          onClose={() => setLogOpen(false)}
        />
      )}
    </section>
  );
}

function LogServiceModal({
  tenantSlug,
  tenantId,
  vehicleId,
  currentOdometer,
  lang,
  onClose,
}: {
  tenantSlug: string;
  tenantId: string;
  vehicleId: string;
  currentOdometer: number;
  lang: Lang;
  onClose: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const date = String(fd.get("date"));
    const odometer = Number(fd.get("odometer")) || null;
    const description = String(fd.get("description")).trim();
    const cost = Number(fd.get("cost")) || null;
    const nextServiceDate = String(fd.get("nextServiceDate") ?? "") || null;
    const nextServiceOdometer = Number(fd.get("nextServiceOdometer")) || null;

    try {
      await addTimelineEvent(tenantSlug, {
        vehicleId,
        type: "service",
        startsAt: date,
        status: "done",
        title: description,
        meta: {
          ...(odometer != null ? { odometer } : {}),
          ...(cost != null ? { costAed: cost } : {}),
        },
      });
      if (nextServiceDate || nextServiceOdometer != null) {
        await updateVehicle(tenantId, vehicleId, { nextServiceDate, nextServiceOdometer });
      }
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t(lang, "service.date")} *</Label>
            <Input name="date" type="date" required defaultValue={todayISO()} className="w-full" />
          </div>
          <div>
            <Label>{t(lang, "vehicle.odometer")}</Label>
            <Input
              name="odometer"
              type="number"
              min={0}
              step={1}
              defaultValue={currentOdometer}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <Label>{t(lang, "service.description")} *</Label>
          <Textarea name="description" required rows={2} className="w-full" />
        </div>

        <div>
          <Label>{t(lang, "service.cost")}</Label>
          <Input name="cost" type="number" min={0} step={1} className="w-full" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t(lang, "vehicle.nextServiceDate")}</Label>
            <Input name="nextServiceDate" type="date" className="w-full" />
          </div>
          <div>
            <Label>{t(lang, "vehicle.nextServiceOdometer")}</Label>
            <Input name="nextServiceOdometer" type="number" min={0} step={1} className="w-full" />
          </div>
        </div>

        <ModalFooter>
          <ModalCancel>{t(lang, "vehicle.cancel")}</ModalCancel>
          <Button type="submit" disabled={submitting}>
            {submitting ? t(lang, "vehicle.saving") : t(lang, "vehicle.save")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

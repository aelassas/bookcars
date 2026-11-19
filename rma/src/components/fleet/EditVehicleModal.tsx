"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { deleteVehiclePermanently, markVehicleAsSold, updateVehicle } from "@/modules/fleet/actions";
import { EDITABLE_VEHICLE_STATUSES } from "@/modules/fleet/vehicle-options";
import { Button, Input, Label, Select } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";
import { t, type Lang } from "@/platform/i18n/dict";

export interface EditableVehicle {
  id: string;
  make: string;
  model: string;
  year?: number | null;
  plate: string;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  odometer: number;
  /** Current lifecycle status. Rental-derived values (on_rent, reserved,
   *  overdue) lock the Status select — those flip back by themselves. */
  status: string;
  location?: string | null;
  nextServiceDate?: string | null;
  nextServiceOdometer?: number | null;
  oilChangeIntervalKm?: number;
}

/** Trigger for the identity strip — owns the modal's open state. */
export function EditVehicleButton({
  tenantId,
  vehicle,
  lang,
}: {
  tenantId: string;
  vehicle: EditableVehicle;
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
        {t(lang, "vehicle.edit")}
      </Button>
      {open && (
        <EditVehicleModal
          tenantId={tenantId}
          vehicle={vehicle}
          lang={lang}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function EditVehicleModal({
  tenantId,
  vehicle,
  lang,
  onClose,
}: {
  tenantId: string;
  vehicle: EditableVehicle;
  lang: Lang;
  onClose: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only hand-managed statuses are selectable; a rental-derived status means an
  // active rental owns it, so the select locks instead of offering fake choices.
  const statusLocked = !(EDITABLE_VEHICLE_STATUSES as readonly string[]).includes(vehicle.status);

  async function handleDelete() {
    const confirmation = prompt(t(lang, "vehicle.deletePrompt"));
    if (confirmation !== "DELETE") return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await deleteVehiclePermanently(tenantId, vehicle.id, confirmation);
      if (result.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      window.location.href = `/${window.location.pathname.split("/")[1]}/fleet`;
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t(lang, "vehicle.saveError"));
      setSubmitting(false);
    }
  }

  async function handleMarkSold() {
    setSubmitting(true);
    setError(null);
    try {
      await markVehicleAsSold(tenantId, vehicle.id);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t(lang, "vehicle.saveError"));
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    try {
      await updateVehicle(tenantId, vehicle.id, {
        make: String(fd.get("make")).trim(),
        model: String(fd.get("model")).trim(),
        year: Number(fd.get("year")) || null,
        plate: String(fd.get("plate")).trim(),
        dailyRate: Number(fd.get("dailyRate")) || 0,
        weeklyRate: Number(fd.get("weeklyRate")) || 0,
        monthlyRate: Number(fd.get("monthlyRate")) || 0,
        odometer: Number(fd.get("odometer")) || 0,
        location: String(fd.get("location") ?? "").trim() || null,
        nextServiceDate: String(fd.get("nextServiceDate") ?? "") || null,
        nextServiceOdometer: Number(fd.get("nextServiceOdometer")) || null,
        oilChangeIntervalKm: Number(fd.get("oilChangeIntervalKm")) || 8000,
        // Disabled selects submit nothing — only send a status the manager set.
        ...(statusLocked ? {} : { status: String(fd.get("status")) as (typeof EDITABLE_VEHICLE_STATUSES)[number] }),
      });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t(lang, "vehicle.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t(lang, "vehicle.editTitle")} onClose={onClose} busy={submitting} protectChanges width="lg">
      {error && <ModalError>{error}</ModalError>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t(lang, "vehicle.make")} *</Label>
            <Input name="make" required defaultValue={vehicle.make} className="w-full" />
          </div>
          <div>
            <Label>{t(lang, "vehicle.model")} *</Label>
            <Input name="model" required defaultValue={vehicle.model} className="w-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t(lang, "vehicle.year")}</Label>
            <Input
              name="year"
              type="number"
              min={1900}
              max={2100}
              defaultValue={vehicle.year ?? ""}
              className="w-full"
            />
          </div>
          <div>
            <Label>{t(lang, "vehicle.plate")} *</Label>
            <Input name="plate" required defaultValue={vehicle.plate} className="w-full" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>{t(lang, "vehicle.dailyRate")}</Label>
            <Input
              name="dailyRate"
              type="number"
              min={0}
              step={1}
              defaultValue={vehicle.dailyRate}
              className="w-full"
            />
          </div>
          <div>
            <Label>{t(lang, "vehicle.weeklyRate")}</Label>
            <Input
              name="weeklyRate"
              type="number"
              min={0}
              step={1}
              defaultValue={vehicle.weeklyRate}
              className="w-full"
            />
          </div>
          <div>
            <Label>{t(lang, "vehicle.monthlyRate")}</Label>
            <Input
              name="monthlyRate"
              type="number"
              min={0}
              step={1}
              defaultValue={vehicle.monthlyRate}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <Label>{t(lang, "vehicle.odometer")}</Label>
          <Input
            name="odometer"
            type="number"
            min={0}
            step={1}
            defaultValue={vehicle.odometer}
            className="w-full"
          />
        </div>

        <div>
          <Label>{t(lang, "vehicle.location")}</Label>
          <Input name="location" defaultValue={vehicle.location ?? ""} className="w-full" />
        </div>

        <div>
          <Label>{t(lang, "fleetBoard.status")}</Label>
          <Select
            name="status"
            className="w-full"
            defaultValue={statusLocked ? "" : vehicle.status}
            disabled={statusLocked}
          >
            {statusLocked && <option value="">{vehicle.status}</option>}
            <option value="available">{t(lang, "fleetBoard.statusAvailable")}</option>
            <option value="in_service">{t(lang, "fleetBoard.statusInService")}</option>
            <option value="sold">{t(lang, "fleetBoard.statusSold")}</option>
          </Select>
          {statusLocked && (
            <p className="mt-1 text-xs text-ink-3">{t(lang, "fleetBoard.statusManagedHint")}</p>
          )}
        </div>

        <div>
          <Label>{t(lang, "vehicle.oilChangeInterval")}</Label>
          <Input
            name="oilChangeIntervalKm"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={vehicle.oilChangeIntervalKm ?? 8000}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t(lang, "vehicle.nextServiceDate")}</Label>
            <Input
              name="nextServiceDate"
              type="date"
              defaultValue={vehicle.nextServiceDate ?? ""}
              className="w-full"
            />
          </div>
          <div>
            <Label>{t(lang, "vehicle.nextServiceOdometer")}</Label>
            <Input
              name="nextServiceOdometer"
              type="number"
              min={0}
              step={1}
              defaultValue={vehicle.nextServiceOdometer ?? ""}
              className="w-full"
            />
          </div>
        </div>

        <ModalFooter>
          {vehicle.status !== "sold" && (
            <Button type="button" variant="secondary" onClick={handleMarkSold} disabled={submitting}>
              {submitting ? t(lang, "vehicle.markingSold") : t(lang, "vehicle.markSold")}
            </Button>
          )}
          <Button type="button" variant="danger" onClick={handleDelete} disabled={submitting}>
            {t(lang, "vehicle.delete")}
          </Button>
          <ModalCancel>{t(lang, "vehicle.cancel")}</ModalCancel>
          <Button type="submit" disabled={submitting}>
            {submitting ? t(lang, "vehicle.saving") : t(lang, "vehicle.save")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

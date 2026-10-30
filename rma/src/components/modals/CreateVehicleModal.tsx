"use client";

import { useState } from "react";
import { createVehicle } from "@/modules/fleet/queries";
import { Button, Input, Select, Label } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";

const DIVISIONS = ["rent", "lease"];

export function CreateVehicleModal({
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
      await createVehicle(tenantId, {
        make: String(fd.get("make")),
        model: String(fd.get("model")),
        year: Number(fd.get("year")) || undefined,
        plate: String(fd.get("plate")),
        dailyRate: Number(fd.get("dailyRate")) || undefined,
        imei: String(fd.get("imei") || ""),
        division: String(fd.get("division") || "rent"),
      });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Failed to add vehicle");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add Vehicle" onClose={onClose} busy={submitting} protectChanges>
      {error && <ModalError>{error}</ModalError>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Make *</Label>
            <Input name="make" required className="w-full" placeholder="e.g. Toyota" />
          </div>
          <div>
            <Label>Model *</Label>
            <Input name="model" required className="w-full" placeholder="e.g. Camry" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Year</Label>
            <Input
              name="year"
              type="number"
              min={1900}
              max={2100}
              className="w-full"
              placeholder={new Date().getFullYear().toString()}
            />
          </div>
          <div>
            <Label>Plate *</Label>
            <Input name="plate" required className="w-full" placeholder="e.g. A12345" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Daily Rate (AED)</Label>
            <Input name="dailyRate" type="number" min={0} className="w-full" placeholder="0" />
          </div>
          <div>
            <Label>Division</Label>
            <Select name="division" className="w-full">
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label>IMEI (Pilot GPS)</Label>
          <Input name="imei" className="w-full" placeholder="Optional — for live GPS tracking" />
        </div>

        <ModalFooter>
          <ModalCancel>Cancel</ModalCancel>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add Vehicle"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

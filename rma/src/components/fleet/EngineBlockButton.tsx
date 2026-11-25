"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { Modal, ModalCancel, ModalError, ModalFooter } from "@/components/ui/Modal";
import { blockVehicleEngine } from "@/modules/fleet/engine-block-actions";
import { ENGINE_BLOCK_CONFIRMATION } from "@/modules/fleet/engine-block";
import type { FleetVehicle } from "@/modules/fleet/queries";

export function EngineBlockButton({
  tenantId,
  vehicle,
  allowed,
}: {
  tenantId: string;
  vehicle: Pick<FleetVehicle, "id" | "imei" | "plate" | "make" | "model" | "gpsBlocked">;
  allowed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commandId, setCommandId] = useState<number | null>(null);

  if (!allowed || !vehicle.imei || vehicle.id === vehicle.imei || vehicle.gpsBlocked) return null;

  const title = `${vehicle.make} ${vehicle.model}`.trim() || vehicle.plate;

  function close() {
    setOpen(false);
    setConfirmation("");
    setError(null);
    setCommandId(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await blockVehicleEngine(tenantId, vehicle.id, confirmation);
      setCommandId(result.commandId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pilot could not accept the engine-block command");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Lock className="h-3.5 w-3.5" /> Disable engine
      </Button>
      {open && (
        <Modal title={`Disable ${title}?`} subtitle={vehicle.plate} onClose={close} busy={busy}>
          {commandId !== null ? (
            <div className="rounded-field border border-success-line bg-success-soft p-4 text-sm text-ink-2">
              <p className="flex items-center gap-2 font-medium text-success">
                <CheckCircle2 className="h-4 w-4" /> Pilot accepted command #{commandId}
              </p>
              <p className="mt-2">The live engine status will change after the vehicle confirms the command.</p>
              <ModalFooter><ModalCancel>Close</ModalCancel></ModalFooter>
            </div>
          ) : (
            <form onSubmit={submit}>
              {error && <ModalError>{error}</ModalError>}
              <p className="mb-4 text-sm text-ink-2">
                This sends a real engine-block command through Pilot. Use it only when the vehicle is parked with ignition off.
              </p>
              <Label htmlFor="engine-block-confirmation">
                Type <span className="font-mono font-semibold">{ENGINE_BLOCK_CONFIRMATION}</span> to confirm
              </Label>
              <Input
                id="engine-block-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                className="mt-1 w-full"
              />
              <ModalFooter>
                <ModalCancel>Cancel</ModalCancel>
                <Button type="submit" variant="danger" disabled={busy || confirmation !== ENGINE_BLOCK_CONFIRMATION}>
                  {busy ? "Sending…" : "Disable engine"}
                </Button>
              </ModalFooter>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input, Label, Select, Textarea } from "@/components/ui";
import { blockOverdueFine, createRentalCharge, importParkingCsv, notifyRentalCharge, syncVehicleFines, syncVehicleParking, syncVehicleSalik } from "@/modules/rental-charges/actions";
import type { rentalCharge } from "@/platform/db/schema";
import { CHARGE_KINDS, chargeKindLabel, type ChargeKind } from "@/modules/rental-charges/rules";
import type { ParkingOperator } from "@/platform/integrations/parking/connectors";
import { formatCurrency } from "@/lib/format";
import { ChargePaymentButton } from "./ChargePaymentButton";

type Charge = typeof rentalCharge.$inferSelect;
type Row = { charge: Charge; customerName: string; plate: string };
type Vehicle = { id: string; plate: string; make: string; model: string };

export function ChargesBoard({ tenantId, tenantSlug, charges, vehicles = [], allowEntry = true }: {
  tenantId: string;
  tenantSlug: string;
  charges: Row[];
  vehicles?: Vehicle[];
  allowEntry?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [parkingOperator, setParkingOperator] = useState<ParkingOperator>("parkin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [renderedAt] = useState(Date.now);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Charge operation failed");
    } finally {
      setBusy(false);
    }
  }

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    await run(async () => {
      const result = await createRentalCharge(tenantId, tenantSlug, {
        vehicleId: String(fd.get("vehicleId")),
        kind: String(fd.get("kind")) as ChargeKind,
        externalId: String(fd.get("externalId")),
        occurredAt: new Date(String(fd.get("occurredAt"))),
        amount: Number(fd.get("amount")),
        description: String(fd.get("description") || ""),
        location: String(fd.get("location") || ""),
        source: "manual",
      }, fd.get("notify") === "on");
      if (result.notificationError) throw new Error(`Charge saved, but notification failed: ${result.notificationError}`);
      setNotice(result.created ? "Charge assigned to the covering rental." : "This operator reference already exists; no duplicate was created.");
      form.reset();
      setVehicleId("");
      setOpen(false);
    });
  }

  async function syncFines() {
    if (!vehicleId) {
      setError("Select a vehicle in the charge form, then sync its RTA fines");
      setOpen(true);
      return;
    }
    await run(async () => {
      const result = await syncVehicleFines(tenantId, tenantSlug, vehicleId);
      setNotice(`RTA returned ${result.found} fines; ${result.created} new charges were assigned and queued.${result.errors.length ? ` Errors: ${result.errors.join("; ")}` : ""}`);
    });
  }

  async function syncSalik() {
    if (!vehicleId) {
      setError("Select a vehicle in the charge form, then sync its Salik trips");
      setOpen(true);
      return;
    }
    await run(async () => {
      const result = await syncVehicleSalik(tenantId, tenantSlug, vehicleId);
      setNotice(result.configured === false ? "Salik credentials are not configured on the server; no account was contacted." : `Salik returned ${result.found} trips; ${result.created} new charges were assigned to their rental periods.${result.skippedNoAccount ? " The plate is not on a configured Salik account." : ""}${result.errors.length ? ` Errors: ${result.errors.join("; ")}` : ""}`);
    });
  }

  async function syncParking(operator: ParkingOperator) {
    if (!vehicleId) {
      setError(`Select a vehicle in the charge form, then sync its ${operator} charges`);
      setOpen(true);
      return;
    }
    await run(async () => {
      const result = await syncVehicleParking(tenantId, tenantSlug, operator, vehicleId);
      setNotice(`${operator}: ${result.found} feed rows; ${result.created} new and ${result.duplicates} duplicates.${result.errors.length ? ` Errors: ${result.errors.join("; ")}` : ""}`);
    });
  }

  async function importCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    await run(async () => {
      const result = await importParkingCsv(tenantId, tenantSlug, parkingOperator, await file.text());
      setNotice(`${parkingOperator} CSV: ${result.found} rows; ${result.created} new and ${result.duplicates} duplicates. No customer notifications were queued.${result.errors.length ? ` Errors: ${result.errors.join("; ")}` : ""}`);
    });
    input.value = "";
  }

  return (
    <div className="space-y-4">
      {allowEntry && <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setOpen(!open)}>{open ? "Close charge form" : "Add fine / Salik / parking"}</Button><Button size="sm" variant="secondary" disabled={busy} onClick={syncFines}>Sync selected car from RTA</Button><Button size="sm" variant="secondary" disabled={busy} onClick={syncSalik}>Sync selected car from Salik</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => syncParking("parkin")}>Sync selected car from Parkin</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => syncParking("parkonic")}>Sync selected car from Parkonic</Button></div>}
      {allowEntry && <div className="flex flex-wrap items-end gap-2 rounded-field bg-sunken p-3"><div><Label htmlFor="parking-operator">Operator CSV fallback</Label><Select id="parking-operator" value={parkingOperator} onChange={(event) => setParkingOperator(event.target.value as ParkingOperator)}><option value="parkin">Parkin</option><option value="parkonic">Parkonic</option></Select></div><div><Label htmlFor="parking-csv">CSV file (max 2 MB)</Label><Input id="parking-csv" type="file" accept=".csv,text/csv" disabled={busy} onChange={importCsv} /></div><p className="text-xs text-ink-3">Columns: reference, plate, occurredAt (with timezone), amount, location, description. Imports never bulk-notify customers.</p></div>}
      {error && <p role="alert" className="rounded-field bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="rounded-field bg-success-soft px-3 py-2 text-sm text-success">{notice}</p>}
      {allowEntry && open && (
        <form onSubmit={add} className="grid gap-3 rounded-card border border-line bg-surface p-4 md:grid-cols-2">
          <div><Label>Vehicle *</Label><Select name="vehicleId" required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full"><option value="">Select vehicle…</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.make} {v.model}</option>)}</Select></div>
          <div><Label>Charge type *</Label><Select name="kind" required className="w-full">{CHARGE_KINDS.map((kind) => <option key={kind} value={kind}>{chargeKindLabel(kind)}</option>)}</Select></div>
          <div><Label>Operator reference *</Label><Input name="externalId" required maxLength={160} className="w-full" placeholder="Unique fine / toll / parking reference" /></div>
          <div><Label>Violation / parking date and time *</Label><Input name="occurredAt" type="datetime-local" required className="w-full" /></div>
          <div><Label>Amount (AED) *</Label><Input name="amount" type="number" min={0.01} step={0.01} required className="w-full" /></div>
          <div><Label>Location</Label><Input name="location" className="w-full" /></div>
          <div className="md:col-span-2"><Label>Details</Label><Textarea name="description" rows={2} className="w-full" /></div>
          <label className="flex items-center gap-2 text-sm text-ink-2 md:col-span-2"><input name="notify" type="checkbox" defaultChecked /> Queue a WhatsApp notification to the responsible customer immediately</label>
          <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Assign charge"}</Button></div>
          <p className="text-xs text-ink-3 md:col-span-2">Assignment uses the vehicle and event timestamp. Late charges stay with the former renter. Duplicate references are ignored.</p>
        </form>
      )}
      {charges.length === 0 ? <p className="text-sm text-ink-3">No charges recorded.</p> : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-ink-3"><th className="p-3">Charge</th><th className="p-3">Customer / car</th><th className="p-3">Event</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
            <tbody>{charges.map(({ charge, customerName, plate }) => {
              const overdueFine = charge.kind === "fine" && charge.paymentDueAt != null && new Date(charge.paymentDueAt).getTime() <= renderedAt && ["unpaid", "notification_queued"].includes(charge.status);
              return <tr key={charge.id} className="border-b border-line-soft align-top last:border-0">
                <td className="p-3"><div className="font-medium text-ink">{chargeKindLabel(charge.kind)}</div><div className="text-xs text-ink-3">{charge.externalId}</div>{charge.location && <div className="text-xs text-ink-2">{charge.location}</div>}</td>
                <td className="p-3"><div>{customerName}</div><div className="text-xs text-ink-3">{plate}</div></td>
                <td className="p-3 text-xs tnum">{new Date(charge.occurredAt).toLocaleString()}</td>
                <td className="p-3 font-semibold tnum">{formatCurrency(charge.amount)}</td>
                <td className="p-3"><Badge tone={charge.status === "paid" ? "success" : overdueFine ? "danger" : "warning"}>{charge.status.replaceAll("_", " ")}</Badge><div className="mt-1 text-xs text-ink-3">Notice: {charge.notificationStatus.replaceAll("_", " ")}</div>{charge.paymentDueAt && <div className="text-xs text-ink-3">Due: {new Date(charge.paymentDueAt).toLocaleString()}</div>}{charge.notificationError && <div className="max-w-48 text-xs text-danger">{charge.notificationError}</div>}</td>
                <td className="p-3"><div className="flex flex-col gap-2">{charge.status !== "paid" && charge.status !== "void" && <><ChargePaymentButton tenantId={tenantId} tenantSlug={tenantSlug} chargeId={charge.id} disabled={busy} />{!["queued", "sent"].includes(charge.notificationStatus) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => notifyRentalCharge(tenantId, tenantSlug, charge.id))}>Queue notification</Button>}</>}{overdueFine && <Button size="sm" variant="danger" disabled={busy} onClick={() => run(async () => { const command = await blockOverdueFine(tenantId, tenantSlug, charge.id); setNotice(command == null ? "A block request already exists for this fine." : `Pilot accepted block command ${command}.`); })}>Block after stopped check</Button>}</div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

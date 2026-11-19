"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input, Label } from "@/components/ui";
import { confirmRentalExtension, setRentalExtensionStatus } from "@/modules/rental/extension-actions";

const LABELS: Record<string, string> = {
  not_sent: "Reminder not sent yet",
  awaiting_response: "Awaiting customer response",
  wants_extension: "Customer wants to extend",
  returning: "Customer will return the car",
  extension_confirmed: "Extension confirmed",
};

export function RentalExtensionPanel({ tenantId, tenantSlug, rentalId, status, returnDate, reminderSentAt, response, responseAt, active }: {
  tenantId: string;
  tenantSlug: string;
  rentalId: string;
  status: string;
  returnDate: Date;
  reminderSentAt: Date | null;
  response: string | null;
  responseAt: Date | null;
  active: boolean;
}) {
  const router = useRouter();
  const [newReturn, setNewReturn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  async function extend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await confirmRentalExtension(tenantId, tenantSlug, rentalId, new Date(newReturn));
    if (!result.ok) setError(result.error);
    else router.refresh();
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><Badge tone={status === "wants_extension" ? "warning" : status === "extension_confirmed" ? "success" : "neutral"}>{LABELS[status] ?? status}</Badge><span className="text-xs text-ink-3">{reminderSentAt ? `Reminder queued ${new Date(reminderSentAt).toLocaleString()}` : "48-hour reminder not queued yet"}</span></div>
      {response && <div className="rounded-field bg-sunken p-3 text-sm"><div className="text-xs text-ink-3">Customer reply{responseAt ? ` · ${new Date(responseAt).toLocaleString()}` : ""}</div><p className="mt-1 whitespace-pre-wrap text-ink">{response}</p></div>}
      {active && <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => setRentalExtensionStatus(tenantId, tenantSlug, rentalId, "wants_extension"))}>Mark wants extension</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => setRentalExtensionStatus(tenantId, tenantSlug, rentalId, "returning"))}>Mark returning</Button></div>}
      {active && <form onSubmit={extend} className="flex flex-wrap items-end gap-2 border-t border-line-soft pt-3"><div><Label>New return date/time</Label><Input type="datetime-local" required value={newReturn} min={new Date(returnDate).toISOString().slice(0, 16)} onChange={(e) => setNewReturn(e.target.value)} /></div><Button type="submit" size="sm" disabled={busy || !newReturn}>{busy ? "Saving…" : "Confirm extension & update price"}</Button></form>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

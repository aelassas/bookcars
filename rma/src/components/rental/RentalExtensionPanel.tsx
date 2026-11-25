"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input, Label } from "@/components/ui";
import { confirmRentalExtension, markRentalAsLongTerm, setRentalExtensionStatus } from "@/modules/rental/extension-actions";
import { calculateRentalExtension } from "@/modules/rental/extension-calculation";
import { formatCurrency, toDateTimeLocalValue } from "@/lib/format";

const LABELS: Record<string, string> = {
  not_sent: "Reminder not sent yet",
  awaiting_response: "Awaiting customer response",
  wants_extension: "Customer wants to extend",
  returning: "Customer will return the car",
  extension_confirmed: "Extension confirmed",
  long_term: "Long-term · no fixed return date",
};

export function RentalExtensionPanel({ tenantId, tenantSlug, rentalId, status, returnDate, reminderSentAt, response, responseAt, active, dailyRate, totalDays, total, balanceDue }: {
  tenantId: string;
  tenantSlug: string;
  rentalId: string;
  status: string;
  returnDate: Date;
  reminderSentAt: Date | null;
  response: string | null;
  responseAt: Date | null;
  active: boolean;
  dailyRate: number;
  totalDays: number;
  total: number;
  balanceDue: number;
}) {
  const router = useRouter();
  const [newReturn, setNewReturn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => {
    if (!newReturn) return null;
    try {
      return calculateRentalExtension({
        currentReturnDate: returnDate,
        newReturnDate: new Date(newReturn),
        currentTotalDays: totalDays,
        dailyRate,
        total,
        balanceDue,
      });
    } catch {
      return null;
    }
  }, [newReturn, returnDate, totalDays, dailyRate, total, balanceDue]);

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
    try {
      const result = await confirmRentalExtension(tenantId, tenantSlug, rentalId, new Date(newReturn));
      if (!result.ok) setError(result.error);
      else {
        setNewReturn("");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extension failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><Badge tone={status === "wants_extension" ? "warning" : status === "extension_confirmed" ? "success" : "neutral"}>{LABELS[status] ?? status}</Badge><span className="text-xs text-ink-3">{reminderSentAt ? `Reminder queued ${new Date(reminderSentAt).toLocaleString()}` : "48-hour reminder not queued yet"}</span></div>
      {response && <div className="rounded-field bg-sunken p-3 text-sm"><div className="text-xs text-ink-3">Customer reply{responseAt ? ` · ${new Date(responseAt).toLocaleString()}` : ""}</div><p className="mt-1 whitespace-pre-wrap text-ink">{response}</p></div>}
      {active && status !== "long_term" && <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => setRentalExtensionStatus(tenantId, tenantSlug, rentalId, "wants_extension"))}>Mark wants extension</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => setRentalExtensionStatus(tenantId, tenantSlug, rentalId, "returning"))}>Mark returning</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => { if (confirm("Keep this rental open-ended in the calendar until a return date is confirmed?")) void run(() => markRentalAsLongTerm(tenantId, tenantSlug, rentalId)); }}>Mark as long-term</Button></div>}
      {active && status === "long_term" && <p className="text-xs text-ink-3">Open-ended in the calendar. Confirm a return date below to return to a fixed rental period.</p>}
      {active && <form onSubmit={extend} className="space-y-3 border-t border-line-soft pt-3">
        <div className="flex flex-wrap items-end gap-2">
          <div><Label>New return date/time</Label><Input type="datetime-local" required value={newReturn} min={toDateTimeLocalValue(returnDate)} onChange={(e) => setNewReturn(e.target.value)} /></div>
          <Button type="submit" size="sm" disabled={busy || !preview}>{busy ? "Saving…" : "Confirm extension & update price"}</Button>
        </div>
        {preview && <dl className="grid gap-2 rounded-field bg-sunken p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-ink-3">Calendar extension</dt><dd className="mt-1 font-medium text-ink">{preview.extraDays} days · {preview.newTotalDays} total</dd></div>
          <div><dt className="text-ink-3">Additional rent</dt><dd className="mt-1 font-medium text-ink tnum">{preview.extraPricedDays} paid days · {formatCurrency(preview.extraTotal)}</dd></div>
          <div><dt className="text-ink-3">New total incl. deposit</dt><dd className="mt-1 font-medium text-ink tnum">{formatCurrency(preview.newTotal)}</dd></div>
          <div><dt className="text-ink-3">New balance due</dt><dd className="mt-1 font-semibold text-danger tnum">{formatCurrency(preview.newBalanceDue)}</dd></div>
        </dl>}
      </form>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

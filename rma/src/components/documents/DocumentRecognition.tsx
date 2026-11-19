"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { applyRecognizedCustomerData, recognizeCustomerDocument } from "@/modules/documents/customer-document-actions";
import type { RecognizedCustomerData } from "@/modules/documents/recognition";

const FIELDS: Array<{ key: keyof RecognizedCustomerData; label: string; type?: string }> = [
  { key: "name", label: "Full name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email", type: "email" },
  { key: "dateOfBirth", label: "Date of birth", type: "date" },
  { key: "nationality", label: "Nationality" },
  { key: "emiratesId", label: "Emirates ID" },
  { key: "emiratesIdExpiry", label: "Emirates ID expiry", type: "date" },
  { key: "passportNumber", label: "Passport number" },
  { key: "driverLicenseNumber", label: "Driving licence number" },
  { key: "driverLicenseExpiry", label: "Licence expiry", type: "date" },
];

export function DocumentRecognition({ tenantId, documentId, status, data, error, onUpdated }: {
  tenantId: string;
  documentId: string;
  status: string;
  data: RecognizedCustomerData | null;
  error: string | null;
  onUpdated: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setLocalError(null);
    try {
      await recognizeCustomerDocument(tenantId, documentId);
      onUpdated();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Recognition failed");
    } finally {
      setBusy(false);
    }
  }

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLocalError(null);
    const fd = new FormData(event.currentTarget);
    const reviewed = Object.fromEntries(FIELDS.map(({ key }) => [key, String(fd.get(key) ?? "").trim()]));
    try {
      await applyRecognizedCustomerData(tenantId, documentId, reviewed);
      router.refresh();
      onUpdated();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not save the reviewed details");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 border-t border-slate-200 pt-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-slate-700">Recognition: {status.replaceAll("_", " ")}</span>
        {["failed", "manual_required"].includes(status) && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={retry}>Try recognition again</Button>
        )}
      </div>
      {(error || localError) && <p className="mt-1 text-xs text-rose-700">{localError ?? error}</p>}
      {status === "processing" && <p className="mt-1 text-xs text-slate-500">Reading the document…</p>}
      {status === "review_required" && data && (
        <form onSubmit={apply} className="mt-3 space-y-3">
          <p className="text-xs text-slate-600">Check every field against the document. Only completed fields are saved to the customer.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {FIELDS.map(({ key, label, type }) => (
              <div key={key}>
                <Label htmlFor={`${documentId}-${key}`}>{label}</Label>
                <Input id={`${documentId}-${key}`} name={key} type={type ?? "text"} defaultValue={data[key] ?? ""} className="w-full" />
              </div>
            ))}
          </div>
          <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Confirm & save to customer"}</Button>
        </form>
      )}
    </div>
  );
}

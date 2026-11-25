"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { applyRecognizedCustomerData, recognizeCustomerDocument } from "@/modules/documents/customer-document-actions";
import { applyRecognizedVehicleData } from "@/modules/documents/vehicle-document-actions";
import type { RecognizedCustomerData, RecognizedVehicleData } from "@/modules/documents/recognition";

type RecognitionData = RecognizedCustomerData & RecognizedVehicleData;
const CUSTOMER_FIELDS: Array<{ key: keyof RecognitionData; label: string; type?: string }> = [
  { key: "name", label: "Full name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email", type: "email" },
  { key: "dateOfBirth", label: "Date of birth", type: "date" },
  { key: "nationality", label: "Nationality" },
  { key: "address", label: "Home address" },
  { key: "emiratesId", label: "Emirates ID" },
  { key: "emiratesIdIssue", label: "Emirates ID issue date", type: "date" },
  { key: "emiratesIdExpiry", label: "Emirates ID expiry", type: "date" },
  { key: "passportNumber", label: "Passport number" },
  { key: "passportIssue", label: "Passport issue date", type: "date" },
  { key: "passportExpiry", label: "Passport expiry", type: "date" },
  { key: "driverLicenseNumber", label: "Driving licence number" },
  { key: "driverLicenseIssue", label: "Licence issue date", type: "date" },
  { key: "driverLicenseExpiry", label: "Licence expiry", type: "date" },
];
const VEHICLE_FIELDS: Array<{ key: keyof RecognitionData; label: string; type?: string }> = [
  { key: "vin", label: "VIN / chassis number" },
  { key: "plate", label: "Plate number" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "year", label: "Model year" },
  { key: "colour", label: "Colour" },
  { key: "registrationExpiry", label: "Registration expiry", type: "date" },
];

export function DocumentRecognition({ tenantId, documentId, entityType, status, data, error, onUpdated }: {
  tenantId: string;
  documentId: string;
  entityType: "customer" | "vehicle";
  status: string;
  data: RecognitionData | null;
  error: string | null;
  onUpdated: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fields = entityType === "vehicle" ? VEHICLE_FIELDS : CUSTOMER_FIELDS;

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
    const reviewed = Object.fromEntries(fields.map(({ key }) => [key, String(fd.get(key) ?? "").trim()]));
    try {
      if (entityType === "vehicle") await applyRecognizedVehicleData(tenantId, documentId, reviewed);
      else await applyRecognizedCustomerData(tenantId, documentId, reviewed);
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
          <p className="text-xs text-slate-600">Check every field against the document. Only completed fields are saved.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map(({ key, label, type }) => (
              <div key={key}>
                <Label htmlFor={`${documentId}-${key}`}>{label}</Label>
                <Input id={`${documentId}-${key}`} name={key} type={type ?? "text"} defaultValue={data[key] ?? ""} className="w-full" />
              </div>
            ))}
          </div>
          <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : `Confirm & save to ${entityType}`}</Button>
        </form>
      )}
    </div>
  );
}

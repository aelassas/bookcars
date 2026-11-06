"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input, Label } from "@/components/ui";
import { CheckCircle2, Download, UploadCloud } from "lucide-react";
import { confirmTarsUpload } from "@/modules/rental/actions";
import { parseTarsHandoff, TARS_HANDOFF_VERSION } from "@/platform/integrations/tars/handoff";

interface Props {
  tenantId: string;
  tenantSlug: string;
  rentalId: string;
  contractUrl: string | null;
  tarsDocumentNumber: string | null;
  customerName: string;
  customerEmiratesId: string | null;
  vehiclePlate: string;
  vehicleVin: string | null;
  vehicleOdometer: number | null;
  startAt: string;
  returnAt: string;
  canManage: boolean;
}

export function TarsSection(props: Props) {
  const router = useRouter();
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [agreementNumber, setAgreementNumber] = useState(props.rentalId.slice(0, 8).toUpperCase());
  const [location, setLocation] = useState("Dubai");
  const [odometer, setOdometer] = useState(props.vehicleOdometer?.toString() ?? "");
  const [fuelPercent, setFuelPercent] = useState("50");
  const [documentNumber, setDocumentNumber] = useState(props.tarsDocumentNumber ?? "");
  const [uploadedDocument, setUploadedDocument] = useState(props.tarsDocumentNumber);
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filename = `tars-${props.rentalId.slice(0, 8)}.json`;
  const missing = [
    !props.contractUrl && "Generate the contract PDF",
    !props.customerEmiratesId && "Add the customer's Emirates ID",
    !props.vehicleVin && "Add the vehicle VIN",
  ].filter(Boolean) as string[];

  function downloadPackage() {
    setError(null);
    try {
      const handoff = parseTarsHandoff({
        version: TARS_HANDOFF_VERSION,
        rentalId: props.rentalId,
        agreementNumber,
        signatureConfirmed,
        customer: { name: props.customerName, emiratesId: props.customerEmiratesId },
        vehicle: { plate: props.vehiclePlate, vin: props.vehicleVin },
        rental: {
          startAt: props.startAt,
          returnAt: props.returnAt,
          location,
          odometer: Number(odometer),
          fuelPercent: Number(fuelPercent),
        },
      });
      const url = URL.createObjectURL(new Blob([`${JSON.stringify(handoff, null, 2)}\n`], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The TARS package is incomplete");
    }
  }

  async function confirmUpload() {
    setBusy(true);
    setError(null);
    try {
      await confirmTarsUpload(props.tenantId, props.rentalId, documentNumber, props.tenantSlug, signatureConfirmed);
      setUploadedDocument(documentNumber.trim());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record the TARS confirmation");
    } finally {
      setBusy(false);
    }
  }

  if (uploadedDocument) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
        <Badge tone="success"><CheckCircle2 className="h-3.5 w-3.5" /> Uploaded to TARS</Badge>
        <span className="text-sm font-medium text-ink tnum">{uploadedDocument}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-line-soft pt-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">TARS handoff</p>
          <p className="text-xs text-ink-3">For existing TARS customers. Prepares the draft only; a person reviews and submits it in RTA.</p>
        </div>
        <Badge tone="neutral">Not uploaded</Badge>
      </div>

      {missing.length > 0 ? (
        <ul className="list-disc pl-5 text-xs text-warn">
          {missing.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : props.canManage ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="tars-agreement">Agreement number</Label>
              <Input id="tars-agreement" value={agreementNumber} onChange={(e) => setAgreementNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tars-location">Rental location</Label>
              <Input id="tars-location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tars-odometer">Handover odometer (km)</Label>
              <Input id="tars-odometer" type="number" min={0} value={odometer} onChange={(e) => setOdometer(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tars-fuel">Fuel / battery level (%)</Label>
              <Input id="tars-fuel" type="number" min={0} max={100} value={fuelPercent} onChange={(e) => setFuelPercent(e.target.value)} />
            </div>
          </div>

          <label className="flex items-start gap-2 text-xs text-ink-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={signatureConfirmed}
              onChange={(e) => setSignatureConfirmed(e.target.checked)}
            />
            <span>I confirm that the required renter and agency signatures are complete.</span>
          </label>

          <Button size="sm" variant="secondary" onClick={downloadPackage} disabled={!signatureConfirmed}>
            <Download className="h-4 w-4" /> Download TARS package
          </Button>

          {downloaded && (
            <div className="rounded-field bg-sunken p-3 text-xs text-ink-2">
              <p>Run this with the signed PDF, review the resulting Summary in TARS, and submit it yourself:</p>
              <code className="mt-2 block break-all text-ink">npx tsx scripts/tars-prepare.ts ~/Downloads/{filename} --contract /path/to/signed.pdf</code>
            </div>
          )}

          <div className="border-t border-line-soft pt-3">
            <Label htmlFor="tars-document">TARS document number (after you submit)</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="tars-document"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="e.g. 56235-3382"
              />
              <Button size="sm" onClick={confirmUpload} disabled={busy || !signatureConfirmed || !documentNumber.trim()}>
                <UploadCloud className="h-4 w-4" /> {busy ? "Recording…" : "Record confirmed upload"}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-ink-3">A sales manager can prepare and confirm the TARS handoff.</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

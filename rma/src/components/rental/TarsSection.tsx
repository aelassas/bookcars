"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input, Label } from "@/components/ui";
import { CheckCircle2, Download, Send, UploadCloud } from "lucide-react";
import { confirmTarsUpload } from "@/modules/rental/actions";
import { reviewTarsSubmission, submitTarsApplication } from "@/modules/rental/tars-actions";
import { parseTarsHandoff, TARS_HANDOFF_VERSION } from "@/platform/integrations/tars/handoff";
import type { TarsSubmissionPackage } from "@/platform/integrations/tars/submission";

interface Props {
  tenantId: string;
  tenantSlug: string;
  rentalId: string;
  contractUrl: string | null;
  tarsDocumentNumber: string | null;
  customerName: string;
  customerEmiratesId: string | null;
  customerDocumentsReviewed: boolean;
  vehiclePlate: string;
  vehicleVin: string | null;
  vehicleOdometer: number | null;
  startOdometer: number | null;
  startFuelPercent: number | null;
  startAt: string;
  returnAt: string;
  canManage: boolean;
  autoEnabled: boolean;
  autoDryRun: boolean;
  submissionStatus: string;
  submissionHash: string | null;
  submissionAttempts: number;
  submissionError: string | null;
  initialSubmission: TarsSubmissionPackage | null;
}

type Review = { hash: string; submission: TarsSubmissionPackage };

export function TarsSection(props: Props) {
  const initialReview = props.initialSubmission && props.submissionHash ? { hash: props.submissionHash, submission: props.initialSubmission } : null;
  const router = useRouter();
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [agreementNumber, setAgreementNumber] = useState(props.initialSubmission?.handoff.agreementNumber ?? props.rentalId.slice(0, 8).toUpperCase());
  const [location, setLocation] = useState(props.initialSubmission?.handoff.rental.location ?? "Dubai");
  const [odometer, setOdometer] = useState(props.initialSubmission?.handoff.rental.odometer.toString() ?? props.startOdometer?.toString() ?? props.vehicleOdometer?.toString() ?? "");
  const [fuelPercent, setFuelPercent] = useState(props.initialSubmission?.handoff.rental.fuelPercent.toString() ?? props.startFuelPercent?.toString() ?? "");
  const [documentNumber, setDocumentNumber] = useState(props.tarsDocumentNumber ?? "");
  const [uploadedDocument, setUploadedDocument] = useState(props.tarsDocumentNumber);
  const [downloaded, setDownloaded] = useState(false);
  const [review, setReview] = useState<Review | null>(initialReview);
  const [status, setStatus] = useState(props.submissionStatus);
  const [attempts, setAttempts] = useState(props.submissionAttempts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(props.submissionError);
  const [notice, setNotice] = useState<string | null>(null);

  const filename = `tars-${props.rentalId.slice(0, 8)}.json`;
  const missing = [
    props.autoEnabled && !props.customerEmiratesId && "Add the customer's Emirates ID",
    props.autoEnabled && !props.customerDocumentsReviewed && "Review the customer's documents",
    !props.vehicleVin && "Add the vehicle VIN",
  ].filter(Boolean) as string[];

  function currentHandoff() {
    return parseTarsHandoff({
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
  }

  function downloadPackage() {
    setError(null);
    try {
      const handoff = currentHandoff();
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

  async function reviewSubmission() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await reviewTarsSubmission(props.tenantId, props.tenantSlug, props.rentalId, {
        agreementNumber,
        signatureConfirmed,
        location,
        odometer: Number(odometer),
        fuelPercent: Number(fuelPercent),
      });
      setReview({ hash: result.hash, submission: result.submission });
      setStatus(result.status);
      setNotice("Review saved. Check the exact package below, then confirm it separately.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to review the TARS package");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSubmission() {
    if (!review) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await submitTarsApplication(props.tenantId, props.tenantSlug, props.rentalId, review.hash);
      setStatus(result.status);
      setAttempts(result.attempts);
      if (result.status === "failed") setError(result.error ?? "TARS submission failed");
      else {
        setNotice(result.status === "dry_run" ? `Dry run complete: ${result.summary}` : `TARS accepted document ${result.documentNumber}.`);
        if (result.documentNumber) setUploadedDocument(result.documentNumber);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "TARS submission failed");
    } finally {
      setBusy(false);
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
          <p className="text-xs text-ink-3">{props.autoEnabled ? "Review the server-built package, then confirm the automatic browser submission." : "Automatic submission is disabled. Download the package for the existing manual TARS workflow."}</p>
        </div>
        <Badge tone={status === "failed" ? "danger" : status === "dry_run" ? "success" : "neutral"}>{status === "not_started" ? "Not uploaded" : status.replaceAll("_", " ")}</Badge>
      </div>

      {missing.length > 0 ? (
        <ul className="list-disc pl-5 text-xs text-warn">{missing.map((item) => <li key={item}>{item}</li>)}</ul>
      ) : props.canManage ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="tars-agreement">Agreement number</Label><Input id="tars-agreement" value={agreementNumber} onChange={(e) => setAgreementNumber(e.target.value)} /></div>
            <div><Label htmlFor="tars-location">Rental location</Label><Input id="tars-location" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            <div><Label htmlFor="tars-odometer">Handover odometer (km)</Label><Input id="tars-odometer" type="number" min={0} value={odometer} onChange={(e) => setOdometer(e.target.value)} /></div>
            <div><Label htmlFor="tars-fuel">Fuel / battery level (%)</Label><Input id="tars-fuel" type="number" min={0} max={100} value={fuelPercent} onChange={(e) => setFuelPercent(e.target.value)} /></div>
          </div>

          <label className="flex items-start gap-2 text-xs text-ink-2">
            <input type="checkbox" className="mt-0.5" checked={signatureConfirmed} onChange={(e) => setSignatureConfirmed(e.target.checked)} />
            <span>I confirm that the required renter and agency signatures are complete.</span>
          </label>

          {props.autoEnabled && <div className="space-y-3 rounded-field bg-sunken p-3">
            <Button size="sm" variant="secondary" onClick={reviewSubmission} disabled={busy || !signatureConfirmed}>Review automatic submission</Button>
            {review && <div className="space-y-2 text-xs text-ink-2">
              <p><strong className="text-ink">{review.submission.handoff.customer.name}</strong> · {review.submission.customerDocuments.length} reviewed document(s) · {review.submission.handoff.vehicle.plate} · VIN {review.submission.handoff.vehicle.vin}</p>
              <p className="tnum">{review.submission.handoff.rental.startAt} → {review.submission.handoff.rental.returnAt}</p>
              <p>Package hash: <code>{review.hash.slice(0, 12)}</code> · Attempts: {attempts}</p>
              <Button size="sm" onClick={confirmSubmission} disabled={busy || status === "running" || status === "dry_run"}>
                <Send className="h-4 w-4" /> {busy ? "Working…" : props.autoDryRun ? "Confirm dry run (no final Submit)" : "Confirm & submit to TARS"}
              </Button>
              {!props.autoDryRun && <p className="text-warn">This sends the reviewed application to the real TARS account. Repeats reconcile the agreement before submitting.</p>}
            </div>}
          </div>}

          <details className="text-xs text-ink-2" open={!props.autoEnabled}>
            <summary className="cursor-pointer font-medium text-ink">Manual TARS package</summary>
            <div className="mt-3 space-y-3">
              <Button size="sm" variant="secondary" onClick={downloadPackage} disabled={!signatureConfirmed}><Download className="h-4 w-4" /> Download TARS package</Button>
              {downloaded && <div className="rounded-field bg-sunken p-3"><p>Run this with the signed PDF and review the Summary in TARS:</p><code className="mt-2 block break-all text-ink">npx tsx scripts/tars-prepare.ts ~/Downloads/{filename} --contract /path/to/signed.pdf</code></div>}
              <div className="border-t border-line-soft pt-3"><Label htmlFor="tars-document">TARS document number (after manual submit)</Label><div className="flex flex-col gap-2 sm:flex-row"><Input id="tars-document" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="e.g. 56235-3382" /><Button size="sm" onClick={confirmUpload} disabled={busy || !signatureConfirmed || !documentNumber.trim()}><UploadCloud className="h-4 w-4" /> {busy ? "Recording…" : "Record confirmed upload"}</Button></div></div>
            </div>
          </details>
        </>
      ) : <p className="text-xs text-ink-3">A sales manager can prepare and confirm the TARS handoff.</p>}
      {status === "running" && <p className="text-xs text-ink-2">Submission attempt {attempts} is running. Do not open a duplicate TARS application.</p>}
      {notice && <p role="status" className="whitespace-pre-wrap rounded-field bg-success-soft p-3 text-xs text-success">{notice}</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}

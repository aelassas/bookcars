"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Badge } from "@/components/ui";
import { FileText, Download, RefreshCcw } from "lucide-react";

interface Props {
  rentalId: string;
  tenantSlug: string;
  customerId: string;
  contractUrl: string | null | undefined;
  tarsDocumentNumber: string | null | undefined;
  customerDocumentsReviewed: boolean;
  canGenerate: boolean;
}

export function ContractSection({ rentalId, tenantSlug, customerId, contractUrl: initialUrl, tarsDocumentNumber, customerDocumentsReviewed, canGenerate }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const source = tarsDocumentNumber ? "?source=tars" : "";
      const res = await fetch(`/api/rentals/${rentalId}/contract${source}`, { method: "POST" });
      const json = (await res.json()) as { url?: string; created?: boolean; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Contract operation failed");
      setUrl(json.url);
      setNotice(tarsDocumentNumber ? "Existing TARS contract is attached to this rental." : "RMA contract is ready.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Contract operation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {url ? (
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="success">Contract ready</Badge>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
            <Download className="h-4 w-4" /> Download PDF
          </a>
          {tarsDocumentNumber && <span className="text-xs text-ink-3">Original TARS contract {tarsDocumentNumber}</span>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="neutral">{tarsDocumentNumber ? "TARS PDF not synced" : "No contract yet"}</Badge>
            {canGenerate && (
              <Button size="sm" onClick={handleGenerate} disabled={busy}>
                {tarsDocumentNumber ? <RefreshCcw className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                {busy ? "Working…" : tarsDocumentNumber ? `Sync existing TARS PDF ${tarsDocumentNumber}` : "Generate RMA contract PDF"}
              </Button>
            )}
          </div>
          {!tarsDocumentNumber && (
            <div className="text-xs text-ink-3">
              <p>{customerDocumentsReviewed ? "Customer documents were reviewed. The PDF uses only saved customer, vehicle and rental data." : "Review and apply the customer's documents before generating the PDF."}</p>
              <Link href={`/${tenantSlug}/customers/${customerId}`} className="mt-1 inline-block font-medium text-brand-700 hover:underline">Review customer & WhatsApp documents</Link>
            </div>
          )}
        </div>
      )}
      {notice && <p role="status" className="text-xs text-success">{notice}</p>}
      {error && <p role="alert" className="whitespace-pre-wrap text-xs text-danger">{error}</p>}
    </div>
  );
}

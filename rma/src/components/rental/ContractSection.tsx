// platform/src/components/rental/ContractSection.tsx
"use client";

import { useState } from "react";
import { Button, Badge } from "@/components/ui";
import { FileText, Download, RefreshCcw } from "lucide-react";

interface Props {
  rentalId: string;
  tenantId: string;
  contractUrl: string | null | undefined;
  canGenerate: boolean;
}

export function ContractSection({ rentalId, contractUrl: initialUrl, canGenerate }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rentals/${rentalId}/contract`, { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Failed to generate contract");
      setUrl(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {url ? (
        <div className="flex items-center gap-3">
          <Badge tone="success">Contract ready</Badge>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
          {canGenerate && (
            <button
              onClick={handleGenerate}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink-2 disabled:opacity-50"
              title="Re-generate contract"
            >
              <RefreshCcw className="h-3 w-3" />
              Regenerate
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Badge tone="neutral">No contract yet</Badge>
          {canGenerate ? (
            <Button size="sm" onClick={handleGenerate} disabled={busy}>
              <FileText className="h-4 w-4" />
              {busy ? "Generating..." : "Generate contract PDF"}
            </Button>
          ) : (
            <p className="text-xs text-ink-3">Sales can generate the contract once the rental is confirmed.</p>
          )}
        </div>
      )}
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  );
}

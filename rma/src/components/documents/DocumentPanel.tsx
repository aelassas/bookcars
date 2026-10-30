"use client";

import { useEffect, useState, useCallback } from "react";
import { getDocuments, deleteDocument } from "@/modules/documents/queries";
import { uploadDocumentForEntity } from "@/modules/documents/actions";
import { FileText, X, Trash2, Paperclip } from "lucide-react";

const CATEGORIES = [
  { id: "contract", label: "Contract" },
  { id: "id", label: "ID / Passport" },
  { id: "license", label: "License" },
  { id: "inspection", label: "Inspection" },
  { id: "other", label: "Other" },
];

type Doc = Awaited<ReturnType<typeof getDocuments>>[number];

export function DocumentPanel({
  tenantId,
  entityType,
  entityId,
  entityLabel,
  onClose,
}: {
  tenantId: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  onClose?: () => void;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("other");
  const [refreshTick, setRefreshTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const rows = await getDocuments(tenantId, { entityType, entityId });
      setDocs(rows);
    } catch (err) {
      console.error(err);
      setError("Failed to load documents");
    }
  }, [tenantId, entityType, entityId]);

  // Flip back to loading during render whenever the fetch key changes (entity
  // or refresh tick) — the effect below refetches for the new key. `loading`
  // starts true, so the effect itself never sets state synchronously.
  const fetchKey = `${tenantId}|${entityType}|${entityId}|${refreshTick}`;
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey);
  if (prevFetchKey !== fetchKey) {
    setPrevFetchKey(fetchKey);
    setLoading(true);
  }

  useEffect(() => {
    let active = true;
    getDocuments(tenantId, { entityType, entityId })
      .then((rows) => {
        if (!active) return;
        setDocs(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setError("Failed to load documents");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId, entityType, entityId, refreshTick]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadDocumentForEntity(tenantId, { entityType, entityId, category, file });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    try {
      await deleteDocument(tenantId, id);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Documents — {entityLabel}</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">Upload</label>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={uploading}
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
          />
        </div>
      </div>

      {error && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading documents…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-slate-500">No documents yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <a
                href={`/api/files/${d.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
              >
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="max-w-[200px] truncate">{d.filename}</span>
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] uppercase text-slate-600">
                  {d.category}
                </span>
                <span className="text-[11px] text-slate-400">({(d.sizeBytes / 1024).toFixed(1)} KB)</span>
              </a>
              <button
                onClick={() => handleDelete(d.id)}
                className="rounded p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                aria-label="Delete document"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

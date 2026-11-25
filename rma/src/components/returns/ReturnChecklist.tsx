"use client";

import { useState } from "react";
import { saveReturnChecklist, sendReturnChecklist, type ReturnChecklist as CL } from "@/modules/rental/return-checklist";

/**
 * Return checklist for one rental (owner 2026-07-26): before closing, tick
 * fines / Salik / parking / defects, then Save and Send to the deal's agent
 * over WhatsApp/Telegram. Manual today (Salik/fines are on iTransport).
 * The former second recipient (a returns/fines coordinator) is gone — owner,
 * 2026-08-05; see modules/rental/return-checklist.ts.
 */
type ItemKey = "fines" | "salik" | "parking";
const AMOUNT_ITEMS: { key: ItemKey; label: string }[] = [
  { key: "fines", label: "Fines" },
  { key: "salik", label: "Salik" },
  { key: "parking", label: "Parking" },
];

export default function ReturnChecklist({
  tenantId,
  rentalId,
  initial,
}: {
  tenantId: string;
  rentalId: string;
  initial?: CL | null;
}) {
  const [open, setOpen] = useState(false);
  const [cl, setCl] = useState<CL>(initial ?? {});
  const [busy, setBusy] = useState<"save" | "send" | null>(null);
  const [done, setDone] = useState<string>(initial?.sentAt ? "Sent" : "");

  const set = (k: ItemKey, patch: Partial<{ checked: boolean; amount: number | null; note: string | null }>) =>
    setCl((c) => ({ ...c, [k]: { checked: false, ...c[k], ...patch } }));
  const setDefects = (patch: Partial<{ checked: boolean; note: string | null }>) =>
    setCl((c) => ({ ...c, defects: { checked: false, ...c.defects, ...patch } }));

  async function save() {
    setBusy("save"); setDone("");
    try { await saveReturnChecklist(tenantId, rentalId, cl); setDone("Saved"); }
    catch { setDone("Error"); } finally { setBusy(null); }
  }
  async function send() {
    setBusy("send"); setDone("");
    try { await saveReturnChecklist(tenantId, rentalId, cl); const r = await sendReturnChecklist(tenantId, rentalId); setDone(`Sent (${r.sent})`); }
    catch { setDone("Send failed"); } finally { setBusy(null); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 w-full rounded-field border border-line px-3 py-1.5 text-xs font-medium text-ink-2 hover:border-brand-300">
        📋 Return checklist{done ? ` · ${done}` : ""}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-field border border-line bg-surface p-2 text-xs">
      {AMOUNT_ITEMS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-2 py-1">
          <input type="checkbox" checked={cl[key]?.checked ?? false} onChange={(e) => set(key, { checked: e.target.checked })} />
          <span className="w-16 text-ink">{label}</span>
          <input type="number" placeholder="AED" value={cl[key]?.amount ?? ""} onChange={(e) => set(key, { amount: e.target.value ? Number(e.target.value) : null })}
            className="w-20 rounded border border-line px-1.5 py-0.5" />
          <input type="text" placeholder="note" value={cl[key]?.note ?? ""} onChange={(e) => set(key, { note: e.target.value })}
            className="min-w-0 flex-1 rounded border border-line px-1.5 py-0.5" />
        </div>
      ))}
      <div className="flex items-center gap-2 py-1">
        <input type="checkbox" checked={cl.defects?.checked ?? false} onChange={(e) => setDefects({ checked: e.target.checked })} />
        <span className="w-16 text-ink">Defects</span>
        <input type="text" placeholder="description" value={cl.defects?.note ?? ""} onChange={(e) => setDefects({ note: e.target.value })}
          className="min-w-0 flex-1 rounded border border-line px-1.5 py-0.5" />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button onClick={save} disabled={busy !== null} className="rounded-field border border-line px-3 py-1 font-medium text-ink-2">
          {busy === "save" ? "…" : "Save"}
        </button>
        <button onClick={send} disabled={busy !== null} className="rounded-field bg-brand-600 px-3 py-1 font-medium text-white">
          {busy === "send" ? "…" : "Send to owner"}
        </button>
        {done && <span className="text-ink-3">{done}</span>}
      </div>
    </div>
  );
}

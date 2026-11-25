"use client";

import { useState, useTransition } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { Phone, PhoneOutgoing, PhoneIncoming } from "lucide-react";
import { startCall, getLeadCalls } from "@/modules/crm/call-actions";
import { formatDateTime } from "@/lib/format";

type CallRow = Awaited<ReturnType<typeof getLeadCalls>>[number];

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  completed: "success",
  "in-progress": "info",
  ringing: "info",
  initiated: "neutral",
  "no-answer": "warning",
  busy: "warning",
  missed: "danger",
  failed: "danger",
};

function fmtDuration(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function CallSection({
  tenantId,
  leadId,
  initialCalls,
}: {
  tenantId: string;
  leadId: string;
  initialCalls: CallRow[];
}) {
  const [calls, setCalls] = useState<CallRow[]>(initialCalls);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function call() {
    setError(null);
    startTransition(async () => {
      const res = await startCall(tenantId, leadId);
      if (!res.ok) {
        setError(res.error ?? "Call failed");
        return;
      }
      setCalls(await getLeadCalls(tenantId, leadId));
    });
  }

  // Compact when there is nothing to show — an empty half-page block is
  // noise (owner UX review 2026-07-30).
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-2">Calls</h2>
        <Button size="sm" onClick={call} disabled={pending}>
          <Phone className="h-4 w-4" /> {pending ? "Calling…" : "Call client"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {calls.length > 0 && (
        <ul className="mt-3 space-y-2">
          {calls.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {c.direction === "outbound" ? (
                  <PhoneOutgoing className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                ) : (
                  <PhoneIncoming className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                )}
                <span className="truncate text-ink-2">
                  {c.managerName ?? "—"} · {formatDateTime(c.createdAt)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {c.durationSec != null && <span className="text-xs text-ink-3 tnum">{fmtDuration(c.durationSec)}</span>}
                <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>{c.status}</Badge>
                {c.recordingUrl && (
                  <a href={c.recordingUrl} target="_blank" className="text-xs text-brand-600 hover:underline">
                    rec
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setLeadStatus } from "@/modules/crm/actions";
import { Card, CardHeader, cx } from "@/components/ui";

const STAGES = ["new", "contacted", "qualified", "lost"] as const;
type LeadStageStatus = (typeof STAGES)[number];

const LABEL: Record<LeadStageStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  lost: "Lost",
};

/** Bitrix-familiar clickable stage chevron: new -> contacted -> qualified -> lost. */
export function LeadStageBar({
  tenantId,
  leadId,
  status,
}: {
  tenantId: string;
  leadId: string;
  status: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<string>(status);
  const [pending, setPending] = useState<LeadStageStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(s: LeadStageStatus) {
    if (s === current || pending) return;
    setError(null);
    setPending(s);
    try {
      await setLeadStatus(tenantId, leadId, s);
      setCurrent(s);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update status.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Lead status" />
      <div className="flex flex-wrap items-center gap-2 p-4">
        {STAGES.map((s, i) => {
          const active = s === current;
          const isLost = s === "lost";
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-ink-3">→</span>}
              <button
                type="button"
                onClick={() => handleClick(s)}
                disabled={pending !== null}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-field border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                  active
                    ? isLost
                      ? "border-danger bg-danger-soft text-danger"
                      : "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-line bg-surface text-ink-2 hover:bg-sunken",
                  pending === s && "opacity-60"
                )}
              >
                {LABEL[s]}
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="px-4 pb-3 text-sm text-danger">{error}</p>}
    </Card>
  );
}

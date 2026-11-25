"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button, Select } from "@/components/ui";
import { useTransition } from "react";
import { dealStageOptions } from "@/modules/crm/stages";

const STATUSES = ["open", "won", "lost"] as const;

export default function DealsFilters({
  tenantSlug,
  status,
  stage,
  myDeals,
}: {
  tenantSlug: string;
  status?: string;
  stage?: string;
  myDeals?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function apply(next: { status?: string; stage?: string; myDeals?: string }) {
    const params = new URLSearchParams();
    const s = next.status !== undefined ? next.status : status;
    const st = next.stage !== undefined ? next.stage : stage;
    const my = next.myDeals !== undefined ? next.myDeals : myDeals;
    if (s) params.set("status", s);
    if (st) params.set("stage", st);
    if (my) params.set("myDeals", my);
    // Filter change always resets to page 1 (page param is simply omitted).
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  const isMyDeals = myDeals === "1";

  return (
    <fieldset disabled={pending} aria-label="Deal filters" aria-busy={pending} className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => apply({ myDeals: isMyDeals ? "" : "1" })}
        aria-pressed={isMyDeals}
        className={
          isMyDeals
            ? "rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white"
            : "rounded-full bg-sunken px-3 py-1 text-xs font-medium text-ink-2 transition-colors hover:bg-line hover:text-ink"
        }
      >
        My Deals
      </button>
      <Select
        aria-label="Filter by status"
        value={status ?? ""}
        onChange={(e) => apply({ status: e.target.value })}
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Filter by stage"
        value={stage ?? ""}
        onChange={(e) => apply({ stage: e.target.value })}
      >
        <option value="">All stages</option>
        {dealStageOptions(tenantSlug).map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>
      {(status || stage || isMyDeals) && <Button size="sm" variant="ghost" onClick={() => apply({ status: "", stage: "", myDeals: "" })}>Clear filters</Button>}
      {pending && <span role="status" className="text-xs text-ink-3">Updating…</span>}
    </fieldset>
  );
}

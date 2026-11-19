"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { payRentalCharge } from "@/modules/rental-charges/actions";

export function ChargePaymentButton({ tenantId, tenantSlug, chargeId, disabled }: {
  tenantId: string;
  tenantSlug: string;
  chargeId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [method, setMethod] = useState("bank_transfer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (!confirm("Confirm that the full charge payment was actually received?")) return;
    setBusy(true);
    setError(null);
    try {
      const result = await payRentalCharge(tenantId, tenantSlug, chargeId, method);
      if (result.unblockErrors.length > 0) setError(`Payment saved. Engine unblock needs attention: ${result.unblockErrors.join("; ")}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <select aria-label="Charge payment method" value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-field border border-line bg-surface px-2 py-1 text-xs">
        <option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option>
      </select>
      <Button size="sm" variant="secondary" disabled={disabled || busy} onClick={pay}>{busy ? "Saving…" : "Confirm paid"}</Button>
      {error && <span role="alert" className="basis-full text-xs text-danger">{error}</span>}
    </span>
  );
}

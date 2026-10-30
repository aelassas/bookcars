"use client";

import { useEffect, useState } from "react";
import { createRentalFromQuote } from "@/modules/rental/actions";
import { getRentalQuote, type RentalQuoteResult } from "@/modules/rental/queries";
import { BOOKING_BASIS, BOOKING_BASIS_LABEL } from "@/modules/rental/booking";
import { CustomerSearch } from "@/components/ui/CustomerSearch";
import { Button, Input, Select, Label, Textarea, cx } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/format";

type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; quote: Extract<RentalQuoteResult, { ok: true }>["quote"] }
  | { status: "none"; error: string };

/**
 * New Booking — the money-flow entry point. Price is quoted LIVE from the
 * imported price_tier data (quoteRental) as soon as vehicle + dates are
 * picked; the user confirms the quote, never types the rate. Manual rate is
 * only offered as a clearly-flagged fallback when the vehicle has no tiers.
 */
export function CreateRentalModal({
  tenantId,
  tenantSlug,
  actorId,
  vehicles,
  dealId,
  leadId,
  initialVehicleId,
  initialStartDate,
  initialReturnDate,
  initialCustomerName,
  onClose,
  onCreated,
}: {
  tenantId: string;
  tenantSlug: string;
  actorId: string | undefined;
  vehicles: Array<{ id: string; make: string; model: string; plate: string; dailyRate?: number }>;
  /** Set when launched from a deal — links the rental back to the deal (and its lead). */
  dealId?: string;
  leadId?: string;
  initialVehicleId?: string;
  initialStartDate?: string; // yyyy-mm-dd
  initialReturnDate?: string; // yyyy-mm-dd
  /** Prefill the customer searchbox (e.g. launched from a lead card). */
  initialCustomerName?: string;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? "");
  const [startDate, setStartDate] = useState(initialStartDate ?? "");
  const [returnDate, setReturnDate] = useState(initialReturnDate ?? "");
  const [channel, setChannel] = useState<"b2c" | "b2b">("b2c");
  // When launched pre-seeded (vehicle + dates from a deal), the mount effect
  // immediately prices — so the quote starts in "loading", not "idle".
  const [quote, setQuote] = useState<QuoteState>(() =>
    initialVehicleId && initialStartDate && initialReturnDate
      ? { status: "loading" }
      : { status: "idle" }
  );

  // Live quote: re-price whenever vehicle / dates / channel change. The
  // idle/loading flip happens as a render-time adjustment so the effect only
  // sets state from async callbacks.
  const quoteKey = `${tenantId}|${vehicleId}|${startDate}|${returnDate}|${channel}`;
  const [prevQuoteKey, setPrevQuoteKey] = useState(quoteKey);
  if (prevQuoteKey !== quoteKey) {
    setPrevQuoteKey(quoteKey);
    setQuote(!vehicleId || !startDate || !returnDate ? { status: "idle" } : { status: "loading" });
  }

  useEffect(() => {
    if (!vehicleId || !startDate || !returnDate) {
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      getRentalQuote(tenantId, vehicleId, startDate, returnDate, channel)
        .then((res) => {
          if (cancelled) return;
          if (res.ok) setQuote({ status: "ok", quote: res.quote });
          else setQuote({ status: "none", error: res.error });
        })
        .catch(() => {
          if (!cancelled) setQuote({ status: "none", error: "Could not fetch a quote" });
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [tenantId, vehicleId, startDate, returnDate, channel]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (quote.status === "loading" || quote.status === "idle") return;
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    try {
      const res = await createRentalFromQuote(
        tenantId,
        actorId,
        {
          customerId: String(fd.get("customerId")),
          vehicleId,
          startDate: new Date(startDate),
          returnDate: new Date(returnDate),
          channel,
          bookingBasis: String(fd.get("bookingBasis") || "booked"),
          dealId,
          leadId,
          notes: String(fd.get("notes") || ""),
          // Manual pricing is only sent in the no-tier fallback.
          ...(quote.status === "none"
            ? {
                manualDailyRate: Number(fd.get("manualDailyRate") || 0),
                manualDeposit: Number(fd.get("manualDeposit") || 0),
              }
            : {}),
        },
        tenantSlug
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Failed to create rental");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = quote.status === "ok" || quote.status === "none";

  return (
    <Modal title="New booking" onClose={onClose} busy={submitting} protectChanges width="lg">
      {error && <ModalError>{error}</ModalError>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Customer *</Label>
            <CustomerSearch
              tenantId={tenantId}
              value={customerId}
              onChange={(id) => setCustomerId(id)}
              placeholder="Search customers…"
              initialValue={initialCustomerName ?? ""}
            />
          </div>
          <div>
            <Label>Vehicle *</Label>
            <Select
              name="vehicleId"
              required
              className="w-full"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} — {v.make} {v.model}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Start date *</Label>
            <Input
              name="startDate"
              type="date"
              required
              className="w-full"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Return date *</Label>
            <Input
              name="returnDate"
              type="date"
              required
              className="w-full"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Channel *</Label>
            <Select
              name="channel"
              required
              className="w-full"
              value={channel}
              onChange={(e) => setChannel(e.target.value === "b2b" ? "b2b" : "b2c")}
            >
              <option value="b2c">B2C</option>
              <option value="b2b">B2B</option>
            </Select>
          </div>
        </div>

        {/* Live quote from the real price tiers — this is what gets written. */}
        <div
          className={cx(
            "rounded-field border px-3 py-2.5 text-sm",
            quote.status === "ok"
              ? "border-success-line bg-success-soft"
              : quote.status === "none"
                ? "border-warn-line bg-warn-soft"
                : "border-line bg-sunken/50"
          )}
        >
          {quote.status === "idle" && <span className="text-ink-3">Pick a vehicle and dates to see the live quote.</span>}
          {quote.status === "loading" && <span className="text-ink-3">Quoting…</span>}
          {quote.status === "ok" && (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-semibold text-ink tnum">
                {formatCurrency(quote.quote.dailyRate)} / day × {quote.quote.days} day{quote.quote.days === 1 ? "" : "s"}
              </span>
              <span className="text-ink-2 tnum">Rental {formatCurrency(quote.quote.subtotal)}</span>
              <span className="text-ink-2 tnum">Deposit {formatCurrency(quote.quote.deposit)}</span>
              <span className="ml-auto font-semibold text-ink tnum">Total {formatCurrency(quote.quote.total)}</span>
            </div>
          )}
          {quote.status === "none" && (
            <div className="space-y-2">
              <div className="font-medium text-ink">{quote.error}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Manual daily rate (AED) *</Label>
                  <Input name="manualDailyRate" type="number" min={1} required className="w-full" placeholder="0" />
                </div>
                <div>
                  <Label>Deposit (AED)</Label>
                  <Input name="manualDeposit" type="number" min={0} className="w-full" placeholder="0" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <Label>Booking option *</Label>
          <Select name="bookingBasis" defaultValue="booked" required className="w-full">
            {BOOKING_BASIS.map((b) => (
              <option key={b} value={b}>
                {BOOKING_BASIS_LABEL[b]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea name="notes" rows={2} className="w-full" placeholder="Any additional info..." />
        </div>

        {dealId && (
          <p className="text-xs text-ink-3">This booking will be linked back to the deal it was created from.</p>
        )}

        <ModalFooter>
          <ModalCancel>Cancel</ModalCancel>
          <Button type="submit" disabled={submitting || !canSubmit}>
            {submitting ? "Creating..." : quote.status === "ok" ? `Confirm — ${formatCurrency(quote.quote.total)}` : "Create booking"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

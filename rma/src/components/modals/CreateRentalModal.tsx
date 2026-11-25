"use client";

import { useEffect, useState } from "react";
import { createRentalFromQuote } from "@/modules/rental/actions";
import { getRentalQuote, type RentalQuoteResult } from "@/modules/rental/queries";
import { BOOKING_BASIS, BOOKING_BASIS_LABEL } from "@/modules/rental/booking";
import { defaultDeposit, type CustomerType } from "@/modules/rental/pricing";
import { CustomerSearch } from "@/components/ui/CustomerSearch";
import { CreateCustomerModal } from "@/components/modals/CreateCustomerModal";
import { Button, Input, Select, Label, Textarea, cx } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/format";

type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; quote: Extract<RentalQuoteResult, { ok: true }>["quote"] }
  | { status: "none"; error: string };

/** New Booking: load the tier quote, then let the manager adjust the actual amounts. */
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
  const [customerName, setCustomerName] = useState(initialCustomerName ?? "");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? "");
  const [startDate, setStartDate] = useState(initialStartDate ?? "");
  const [returnDate, setReturnDate] = useState(initialReturnDate ?? "");
  const [channel, setChannel] = useState<"b2c" | "b2b">("b2c");
  const [customerType, setCustomerType] = useState<CustomerType>("tourist");
  const [dailyRate, setDailyRate] = useState("");
  const [deposit, setDeposit] = useState("");
  // When launched pre-seeded (vehicle + dates from a deal), the mount effect
  // immediately prices — so the quote starts in "loading", not "idle".
  const [quote, setQuote] = useState<QuoteState>(() =>
    initialVehicleId && initialStartDate && initialReturnDate
      ? { status: "loading" }
      : { status: "idle" }
  );

  // Live quote: re-price whenever vehicle / dates / channel / renter type change.
  // The idle/loading flip happens as a render-time adjustment so the effect only
  // sets state from async callbacks.
  const quoteKey = `${tenantId}|${vehicleId}|${startDate}|${returnDate}|${channel}|${customerType}`;
  const [prevQuoteKey, setPrevQuoteKey] = useState(quoteKey);
  if (prevQuoteKey !== quoteKey) {
    setPrevQuoteKey(quoteKey);
    setQuote(!vehicleId || !startDate || !returnDate ? { status: "idle" } : { status: "loading" });
    setDailyRate("");
    setDeposit("");
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
          if (res.ok) {
            setQuote({ status: "ok", quote: res.quote });
            setDailyRate(String(res.quote.dailyRate));
            setDeposit(String(defaultDeposit(customerType, res.quote.deposit)));
          } else {
            setQuote({ status: "none", error: res.error });
            setDeposit(String(defaultDeposit(customerType)));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setQuote({ status: "none", error: "Could not fetch a quote" });
            setDeposit(String(defaultDeposit(customerType)));
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [tenantId, vehicleId, startDate, returnDate, channel, customerType]);

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
          customerType,
          bookingBasis: String(fd.get("bookingBasis") || "booked"),
          dealId,
          leadId,
          notes: String(fd.get("notes") || ""),
          dailyMileageLimitKm: Number(fd.get("dailyMileageLimitKm")) || undefined,
          manualDailyRate: Number(dailyRate || 0),
          manualDeposit: Number(deposit || 0),
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

  const quoteDays = quote.status === "ok"
    ? quote.quote.days
    : Math.max(1, Math.ceil((new Date(returnDate).getTime() - new Date(startDate).getTime()) / 86_400_000) || 1);
  const rentalSubtotal = Number(dailyRate || 0) * quoteDays;
  const confirmTotal = rentalSubtotal + Number(deposit || 0);
  const canSubmit =
    (quote.status === "ok" || quote.status === "none") &&
    Number.isInteger(Number(dailyRate)) && Number(dailyRate) > 0 &&
    deposit !== "" && Number.isInteger(Number(deposit)) && Number(deposit) >= 0;

  return (
    <>
    <Modal title="New booking" onClose={onClose} busy={submitting} protectChanges width="lg">
      {error && <ModalError>{error}</ModalError>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <Label>Customer *</Label>
              <button type="button" className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setShowCustomerModal(true)}>
                + New customer
              </button>
            </div>
            <CustomerSearch
              key={customerId || "customer-search"}
              tenantId={tenantId}
              value={customerId}
              onChange={(id, name) => { setCustomerId(id); setCustomerName(name); }}
              placeholder="Search customers…"
              initialValue={customerName}
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

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
          <div>
            <Label>Renter *</Label>
            <Select
              name="customerType"
              required
              className="w-full"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value === "resident" ? "resident" : "tourist")}
            >
              <option value="tourist">Tourist</option>
              <option value="resident">Local / UAE resident</option>
            </Select>
          </div>
        </div>

        <div
          className={cx(
            "space-y-3 rounded-field border px-3 py-2.5 text-sm",
            quote.status === "ok"
              ? "border-success-line bg-success-soft"
              : quote.status === "none"
                ? "border-warn-line bg-warn-soft"
                : "border-line bg-sunken/50"
          )}
        >
          {quote.status === "idle" && <span className="text-ink-3">Pick a vehicle and dates to see the live quote.</span>}
          {quote.status === "loading" && <span className="text-ink-3">Quoting…</span>}
          {quote.status === "none" && <div className="font-medium text-ink">{quote.error}. Enter a custom daily rate.</div>}
          {(quote.status === "ok" || quote.status === "none") && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Daily rate (AED) *</Label>
                  <Input name="dailyRate" type="number" min={1} step={1} required className="w-full" placeholder="0" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
                </div>
                <div>
                  <Label>Deposit (AED) *</Label>
                  <Input name="deposit" type="number" min={0} step={1} required className="w-full" placeholder="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-ink-2 tnum">Rent {formatCurrency(rentalSubtotal)} ({quoteDays} day{quoteDays === 1 ? "" : "s"})</span>
                <span className="text-ink-2 tnum">Deposit {formatCurrency(Number(deposit || 0))}</span>
                <span className="ml-auto font-semibold text-ink tnum">Total incl. deposit {formatCurrency(confirmTotal)}</span>
              </div>
              <p className="text-xs text-ink-3">Tier prices load automatically. Both amounts are editable; tourist deposit defaults to AED 1,500 and local/UAE resident to AED 0.</p>
            </>
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
          <Label>Mileage allowance per paid day (km)</Label>
          <Input name="dailyMileageLimitKm" type="number" min={1} step={1} defaultValue={150} className="w-full" />
          <p className="mt-1 text-xs text-ink-3">One shared limit for the whole rental: 3 days = 450 km; 30 days = 4,500 km. No separate daily cap. Clear the field for unlimited mileage.</p>
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
            {submitting ? "Creating..." : confirmTotal > 0 ? `Confirm — ${formatCurrency(confirmTotal)}` : "Create booking"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
    {showCustomerModal && (
      <CreateCustomerModal
        tenantId={tenantId}
        onClose={() => setShowCustomerModal(false)}
        onCreated={(created) => {
          setCustomerId(created.id);
          setCustomerName(created.name);
          setShowCustomerModal(false);
        }}
      />
    )}
    </>
  );
}

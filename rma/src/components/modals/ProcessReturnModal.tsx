"use client";

import { useState, useMemo } from "react";
import { Star } from "lucide-react";
import { processReturn } from "@/modules/rental/actions";
import { calculateReturnCharges } from "@/modules/rental/return-charges";
import { formatDate, formatCurrency } from "@/lib/format";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { Modal, ModalFooter, ModalError, ModalCancel } from "@/components/ui/Modal";

export function ProcessReturnModal({
  tenantId,
  tenantSlug,
  actorId,
  rental,
  onClose,
  onReturned,
}: {
  tenantId: string;
  tenantSlug: string;
  actorId?: string;
  rental: {
    id: string;
    returnDate: Date | null;
    dailyRate: number;
    balanceDue: number;
    dailyMileageLimitKm?: number | null;
    startOdometer?: number | null;
  };
  onClose: () => void;
  onReturned?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const expectedReturn = rental.returnDate ? rental.returnDate.toISOString().slice(0, 10) : today;

  const [actualReturnDate, setActualReturnDate] = useState(expectedReturn);
  const [customerRating, setCustomerRating] = useState(0);
  const [extraCharge, setExtraCharge] = useState("0");
  const [extraReason, setExtraReason] = useState("");

  const lateFee = useMemo(() => {
    if (!rental.returnDate || !actualReturnDate) return 0;
    return calculateReturnCharges({
      returnDate: rental.returnDate,
      actualReturnDate: new Date(actualReturnDate),
      dailyRate: rental.dailyRate,
    }).lateFee;
  }, [actualReturnDate, rental.returnDate, rental.dailyRate]);

  const totalExtra = lateFee + (Number(extraCharge) || 0);
  const newBalance = rental.balanceDue + totalExtra;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    try {
      await processReturn(
        tenantId,
        actorId,
        rental.id,
        {
          actualReturnDate: new Date(String(fd.get("actualReturnDate"))),
          finalOdometer: String(fd.get("finalOdometer")) === "" ? undefined : Number(fd.get("finalOdometer")),
          fuelLevel: String(fd.get("fuelLevel")) === "" ? undefined : Number(fd.get("fuelLevel")),
          damageNotes: String(fd.get("damageNotes") || ""),
          customerRating: customerRating || undefined,
          extraChargeAmount: Number(extraCharge) || 0,
          extraChargeReason: extraReason || undefined,
        },
        tenantSlug
      );
      onReturned?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Process Return" onClose={onClose} busy={submitting} protectChanges width="lg">
      {error && <ModalError>{error}</ModalError>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Actual Return Date *</Label>
            <Input
              name="actualReturnDate"
              type="date"
              required
              value={actualReturnDate}
              onChange={(e) => setActualReturnDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label>Expected Return</Label>
            <div className="mt-2 text-sm text-ink-2 tnum">{formatDate(rental.returnDate)}</div>
          </div>
        </div>

        {lateFee > 0 && (
          <div className="rounded-field border border-warn-line bg-warn-soft px-3 py-2 text-sm text-warn tnum">
            Late return · {formatCurrency(lateFee)} extra fee
          </div>
        )}

        {rental.dailyMileageLimitKm != null && (
          <div className="rounded-field border border-line bg-sunken px-3 py-2 text-sm text-ink-2">
            Allowance: {rental.dailyMileageLimitKm} km per paid day, shared across the whole rental
            {rental.startOdometer != null ? ` · start odometer: ${rental.startOdometer} km` : " · start odometer was not recorded"}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Final Odometer (km)</Label>
            <Input name="finalOdometer" type="number" min={0} className="w-full" />
          </div>
          <div>
            <Label>Fuel Level (%)</Label>
            <Input name="fuelLevel" type="number" min={0} max={100} className="w-full" />
          </div>
        </div>

        <div>
          <Label>Customer rating</Label>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Customer rating from 1 to 5">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                role="radio"
                aria-checked={customerRating === rating}
                aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
                onClick={() => setCustomerRating(customerRating === rating ? 0 : rating)}
                className="rounded-field p-1 text-amber-500 transition hover:bg-amber-50"
              >
                <Star className="h-6 w-6" fill={rating <= customerRating ? "currentColor" : "none"} />
              </button>
            ))}
            <span className="ml-2 text-sm text-ink-3">{customerRating ? `${customerRating}/5` : "Not rated"}</span>
          </div>
        </div>

        <div>
          <Label>Damage / Inspection Notes</Label>
          <Textarea
            name="damageNotes"
            rows={2}
            className="w-full"
            placeholder="Scratches, mileage, cleanliness..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Extra Charge (AED)</Label>
            <Input
              type="number"
              min={0}
              value={extraCharge}
              onChange={(e) => setExtraCharge(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label>Reason</Label>
            <Input
              type="text"
              value={extraReason}
              onChange={(e) => setExtraReason(e.target.value)}
              placeholder="Fuel, damage, cleaning..."
              className="w-full"
            />
          </div>
        </div>

        <div className="rounded-field border border-line bg-sunken px-3 py-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-2">Previous balance</span>
            <span className="font-medium text-ink tnum">{formatCurrency(rental.balanceDue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-2">Total extra</span>
            <span className="font-medium text-danger tnum">+{formatCurrency(totalExtra)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-line pt-1">
            <span className="font-medium text-ink-2">New balance due</span>
            <span className="font-semibold text-ink tnum">{formatCurrency(newBalance)}</span>
          </div>
        </div>

        <ModalFooter>
          <ModalCancel>Cancel</ModalCancel>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Processing..." : "Confirm Return"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

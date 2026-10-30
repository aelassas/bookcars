"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { CalendarPlus } from "lucide-react";
import { CreateRentalModal } from "@/components/modals/CreateRentalModal";

// "Book this customer" on the lead card — jumps straight into the booking
// modal with the customer's name prefilled and the lead linked back (owner:
// "calendar addable next rent from anywhere, history clickable").
export function LeadBookingButton({
  tenantId,
  tenantSlug,
  actorId,
  vehicles,
  leadId,
  customerName,
}: {
  tenantId: string;
  tenantSlug: string;
  actorId?: string;
  vehicles: Array<{ id: string; make: string; model: string; plate: string }>;
  leadId: string;
  customerName: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Book this customer
      </Button>
      {open && (
        <CreateRentalModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          actorId={actorId}
          vehicles={vehicles}
          leadId={leadId}
          initialCustomerName={customerName ?? ""}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

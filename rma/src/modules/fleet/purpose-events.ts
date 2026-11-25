// purpose-events.ts — custody/purpose markers on a car's timeline.
//
// The brands share ONE physical fleet; a car moves rent → lease/sale → rent.
// Each move is recorded as a `purpose_change` event on vehicle_timeline_event
// so the car's history reads honestly ("Аренда → Лизинг on 12 Jul"). These are
// point-in-time markers with type='purpose_change', so they never trip the
// vehicle_rental_no_overlap exclusion constraint (which only covers rentals).
//
// NOT a "use server" module: it takes a live drizzle `tx` and is called from
// inside the lease/rental create transactions (mirrors modules/crm/chat-shared)
// so the marker commits atomically with the transition that caused it.

import { vehicleTimelineEvent } from "@/platform/db/schema";
import type { db } from "@/platform/db/client";

export type VehiclePurpose = "rent" | "lease" | "sale" | "return";

const PURPOSE_TITLE: Record<VehiclePurpose, string> = {
  rent: "→ Rent",
  lease: "→ Lease",
  sale: "→ Sale",
  return: "→ Back to fleet",
};

// Nominal 1h footprint so the instantaneous marker renders as a small visible
// bar in every calendar view without special-casing zero-length events.
const MARKER_MS = 60 * 60 * 1000;

export interface PurposeChangeInput {
  tenantId: string;
  vehicleId: string;
  purpose: VehiclePurpose;
  fromCompanyId?: string | null;
  toCompanyId?: string | null;
  note?: string | null;
  at?: Date;
}

/**
 * Insert one purpose_change marker inside an existing withDrizzleTenant(tx)
 * transaction. `tx` is typed as `typeof db` — the same shape the fleet
 * timeline actions use.
 */
export async function insertPurposeChangeEvent(
  tx: typeof db,
  input: PurposeChangeInput
): Promise<void> {
  const startsAt = input.at ?? new Date();
  const endsAt = new Date(startsAt.getTime() + MARKER_MS);
  await tx.insert(vehicleTimelineEvent).values({
    tenantId: input.tenantId,
    vehicleId: input.vehicleId,
    type: "purpose_change",
    startsAt,
    endsAt,
    status: "done",
    title: PURPOSE_TITLE[input.purpose],
    meta: {
      purpose: input.purpose,
      fromCompanyId: input.fromCompanyId ?? null,
      toCompanyId: input.toCompanyId ?? null,
      note: input.note ?? null,
    },
  });
}

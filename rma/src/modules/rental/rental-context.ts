// Cross-reference a WhatsApp conversation to the car the person is actually
// renting, from Babek's sheet. The sheet imports rentals/customers into the
// fleet-home tenant (take-auto) keyed by customer NAME (the sheet carries no
// phone), so the only bridge from a chat to a car is the contact's name.
//
// Plain module (no "use server"): it takes a live-safe name string, reads only
// the shared fleet-home tenant, and returns display data — same shape/risk as
// fleet-home.ts. Callers are already-authorized server components.
import { and, desc, eq, sql } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { rental, customer, vehicle, company, user } from "@/platform/db/schema";
import { fleetHomeTenantId } from "@/modules/fleet/fleet-home";

export type RentalContext = {
  car: string;
  plate: string | null;
  brand: string | null;
  responsible: string | null;
  startDate: string | null;
  returnDate: string | null;
  /** true while the car is still out (not yet actually returned). */
  active: boolean;
};

// Rental statuses that mean "car is out / live" — anything not settled.
const LIVE_STATUSES = ["active", "open", "due_today", "overdue", "reserved"];

/**
 * The car this contact is renting (or last rented), matched by exact
 * normalised name against the sheet's customers. Prefers a live rental; falls
 * back to the most recent one so a chat still shows "last rented CAR X".
 * Returns null when the name is empty or no rental matches.
 */
export async function getRentalForContactName(name: string | null | undefined): Promise<RentalContext | null> {
  const clean = (name ?? "").trim();
  if (clean.length < 2) return null;

  const home = await fleetHomeTenantId();
  if (!home) return null;

  return withDrizzleTenant(home, async (tx) => {
    // Ambiguity guard: a common first-name ("Abdullah", "Ali") can belong to
    // several rental customers — we cannot tell which one is chatting, so we
    // refuse to guess. Only link when EXACTLY ONE rental customer bears this
    // name (same discipline as backfillLeadLinks skipping shared phones).
    const [{ n }] = await tx
      .select({ n: sql<number>`count(distinct ${customer.id})::int` })
      .from(rental)
      .innerJoin(customer, eq(customer.id, rental.customerId))
      .where(and(eq(rental.tenantId, home), sql`lower(trim(${customer.name})) = lower(${clean})`));
    if (n !== 1) return null;

    const rows = await tx
      .select({
        make: vehicle.make,
        model: vehicle.model,
        plate: vehicle.plate,
        brand: company.name,
        responsible: user.name,
        startDate: rental.startDate,
        returnDate: rental.returnDate,
        actualReturnDate: rental.actualReturnDate,
        status: rental.status,
      })
      .from(rental)
      .innerJoin(customer, eq(customer.id, rental.customerId))
      .innerJoin(vehicle, eq(vehicle.id, rental.vehicleId))
      .leftJoin(company, eq(company.id, vehicle.companyId))
      .leftJoin(user, eq(user.id, rental.salesAgentId))
      .where(and(eq(rental.tenantId, home), sql`lower(trim(${customer.name})) = lower(${clean})`))
      // Still-out rentals first (no actual return yet), then the newest.
      .orderBy(sql`(${rental.actualReturnDate} IS NULL) DESC`, desc(rental.startDate))
      .limit(1);

    const r = rows[0];
    if (!r) return null;

    const iso = (d: Date | string | null) => (d == null ? null : (d instanceof Date ? d : new Date(d)).toISOString());
    return {
      car: [r.make, r.model].filter(Boolean).join(" ").trim() || "—",
      plate: r.plate ?? null,
      brand: r.brand ?? null,
      responsible: r.responsible ?? null,
      startDate: iso(r.startDate),
      returnDate: iso(r.returnDate),
      active: r.actualReturnDate == null && LIVE_STATUSES.includes(r.status),
    };
  });
}

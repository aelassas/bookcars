"use server";

import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { vehicleTimelineEvent, rental, auditEvent } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { requireAuth, requireTenantAdmin } from "@/platform/auth/authorization";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { canManageFleetForTenant } from "./policies";
import type { VehicleTimelineEventType } from "./timeline-queries";

/** SQLSTATE for exclusion_violation — the double-booking guard firing. */
const PG_EXCLUSION_VIOLATION = "23P01";

const OVERLAP_MESSAGE = "This car is already booked for that period";

export interface AddTimelineEventInput {
  vehicleId: string;
  type: VehicleTimelineEventType;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  title?: string | null;
  status?: string | null;
  rentalId?: string | null;
  documentId?: string | null;
  meta?: Record<string, unknown> | null;
}

/** Accept both Date and ISO string — the client/server action boundary serialises Dates. */
function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

function isExclusionViolation(err: unknown): boolean {
  const code = (err as { code?: string; cause?: { code?: string } })?.code
    ?? (err as { cause?: { code?: string } })?.cause?.code;
  return code === PG_EXCLUSION_VIOLATION;
}

/**
 * Put one event on a car's timeline.
 *
 * Overlapping rentals are rejected by the database (see the
 * vehicle_rental_no_overlap exclusion constraint in 0041) — a check here could
 * not close the race between two agents booking the same car at once. We catch
 * the resulting 23P01 and turn it into a sentence a manager can act on.
 */
export async function addTimelineEvent(
  slug: string,
  input: AddTimelineEventInput,
): Promise<{ id: string }> {
  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden: not a member of this tenant");
  await assertNotPreviewMode(t.id);
  await canManageFleetForTenant(t.id);
  const actorId = await requireAuth();

  const startsAt = toDate(input.startsAt);
  const endsAt = input.endsAt ? toDate(input.endsAt) : null;
  if (Number.isNaN(startsAt.getTime())) throw new Error("Invalid start date");
  if (endsAt && Number.isNaN(endsAt.getTime())) throw new Error("Invalid end date");
  if (endsAt && endsAt <= startsAt) throw new Error("End must be after start");

  try {
    return await withDrizzleTenant(t.id, async (tx) => {
      const [row] = await tx
        .insert(vehicleTimelineEvent)
        .values({
          tenantId: t.id,
          vehicleId: input.vehicleId,
          type: input.type,
          startsAt,
          endsAt,
          status: input.status ?? "planned",
          title: input.title ?? null,
          rentalId: input.rentalId ?? null,
          documentId: input.documentId ?? null,
          meta: input.meta ?? null,
        })
        .returning({ id: vehicleTimelineEvent.id });

      await tx.insert(auditEvent).values({
        tenantId: t.id,
        actorId,
        action: "vehicle_timeline.add",
        entityType: "vehicle",
        entityId: input.vehicleId,
        intent: `${input.type}:${row.id}`,
      });

      return { id: row.id };
    });
  } catch (err) {
    if (isExclusionViolation(err)) throw new Error(OVERLAP_MESSAGE);
    throw err;
  } finally {
    revalidatePath(`/${slug}/fleet/${input.vehicleId}`);
  }
}

/**
 * Cancel an event. Rentals are never deleted — cancelling flips the status,
 * which drops the row out of the exclusion constraint's WHERE clause and frees
 * the slot, while the history stays on the timeline.
 */
export async function cancelTimelineEvent(slug: string, eventId: string): Promise<void> {
  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden: not a member of this tenant");
  await assertNotPreviewMode(t.id);
  await canManageFleetForTenant(t.id);
  const actorId = await requireAuth();

  const vehicleId = await withDrizzleTenant(t.id, async (tx) => {
    const [row] = await tx
      .select({ id: vehicleTimelineEvent.id, vehicleId: vehicleTimelineEvent.vehicleId })
      .from(vehicleTimelineEvent)
      .where(eq(vehicleTimelineEvent.id, eventId))
      .limit(1);
    if (!row) throw new Error("Event not found");

    await tx
      .update(vehicleTimelineEvent)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(vehicleTimelineEvent.id, eventId));

    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "vehicle_timeline.cancel",
      entityType: "vehicle",
      entityId: row.vehicleId,
      intent: eventId,
    });

    return row.vehicleId;
  });

  revalidatePath(`/${slug}/fleet/${vehicleId}`);
}

/** Map a rental's status onto the timeline vocabulary (planned|active|done|cancelled). */
function rentalStatusToTimeline(status: string | null): string {
  switch (status) {
    case "cancelled":
      return "cancelled";
    case "returned":
    case "completed":
      return "done";
    case "active":
      return "active";
    default: // reserved / unknown — the car is held, not yet out
      return "planned";
  }
}

/**
 * Seed timelines from the rentals already in the system, so the calendars are
 * populated on day one instead of starting empty.
 *
 * Idempotent: a rental that already has an event is skipped (matched on
 * rental_id), so this can be re-run after new rentals land. Rows are inserted
 * one at a time and overlap violations are counted rather than thrown —
 * historical data predates the constraint and may genuinely double-book; one
 * bad pair must not abort the whole backfill.
 */
export async function backfillTimelineFromRentals(
  slug: string,
): Promise<{ created: number; skipped: number; conflicts: number }> {
  const t = await requireTenantAdmin(slug);
  await assertNotPreviewMode(t.id);
  const actorId = await requireAuth();

  const result = await withDrizzleTenant(t.id, async (tx) => {
    const pending = await tx
      .select({
        id: rental.id,
        vehicleId: rental.vehicleId,
        startDate: rental.startDate,
        returnDate: rental.returnDate,
        actualReturnDate: rental.actualReturnDate,
        status: rental.status,
      })
      .from(rental)
      .leftJoin(vehicleTimelineEvent, eq(vehicleTimelineEvent.rentalId, rental.id))
      .where(isNull(vehicleTimelineEvent.id));

    let created = 0;
    let conflicts = 0;

    for (const r of pending) {
      if (!r.startDate || !r.vehicleId) continue;
      try {
        await tx.transaction(async (inner) => {
          await inner.insert(vehicleTimelineEvent).values({
            tenantId: t.id,
            vehicleId: r.vehicleId,
            type: "rental",
            startsAt: r.startDate,
            endsAt: r.actualReturnDate ?? r.returnDate ?? null,
            status: rentalStatusToTimeline(r.status),
            title: null,
            rentalId: r.id,
            meta: { backfilled: true },
          });
        });
        created += 1;
      } catch (err) {
        if (isExclusionViolation(err)) {
          conflicts += 1;
          continue;
        }
        throw err;
      }
    }

    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "vehicle_timeline.backfill",
      entityType: "tenant",
      entityId: t.id,
      intent: `created=${created} conflicts=${conflicts}`,
    });

    return { created, skipped: pending.length - created - conflicts, conflicts };
  });

  revalidatePath(`/${slug}/fleet`);
  return result;
}

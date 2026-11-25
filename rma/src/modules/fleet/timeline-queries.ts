"use server";

import { and, asc, desc, eq, gte, isNull, lte, ne, or, inArray } from "drizzle-orm";
import { vehicleTimelineEvent, document, rental } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { canManageFleetForTenant } from "./policies";

export type VehicleTimelineEventType =
  | "rental"
  | "maintenance"
  | "service"
  | "fine"
  | "handover"
  | "return"
  | "damage"
  | "document"
  // Custody/purpose marker: the car's purpose changed (rent ↔ lease ↔ sale).
  // meta = { purpose, fromCompanyId, toCompanyId, note }. Point-in-time, so it
  // never trips the rental overlap constraint (which only covers type='rental').
  | "purpose_change";

export interface VehicleTimelineEvent {
  id: string;
  vehicleId: string;
  type: VehicleTimelineEventType;
  startsAt: Date;
  endsAt: Date | null;
  status: string | null;
  title: string | null;
  rentalId: string | null;
  documentId: string | null;
  meta: Record<string, unknown> | null;
}

export interface VehicleDocumentRow {
  id: string;
  type: string | null;
  fileName: string | null;
  createdAt: Date;
  rentalId: string | null;
  /** Direct link — `document.public_url`; the UI links straight to it. */
  url: string | null;
}

/**
 * Events for one car intersecting [fromISO, toISO], oldest first.
 *
 * "Intersecting", not "starting inside": a two-week rental that began before
 * the visible month still occupies it, and must render. Open-ended events
 * (ends_at IS NULL) intersect every window at or after their start.
 */
export async function getVehicleTimeline(
  slug: string,
  vehicleId: string,
  fromISO: string,
  toISO: string,
): Promise<VehicleTimelineEvent[]> {
  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden: not a member of this tenant");
  await canManageFleetForTenant(t.id);

  const from = new Date(fromISO);
  const to = new Date(toISO);

  return withDrizzleTenant(t.id, async (tx) => {
    const rows = await tx
      .select()
      .from(vehicleTimelineEvent)
      .where(
        and(
          eq(vehicleTimelineEvent.vehicleId, vehicleId),
          lte(vehicleTimelineEvent.startsAt, to),
          or(
            isNull(vehicleTimelineEvent.endsAt),
            gte(vehicleTimelineEvent.endsAt, from),
          ),
        ),
      )
      .orderBy(asc(vehicleTimelineEvent.startsAt));

    return rows.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      type: r.type as VehicleTimelineEventType,
      startsAt: r.startsAt,
      endsAt: r.endsAt ?? null,
      status: r.status ?? null,
      title: r.title ?? null,
      rentalId: r.rentalId ?? null,
      documentId: r.documentId ?? null,
      meta: (r.meta as Record<string, unknown> | null) ?? null,
    }));
  });
}

/**
 * The car's service history — timeline events of type service/maintenance,
 * all-time, newest first. Powers the Service panel on the vehicle profile.
 * Cancelled rows are hidden: they were planning noise, not work done.
 */
export async function getVehicleServiceHistory(
  slug: string,
  vehicleId: string,
): Promise<VehicleTimelineEvent[]> {
  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden: not a member of this tenant");
  await canManageFleetForTenant(t.id);

  return withDrizzleTenant(t.id, async (tx) => {
    const rows = await tx
      .select()
      .from(vehicleTimelineEvent)
      .where(
        and(
          eq(vehicleTimelineEvent.vehicleId, vehicleId),
          inArray(vehicleTimelineEvent.type, ["service", "maintenance"]),
          or(
            isNull(vehicleTimelineEvent.status),
            ne(vehicleTimelineEvent.status, "cancelled"),
          ),
        ),
      )
      .orderBy(desc(vehicleTimelineEvent.startsAt))
      .limit(50);

    return rows.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      type: r.type as VehicleTimelineEventType,
      startsAt: r.startsAt,
      endsAt: r.endsAt ?? null,
      status: r.status ?? null,
      title: r.title ?? null,
      rentalId: r.rentalId ?? null,
      documentId: r.documentId ?? null,
      meta: (r.meta as Record<string, unknown> | null) ?? null,
    }));
  });
}

/**
 * The car's document dossier, newest first.
 *
 * `document` has no vehicle_id — it links polymorphically via
 * (entity_type, entity_id). A car's papers therefore live in two places:
 * attached to the vehicle itself (registration, insurance) and attached to its
 * rentals (contracts, handover photos). We return both, tagging each row with
 * the rental it came from so the UI can group them.
 */
export async function getVehicleDocuments(
  slug: string,
  vehicleId: string,
): Promise<VehicleDocumentRow[]> {
  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden: not a member of this tenant");
  await canManageFleetForTenant(t.id);

  return withDrizzleTenant(t.id, async (tx) => {
    const rentalRows = await tx
      .select({ id: rental.id })
      .from(rental)
      .where(eq(rental.vehicleId, vehicleId));
    const rentalIds = rentalRows.map((r) => r.id);

    const rows = await tx
      .select({
        id: document.id,
        category: document.category,
        filename: document.filename,
        createdAt: document.createdAt,
        entityType: document.entityType,
        entityId: document.entityId,
        publicUrl: document.publicUrl,
      })
      .from(document)
      .where(
        or(
          and(eq(document.entityType, "vehicle"), eq(document.entityId, vehicleId)),
          rentalIds.length
            ? and(eq(document.entityType, "rental"), inArray(document.entityId, rentalIds))
            : undefined,
        ),
      )
      .orderBy(desc(document.createdAt));

    return rows.map((r) => ({
      id: r.id,
      type: r.category ?? null,
      fileName: r.filename ?? null,
      createdAt: r.createdAt,
      rentalId: r.entityType === "rental" ? r.entityId : null,
      url: r.publicUrl ?? null,
    }));
  });
}

"use server";

import { vehicle, integrationEvent, auditEvent, company } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { eq, desc, sql, isNull, isNotNull, and } from "drizzle-orm";
import { getPilotClient } from "@/platform/integrations/pilot/client";
import { normalizePilotVehicle } from "@/platform/integrations/pilot/normalize";
import { canManageFleetForTenant } from "./policies";
import { companyReadScope } from "@/platform/auth/scope";

export interface FleetVehicle {
  id: string;
  make: string;
  model: string;
  year?: number | null;
  plate: string;
  /** BUSINESS status — available | reserved | on_rent | in_service | sold. This is the
   *  truth for "can I rent this car", straight from the DB; never overwritten by
   *  GPS. A reserved car with its engine off is still reserved. */
  status: string;
  /** Live GPS-derived motion state (on_rent when moving, overdue when blocked,
   *  etc.), or null when there is no live fix. Shown NEXT TO the status, never as
   *  it — Babek reads this as "is it actually being driven / where is it". */
  gpsStatus?: string | null;
  location?: string | null;
  odometer: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  nextServiceDate?: string | null;
  nextServiceOdometer?: number | null;
  oilChangeIntervalKm: number;
  gpsBlocked: boolean;
  imei?: string | null;
  // The company currently HOLDING the car (its hand), if assigned. Shared-fleet
  // model: this is not an owner — it's who has the car right now. Shown as a
  // small badge on the fleet card.
  companyId?: string | null;
  companyName?: string | null;
  // Raw "E/C" marker from the sheet. A "/T" suffix means the car sits with
  // TAKE Auto to be sold — it keeps being rented while it waits for a buyer,
  // so this is a flag alongside status, not a status of its own.
  sheetBrandKey?: string | null;
  // Live data from Pilot (may be null if not synced)
  lat?: number;
  lon?: number;
  speed?: number;
  ignition?: boolean;
  lastFixAt?: string;
  // Non-null for soft-deleted (archived) rows; the operational fleet view
  // filters these out, the Deleted filter pulls them back in.
  deletedAt?: string | null;
}

export async function getVehicles(tenantId: string, opts: { includeArchived?: boolean } = {}) {
  await canManageFleetForTenant(tenantId);
  // Shared physical fleet: fleet reads are holding-wide (see companyReadScope).
  const scope = await companyReadScope(tenantId, vehicle.companyId);
  // Archived (soft-deleted) vehicles stay out of every operational view unless
  // the caller explicitly asks for them (archive page, admin tools).
  const notArchived = opts.includeArchived ? sql`true` : isNull(vehicle.deletedAt);
  return withDrizzleTenant(tenantId, async (tx) => {
    return tx.select().from(vehicle).where(and(scope ?? sql`true`, notArchived)).orderBy(desc(vehicle.createdAt));
  });
}

/** Archived vehicles only (for the Deleted filter + Restore action). */
export async function getArchivedVehicles(tenantId: string) {
  await canManageFleetForTenant(tenantId);
  const scope = await companyReadScope(tenantId, vehicle.companyId);
  return withDrizzleTenant(tenantId, async (tx) => {
    return tx.select().from(vehicle).where(and(scope ?? sql`true`, isNotNull(vehicle.deletedAt))).orderBy(desc(vehicle.deletedAt));
  });
}

export async function getVehicleById(tenantId: string, id: string) {
  await canManageFleetForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        v: vehicle,
        // The company currently holding the car (its "hand"), for the profile.
        companyName: company.name,
      })
      .from(vehicle)
      .leftJoin(company, eq(vehicle.companyId, company.id))
      .where(eq(vehicle.id, id));
    if (!rows[0]) return null;
    return { ...rows[0].v, companyName: rows[0].companyName ?? null };
  });
}

export async function getAvailableVehicles(tenantId: string) {
  await canManageFleetForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    return tx
      .select({ id: vehicle.id, make: vehicle.make, model: vehicle.model, plate: vehicle.plate, dailyRate: vehicle.dailyRate })
      .from(vehicle)
      .where(eq(vehicle.status, "available"))
      .orderBy(desc(vehicle.createdAt));
  });
}

export async function createVehicle(
  tenantId: string,
  data: {
    make: string;
    model: string;
    year?: number;
    plate: string;
    dailyRate?: number;
    weeklyRate?: number;
    monthlyRate?: number;
    imei?: string;
    division?: string;
  }
) {
  await assertNotPreviewMode(tenantId);
  await canManageFleetForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .insert(vehicle)
      .values({
        tenantId,
        make: data.make,
        model: data.model,
        year: data.year ?? null,
        plate: data.plate,
        dailyRate: data.dailyRate ?? 0,
        weeklyRate: data.weeklyRate ?? 0,
        monthlyRate: data.monthlyRate ?? 0,
        imei: data.imei ?? null,
        division: data.division ?? "rent",
        status: "available",
      })
      .returning();
    const row = Array.isArray(rows) ? rows[0] : rows;

    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "vehicle.create",
      entityType: "vehicle",
      entityId: row.id,
      intent: `Created vehicle ${data.plate}`,
    });

    return row;
  });
}

function deriveVehicleStatus(
  blocked: boolean,
  ignition: boolean,
  speed: number,
  lastFixAt: string
): typeof vehicle.$inferInsert.status {
  if (blocked) return "overdue";
  if (ignition || speed > 5) return "on_rent";
  const daysSinceFix = (Date.now() - new Date(lastFixAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceFix > 30) return "in_service";
  return "available";
}

export async function syncVehiclesFromPilot(tenantId: string) {
  await assertNotPreviewMode(tenantId);
  await canManageFleetForTenant(tenantId);
  const pilot = getPilotClient();
  const raw = await pilot.getFleet();

  return withDrizzleTenant(tenantId, async (tx) => {
    // ── ADR-001 §11: event spine — write raw Pilot data first ─────────────
    const eventValues = raw.map((v) => ({
      tenantId,
      provider: "pilot" as const,
      providerEventId: `${v.imei}:${Math.floor(Date.now() / 1000)}`,
      signatureValid: true,
      rawPayload: v as unknown as Record<string, unknown>,
      normalizedType: "fleet.sync.vehicle" as const,
      processingStatus: "done" as const,
      processedAt: new Date(),
    }));

    await tx.insert(integrationEvent).values(eventValues).onConflictDoNothing({
      target: [integrationEvent.tenantId, integrationEvent.provider, integrationEvent.providerEventId],
    });

    // ── Project into vehicle table ────────────────────────────────────────
    for (const v of raw) {
      const { make, model } = normalizePilotVehicle({ name: v.name, plate: v.plate });
      const status = deriveVehicleStatus(v.blocked, v.ignition, v.speed, v.lastFixAt);
      const existing = await tx
        .select()
        .from(vehicle)
        .where(eq(vehicle.imei, v.imei));

      const point =
        v.lon && v.lat
          ? sql`ST_SetSRID(ST_MakePoint(${v.lon}, ${v.lat}), 4326)::geography`
          : null;

      if (existing[0]) {
        await tx
          .update(vehicle)
          .set({
            make,
            model,
            plate: v.plate,
            odometer: Math.round(v.odometerKm),
            gpsBlocked: v.blocked,
            // A sold car stays sold — GPS telemetry must never resurrect it
            // into the operational fleet.
            ...(existing[0].status === "sold" ? {} : { status }),
            point,
            updatedAt: new Date(),
          })
          .where(eq(vehicle.id, existing[0].id));
      } else {
        await tx.insert(vehicle).values({
          tenantId,
          make,
          model,
          plate: v.plate,
          odometer: Math.round(v.odometerKm),
          gpsBlocked: v.blocked,
          imei: v.imei,
          status,
          point,
        });
      }
    }
    return { count: raw.length, mode: pilot.mode };
  });
}

export async function getFleetForTenant(tenantId: string): Promise<{
  mode: "live" | "mock";
  vehicles: FleetVehicle[];
}> {
  await canManageFleetForTenant(tenantId);
  // 1. Read persisted vehicles from DB (tenant-scoped via RLS, holding-wide)
  const dbVehicles = await getVehicles(tenantId);

  // 1b. Company (hand) names for the badge, keyed by id.
  const companies = await withDrizzleTenant(tenantId, async (tx) =>
    tx.select({ id: company.id, name: company.name }).from(company)
  );
  const companyNameById = new Map(companies.map((c) => [c.id, c.name]));

  // 2. Fetch live data from Pilot
  const pilot = getPilotClient();
  const raw = await pilot.getFleet();

  // 3. Build a lookup by IMEI
  const liveByImei = new Map(raw.map((v) => [v.imei, v]));

  // 4. Merge DB + live data (derive status from live sensors when available)
  const vehicles: FleetVehicle[] = dbVehicles.map((dbv) => {
    const live = dbv.imei ? liveByImei.get(dbv.imei) : undefined;
    // Business status is the availability truth (was being overwritten by the
    // GPS-derived status — a parked reserved/on-rent car then showed as
    // "available" and Babek double-booked it). Keep GPS as a separate signal.
    const status = dbv.status;
    const gpsStatus = live
      ? deriveVehicleStatus(live.blocked, live.ignition, live.speed, live.lastFixAt)
      : null;
    return {
      id: dbv.id,
      make: dbv.make,
      model: dbv.model,
      year: dbv.year,
      plate: dbv.plate,
      status,
      gpsStatus,
      location: dbv.location,
      odometer: dbv.odometer,
      dailyRate: dbv.dailyRate,
      weeklyRate: dbv.weeklyRate,
      monthlyRate: dbv.monthlyRate,
      nextServiceDate: dbv.nextServiceDate,
      nextServiceOdometer: dbv.nextServiceOdometer,
      oilChangeIntervalKm: dbv.oilChangeIntervalKm,
      gpsBlocked: live?.blocked ?? dbv.gpsBlocked,
      imei: dbv.imei,
      companyId: dbv.companyId,
      companyName: dbv.companyId ? companyNameById.get(dbv.companyId) ?? null : null,
      lat: live?.lat,
      lon: live?.lon,
      speed: live?.speed,
      ignition: live?.ignition,
      lastFixAt: live?.lastFixAt,
    };
  });

  // 5. Also include live (Pilot) vehicles not yet in DB. Shared-fleet model:
  // fleet visibility is holding-wide, so every fleet-role member sees the
  // unassigned live devices too (previously hidden from company-scoped users).
  const includeUnassigned = true;
  const dbImeis = new Set(dbVehicles.map((v) => v.imei).filter(Boolean));
  for (const live of raw) {
    if (includeUnassigned && !dbImeis.has(live.imei)) {
      const { make, model } = normalizePilotVehicle({ name: live.name, plate: live.plate });
      vehicles.push({
        id: live.imei,
        make,
        model,
        plate: live.plate,
        status: deriveVehicleStatus(live.blocked, live.ignition, live.speed, live.lastFixAt),
        odometer: Math.round(live.odometerKm),
        dailyRate: 0,
        weeklyRate: 0,
        monthlyRate: 0,
        nextServiceDate: null,
        nextServiceOdometer: null,
        oilChangeIntervalKm: 8000,
        gpsBlocked: live.blocked,
        imei: live.imei,
        lat: live.lat,
        lon: live.lon,
        speed: live.speed,
        ignition: live.ignition,
        lastFixAt: live.lastFixAt,
      });
    }
  }

  return { mode: pilot.mode, vehicles };
}

export async function getVehicleStatus(tenantId: string, imei: string) {
  await canManageFleetForTenant(tenantId);
  const pilot = getPilotClient();
  return pilot.getStatus(imei);
}

"use server";

import { and, eq, ilike, or, sql } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { vehicle, company } from "@/platform/db/schema";
import { companyReadScope } from "@/platform/auth/scope";
import { getCalendarSlots } from "@/modules/rental/booking-queries";
import { canManageFleetForTenant } from "./policies";
import { canManageCRMForTenant } from "@/modules/crm/policies";

// A reserved or active slot HOLDS the car for its dates. returned / completed /
// cancelled do not — the car is back and offerable again. This is the same set
// the availability calendar paints as "occupied", so the finder and the
// calendar can never disagree about whether a car is free.
const BUSY = new Set(["reserved", "active"]);

// Fleet-status values that mean the car is not offerable right now. The booking
// calendar is authoritative for PLATFORM bookings, but the imported Kaiten
// fleet has none of those yet — a Kaiten card's own board status (BOOKED →
// on_rent, WITH EASYRENT/CARDIVAN → reserved) is the only signal that it is
// actually out. Honouring it is not a second availability store; it is reading
// the same vehicle.status the fleet page already trusts, so a car BOOKED in
// Kaiten is never offered as "free" just because it has no platform rental.
const STATUS_BUSY = new Set(["on_rent", "reserved", "overdue", "in_service"]);

// How far past the requested window we look to answer "free again on…". A car
// held right through the window is still worth offering if it frees soon after.
const HORIZON_DAYS = 180;

export interface FinderVehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  plate: string;
  status: string;
  dailyRate: number;
  kaitenColumn: string | null;
  kaitenNotes: string | null;
  photo: string | null; // cover photo url, if any
  photoCount: number;
  companyName: string | null; // the hand currently holding the car
  /** Free for the whole requested [start, end] window (no reserved/active slot overlaps). */
  available: boolean;
  /** If busy, the date it frees again (latest overlapping return); else null. */
  freeFrom: Date | null;
}

/**
 * Car finder ("Подобрать авто") — from a live deal, find the actual fleet cars
 * to offer.
 *
 * Matches `query` against make/model/plate, then decides availability for the
 * requested [start, end] window off the SAME `getCalendarSlots` read the
 * availability calendar uses (rentals + legacy sheet bookings), so there is no
 * second source of truth. Sorted free-first, then by daily rate.
 */
export async function findVehiclesForDeal(
  tenantId: string,
  opts: { query?: string; start: Date; end: Date }
): Promise<FinderVehicle[]> {
  // Deal-side feature: the actor is a salesperson working a deal, so gate on
  // CRM (same as attachVehicleToDeal). The sales line is also allowed by
  // getCalendarSlots' rentals check below, and the vehicle read is holding-wide.
  await canManageCRMForTenant(tenantId);

  const q = (opts.query ?? "").trim();
  const scope = await companyReadScope(tenantId, vehicle.companyId);

  // Look from the window start out to the horizon so a car held through the
  // window still yields an honest "free again on…" date.
  const horizonEnd = new Date(opts.start.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);
  const slots = await getCalendarSlots(
    tenantId,
    opts.start,
    opts.end > horizonEnd ? opts.end : horizonEnd
  );

  // vehicleId → the blocking slots that touch [start, …], for the busy/free
  // decision and the free-from date.
  const blocking = new Map<string, { start: Date; end: Date }[]>();
  for (const s of slots) {
    if (!BUSY.has(s.rental.status)) continue;
    const st = s.rental.startDate;
    const en = s.rental.actualReturnDate ?? s.rental.returnDate;
    if (!st || !en) continue;
    if (en < opts.start) continue; // fully in the past — car is back
    const list = blocking.get(s.rental.vehicleId) ?? [];
    list.push({ start: st, end: en });
    blocking.set(s.rental.vehicleId, list);
  }

  const rows = await withDrizzleTenant(tenantId, async (tx) => {
    const filters = [scope ?? sql`true`];
    if (q) {
      filters.push(
        or(
          ilike(vehicle.make, `%${q}%`),
          ilike(vehicle.model, `%${q}%`),
          ilike(vehicle.plate, `%${q}%`),
          ilike(sql`${vehicle.make} || ' ' || ${vehicle.model}`, `%${q}%`)
        )!
      );
    }
    return tx
      .select({
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plate: vehicle.plate,
        status: vehicle.status,
        dailyRate: vehicle.dailyRate,
        kaitenColumn: vehicle.kaitenColumn,
        kaitenNotes: vehicle.kaitenNotes,
        photos: vehicle.photos,
        companyId: vehicle.companyId,
      })
      .from(vehicle)
      .where(and(...filters))
      .orderBy(vehicle.make, vehicle.model);
  });

  const companies = await withDrizzleTenant(tenantId, async (tx) =>
    tx.select({ id: company.id, name: company.name }).from(company)
  );
  const companyName = new Map(companies.map((c) => [c.id, c.name]));

  const result: FinderVehicle[] = rows.map((r) => {
    const holds = blocking.get(r.id) ?? [];
    // Busy in the requested window? Any platform booking overlapping [start,end]
    // OR the car's own fleet status says it is out.
    const overlapsWindow = holds.some((h) => h.start <= opts.end && h.end >= opts.start);
    const statusBusy = STATUS_BUSY.has(r.status);
    // The date the car frees: latest end among platform bookings reaching into/
    // after the window. A status-only hold (Kaiten BOOKED, no platform dates)
    // has no known end, so freeFrom stays null → shown as "Занята" without a date.
    let freeFrom: Date | null = null;
    if (overlapsWindow) {
      for (const h of holds) {
        if (h.end >= opts.start && (!freeFrom || h.end > freeFrom)) freeFrom = h.end;
      }
    }
    const photos = (r.photos as { url: string; name: string }[] | null) ?? [];
    return {
      id: r.id,
      make: r.make,
      model: r.model,
      year: r.year,
      plate: r.plate,
      status: r.status,
      dailyRate: r.dailyRate,
      kaitenColumn: r.kaitenColumn ?? null,
      kaitenNotes: r.kaitenNotes ?? null,
      photo: photos[0]?.url ?? null,
      photoCount: photos.length,
      companyName: r.companyId ? companyName.get(r.companyId) ?? null : null,
      available: !overlapsWindow && !statusBusy,
      freeFrom,
    };
  });

  // Free-first, then cheaper-first (0-rate cars — most Kaiten imports — sort
  // last within their availability group so priced cars lead).
  result.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    const ar = a.dailyRate || Number.MAX_SAFE_INTEGER;
    const br = b.dailyRate || Number.MAX_SAFE_INTEGER;
    return ar - br;
  });

  return result;
}

export interface VehicleAvailabilitySummary {
  /** Booked/out right now (a reserved or active slot covers today). */
  busyNow: boolean;
  /** If busy now, when the current hold ends; else null. */
  freeFrom: Date | null;
  /** The next reserved/active slot's start after today, if the car is free now. */
  nextBookingStart: Date | null;
}

/**
 * One car's availability, read from the SAME calendar slots the availability
 * board uses. Feeds the vehicle profile's "today's booking status / next free
 * date" strip. Horizon-bounded so an open-ended import can't skew "free from".
 */
export async function getVehicleAvailabilitySummary(
  tenantId: string,
  vehicleId: string
): Promise<VehicleAvailabilitySummary> {
  await canManageFleetForTenant(tenantId);
  const now = new Date();
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);

  // The car's own fleet status — the only "out" signal for imported Kaiten cars
  // that have no platform bookings yet (see STATUS_BUSY).
  const [row] = await withDrizzleTenant(tenantId, async (tx) =>
    tx.select({ status: vehicle.status }).from(vehicle).where(eq(vehicle.id, vehicleId)).limit(1)
  );
  const statusBusy = row ? STATUS_BUSY.has(row.status) : false;

  const slots = await getCalendarSlots(tenantId, now, horizon);

  const holds = slots
    .filter((s) => s.rental.vehicleId === vehicleId && BUSY.has(s.rental.status))
    .map((s) => ({
      start: s.rental.startDate,
      end: s.rental.actualReturnDate ?? s.rental.returnDate,
    }))
    .filter((h): h is { start: Date; end: Date } => !!h.start && !!h.end);

  let calendarBusy = false;
  let freeFrom: Date | null = null;
  let nextBookingStart: Date | null = null;
  for (const h of holds) {
    if (h.start <= now && h.end >= now) {
      calendarBusy = true;
      if (!freeFrom || h.end > freeFrom) freeFrom = h.end;
    } else if (h.start > now) {
      if (!nextBookingStart || h.start < nextBookingStart) nextBookingStart = h.start;
    }
  }
  // Busy now = a platform booking covers today OR the fleet status says it's out.
  // A status-only hold has no known end date, so freeFrom stays null.
  const busyNow = calendarBusy || statusBusy;
  return { busyNow, freeFrom, nextBookingStart: busyNow ? null : nextBookingStart };
}

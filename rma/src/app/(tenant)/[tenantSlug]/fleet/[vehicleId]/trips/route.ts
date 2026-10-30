import { NextResponse } from "next/server";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getTenantRoles, isPlatformAdmin } from "@/platform/auth/authorization";
import { getVehicleById } from "@/modules/fleet/queries";
import { getVehicleTripsForVehicle, TRIPS_MAX_DAYS, type VehicleTrip } from "@/modules/fleet/trips";

export const dynamic = "force-dynamic";

/**
 * Vehicle trip history (Pilot GPS v3 track), tenant-scoped.
 *
 *   GET /<tenant>/fleet/<vehicleId>/trips?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   GET ...&format=csv   → text/csv attachment report
 *
 * Dates are inclusive calendar days in UTC; the span is capped at 31 days.
 * Times inside the CSV are rendered in Asia/Dubai (the operating timezone).
 */

const DAY_MS = 24 * 3600 * 1000;
const REPORT_TZ = "Asia/Dubai";

function parseDay(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

function toDayISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: REPORT_TZ,
  });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-CA", { timeZone: REPORT_TZ }); // YYYY-MM-DD
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(trips: VehicleTrip[], kmTotal: number): string {
  const header = "Date,Start,End,Duration (min),Distance (km),Max speed (km/h)";
  const rows = trips.map((t) =>
    [fmtDate(t.startIso), fmtTime(t.startIso), fmtTime(t.endIso), t.durationMin, t.lengthKm.toFixed(1), t.maxSpeed]
      .map(csvCell)
      .join(","),
  );
  const totalMin = trips.reduce((sum, t) => sum + t.durationMin, 0);
  rows.push(["TOTAL", "", "", totalMin, kmTotal.toFixed(1), ""].map(csvCell).join(","));
  return [header, ...rows].join("\r\n") + "\r\n";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantSlug: string; vehicleId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { tenantSlug, vehicleId } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return NextResponse.json({ error: "not-found" }, { status: 404 });

  // Authorize: member of THIS tenant or platform admin.
  const roles = await getTenantRoles(session.user.id, tenant.id);
  const isAdmin = await isPlatformAdmin(session.user.id);
  if (roles.length === 0 && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Verify the vehicle belongs to the tenant (RLS-scoped read + fleet authz).
  const vehicle = await getVehicleById(tenant.id, vehicleId);
  if (!vehicle) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const url = new URL(req.url);
  const now = Date.now();
  // Default: last 7 days, inclusive.
  const toMs = parseDay(url.searchParams.get("to")) ?? Math.floor(now / DAY_MS) * DAY_MS;
  const fromMs = parseDay(url.searchParams.get("from")) ?? toMs - 6 * DAY_MS;
  const fromISO = toDayISO(fromMs);
  const toISO = toDayISO(toMs);

  const result = await getVehicleTripsForVehicle(
    { pilotDeviceId: vehicle.pilotDeviceId, imei: vehicle.imei, plate: vehicle.plate },
    new Date(fromMs),
    // `to` day is inclusive — query until its last millisecond.
    new Date(toMs + DAY_MS - 1),
  );

  if (!result.ok) {
    const status = result.reason === "bad-range" || result.reason === "range-too-long" ? 400 : 200;
    return NextResponse.json({ ...result, maxDays: TRIPS_MAX_DAYS }, { status });
  }

  if (url.searchParams.get("format") === "csv") {
    const plate = (vehicle.plate ?? vehicleId).replace(/[^A-Za-z0-9-]+/g, "_");
    const filename = `${tenantSlug.toUpperCase()}-${plate}-trips-${fromISO}-${toISO}.csv`;
    return new Response(buildCsv(result.trips, result.kmTotal), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(result);
}

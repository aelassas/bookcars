import "server-only";

import { V3_MAX_HOURS, pilotAccounts, v3Get, v3Token } from "@/platform/integrations/pilot/v3";

/**
 * Trip history for one vehicle, from Pilot API v3 `/vehicles/track`.
 *
 * Server-only query module (NOT a "use server" action) — callers (route
 * handlers, pages) do their own authz before invoking this.
 *
 * Unit note: Pilot's track segment `length` is passed through as kilometres,
 * matching the hub route playback (app/fleet/api/track/route.ts maps
 * `Number(s.length ?? 0)` straight into `lengthKm` with no /1000).
 *
 * Errors never throw: a dead Pilot account or an unconfigured env surfaces as
 * `{ ok: false, reason }` so the UI can show an honest state instead of fake
 * data.
 */

export type VehicleTrip = {
  startIso: string;
  endIso: string;
  durationMin: number;
  /** Kilometres — Pilot's `length` is treated as km (see unit note above). */
  lengthKm: number;
  maxSpeed: number;
  avgSpeed: number;
  /** te within the last 15 minutes — the car is still on this trip. */
  ongoing: boolean;
};

export type VehicleTripsResult =
  | { ok: true; trips: VehicleTrip[]; kmTotal: number; dayCount: number }
  | { ok: false; reason: "no-device" | "pilot-unavailable" | "range-too-long" | "bad-range" };

type TrackSegment = {
  ts: number | string;
  te: number | string;
  length?: number | string;
  avgspeed?: number | string;
  maxspeed?: number | string;
};

/** Hard cap per request — keeps the chunked fan-out bounded. */
export const TRIPS_MAX_DAYS = 31;
/** A trip whose end is this fresh is still in progress. */
const ONGOING_WINDOW_MS = 15 * 60 * 1000;

export async function getVehicleTripsForVehicle(
  vehicle: { pilotDeviceId?: string | null; imei?: string | null; plate?: string | null },
  from: Date,
  to: Date,
): Promise<VehicleTripsResult> {
  const agentId = vehicle.pilotDeviceId?.trim();
  const imei = vehicle.imei?.trim();
  if (!agentId && !imei) return { ok: false, reason: "no-device" };

  const fromMs = from.getTime();
  const toMs = to.getTime();
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) {
    return { ok: false, reason: "bad-range" };
  }
  if (toMs - fromMs > TRIPS_MAX_DAYS * 24 * 3600 * 1000) {
    return { ok: false, reason: "range-too-long" };
  }

  const accts = pilotAccounts();
  if (accts.length === 0) return { ok: false, reason: "pilot-unavailable" };

  const key = agentId
    ? `agent_id=${encodeURIComponent(agentId)}`
    : `imei=${encodeURIComponent(imei!)}`;

  // Upstream caps one call at 72h — split the range into windows, oldest first.
  const windows: Array<{ ts: number; te: number }> = [];
  const spanMs = V3_MAX_HOURS * 3600 * 1000;
  for (let wStart = fromMs; wStart < toMs; wStart += spanMs) {
    windows.push({
      ts: Math.floor(wStart / 1000),
      te: Math.floor(Math.min(wStart + spanMs, toMs) / 1000),
    });
  }

  // The holding runs several Pilot logins; the first account that answers for
  // EVERY window owns the vehicle. A mid-range failure falls through to the
  // next account rather than returning a silent partial history.
  for (const a of accts) {
    try {
      const authz = await v3Token(a.user, a.pass);
      const segments: TrackSegment[] = [];
      for (const w of windows) {
        const resp = await v3Get(authz, `/vehicles/track?${key}&ts=${w.ts}&te=${w.te}`);
        const tracks = (resp.data as { tracks?: TrackSegment[] } | undefined)?.tracks ?? [];
        segments.push(...tracks);
      }
      return buildResult(segments);
    } catch {
      // try the next Pilot account
    }
  }
  return { ok: false, reason: "pilot-unavailable" };
}

function buildResult(segments: TrackSegment[]): VehicleTripsResult {
  const now = Date.now();
  const trips: VehicleTrip[] = segments
    .map((s) => {
      const startMs = Number(s.ts) * 1000;
      const endMs = Number(s.te) * 1000;
      const lengthKm = Math.round(Number(s.length ?? 0) * 10) / 10;
      return {
        startIso: new Date(startMs).toISOString(),
        endIso: new Date(endMs).toISOString(),
        durationMin: Math.max(0, Math.round((endMs - startMs) / 60000)),
        lengthKm,
        maxSpeed: Math.round(Number(s.maxspeed ?? 0)),
        avgSpeed: Math.round(Number(s.avgspeed ?? 0)),
        ongoing: now - endMs >= 0 && now - endMs <= ONGOING_WINDOW_MS,
      };
    })
    .filter((t) => Number.isFinite(new Date(t.startIso).getTime()))
    .sort((a, b) => a.startIso.localeCompare(b.startIso));

  const kmTotal = Math.round(trips.reduce((sum, t) => sum + t.lengthKm, 0) * 10) / 10;
  const dayCount = new Set(trips.map((t) => t.startIso.slice(0, 10))).size;
  return { ok: true, trips, kmTotal, dayCount };
}

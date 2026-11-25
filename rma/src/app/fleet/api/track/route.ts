import { NextResponse } from "next/server";
import { getActiveTenant } from "@/platform/auth/tenant";
import { V3_MAX_HOURS, pilotAccounts, v3Get, v3Token } from "@/platform/integrations/pilot/v3";

export const dynamic = "force-dynamic";

/**
 * Vehicle route playback — Pilot API v3.
 *
 * The live positions feed uses the legacy Basic-auth api.php, but history
 * lives in v3: `GET /api/v3/vehicles/events/raw` returns raw GPS points
 * (ts/lat/lon/speed) and `GET /api/v3/vehicles/track` returns trip segments
 * with per-trip length — both keyed by `agent_id` (= Pilot veh_id) or imei,
 * windowed by `ts`/`te` Unix seconds. Verified against the live account
 * 2026-08-29 (veh_id 184001).
 *
 *   GET /fleet/api/track?veh_id=184001[&hours=24]
 *   GET /fleet/api/track?imei=866344052403966[&hours=24]
 */

const MAX_HOURS = V3_MAX_HOURS; // events/raw is capped at a 3-day range upstream

type RawPoint = { ts: number; lat: string | number; lon: string | number; speed?: number };
type TripSegment = {
  ts: number; te: number;
  length?: number | string; avgspeed?: number | string; maxspeed?: number | string;
};

export async function GET(req: Request) {
  // Tenant-bound, not just signed-in: any veh_id/imei is queryable, so a bare
  // session check would expose every brand's GPS history to any member.
  const t = await getActiveTenant();
  if (!t?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const vehId = url.searchParams.get("veh_id")?.trim();
  const imei = url.searchParams.get("imei")?.trim();
  if (!vehId && !imei) return NextResponse.json({ error: "veh_id or imei required" }, { status: 400 });
  const hours = Math.min(Math.max(Number(url.searchParams.get("hours") ?? 24) || 24, 1), MAX_HOURS);

  const te = Math.floor(Date.now() / 1000);
  const ts = te - hours * 3600;
  const key = imei ? `imei=${encodeURIComponent(imei)}` : `agent_id=${encodeURIComponent(vehId!)}`;

  const accts = pilotAccounts();
  if (accts.length === 0) return NextResponse.json({ error: "PILOT_USERNAME/PILOT_PASSWORD not configured" }, { status: 502 });

  // The holding runs several Pilot logins; try each until one owns the vehicle.
  let lastErr = "no pilot account answered";
  for (const a of accts) {
    try {
      const authz = await v3Token(a.user, a.pass);
      const [rawResp, trackResp] = await Promise.all([
        v3Get(authz, `/vehicles/events/raw?${key}&ts=${ts}&te=${te}`),
        v3Get(authz, `/vehicles/track?${key}&ts=${ts}&te=${te}`).catch(() => null),
      ]);
      const rawData = rawResp.data as { raw?: RawPoint[]; imei?: string; agent_id?: number } | undefined;
      const raw = (rawData?.raw ?? [])
        .filter((p) => Number(p.lat) !== 0 || Number(p.lon) !== 0)
        .map((p) => ({
          t: new Date(Number(p.ts) * 1000).toISOString(),
          lat: Number(p.lat),
          lon: Number(p.lon),
          speed: p.speed != null ? Number(p.speed) : null,
        }))
        .sort((a, b) => a.t.localeCompare(b.t));

      const trips = ((trackResp?.data as { tracks?: TripSegment[] } | null)?.tracks ?? []).map((s) => ({
        ts: new Date(Number(s.ts) * 1000).toISOString(),
        te: new Date(Number(s.te) * 1000).toISOString(),
        lengthKm: Number(s.length ?? 0),
        maxSpeed: Number(s.maxspeed ?? 0),
      }));
      const kmTotal = Math.round(trips.reduce((sum, t) => sum + t.lengthKm, 0) * 10) / 10;

      return NextResponse.json({
        vehId: vehId ?? String(rawData?.agent_id ?? ""),
        imei: rawData?.imei ?? imei ?? "",
        hours,
        points: raw,
        trips,
        kmTotal,
      });
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  return NextResponse.json({ error: lastErr }, { status: 502 });
}

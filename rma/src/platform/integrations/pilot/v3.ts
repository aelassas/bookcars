import "server-only";

/**
 * Shared Pilot API v3 client — auth + GET.
 *
 * The live positions feed uses the legacy Basic-auth api.php (client.ts), but
 * history lives in v3: `GET /api/v3/vehicles/events/raw` returns raw GPS
 * points (ts/lat/lon/speed) and `GET /api/v3/vehicles/track` returns trip
 * segments with per-trip length — both keyed by `agent_id` (= Pilot veh_id)
 * or imei, windowed by `ts`/`te` Unix seconds (max 72h per call upstream).
 * Verified against the live account 2026-08-29 (veh_id 184001).
 *
 * Extracted from app/fleet/api/track/route.ts so tenant surfaces (vehicle
 * trips panel) reuse the exact same machinery as the hub FleetMap.
 */

export const V3_BASE = (process.env.PILOT_BASE_URL ?? "https://pilot-gps.com").replace(/\/$/, "");

/** v3 history endpoints are capped at a 3-day range upstream. */
export const V3_MAX_HOURS = 72;

export type V3Auth = { token: string; nodeId: string };

/** Every configured Pilot account (PILOT_USERNAME/PASSWORD + _2.._9). */
export function pilotAccounts(): Array<{ user: string; pass: string }> {
  const accts: Array<{ user: string; pass: string }> = [];
  const u = process.env.PILOT_USERNAME?.trim();
  const p = process.env.PILOT_PASSWORD?.trim();
  if (u && p) accts.push({ user: u, pass: p });
  for (let i = 2; i <= 9; i++) {
    const ui = process.env[`PILOT_USERNAME_${i}`]?.trim();
    const pi = process.env[`PILOT_PASSWORD_${i}`]?.trim();
    if (ui && pi) accts.push({ user: ui, pass: pi });
  }
  return accts;
}

export async function v3Token(user: string, pass: string): Promise<V3Auth> {
  const res = await fetch(`${V3_BASE}/api/v3/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pass }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const data = (await res.json()) as { token?: string; node_id?: number | string; msg?: string };
  if (!res.ok || !data.token) throw new Error(`pilot v3 auth: ${data.msg ?? res.status}`);
  return { token: String(data.token), nodeId: String(data.node_id ?? "") };
}

export async function v3Get(
  authz: V3Auth,
  path: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${V3_BASE}/api/v3${path}`, {
    headers: { Authorization: `Bearer ${authz.token}`, "X-Node-Id": authz.nodeId },
    signal: AbortSignal.timeout(45_000),
    cache: "no-store",
  });
  const body = (await res.json()) as { code?: number; msg?: string };
  if (!res.ok || (body.code !== undefined && body.code !== 0)) {
    throw new Error(`pilot v3 ${path}: ${body.msg ?? res.status}`);
  }
  return body as Record<string, unknown>;
}

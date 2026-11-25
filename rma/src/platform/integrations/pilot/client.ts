// Pilot GPS telematics connector.
//
// API details: see .claude/skills/pilot-gps/SKILL.md
// Uses Pilot API v3 (bearer token + X-Node-Id). `getPilotClient()` returns the
// live client when PILOT_USERNAME / PILOT_PASSWORD are set, otherwise a mock
// so the platform always runs. Field mapping below matches the real Pilot
// account response shapes (verified against the TAKE Auto account, 2026-05).

/* eslint-disable @typescript-eslint/no-explicit-any */

// One fleet vehicle as the platform uses it. Distilled from Pilot's /vehicles
// response, which already carries live position and sensor state per vehicle.
export interface PilotFleetVehicle {
  imei: string;
  agentId: number;
  name: string; // model, e.g. "Jetour Dashing"
  plate: string; // Pilot vehiclenumber, e.g. "T88462"
  vin?: string;
  odometerKm: number;
  lat: number;
  lon: number;
  speed: number; // km/h
  ignition: boolean; // engine on
  blocked: boolean; // engine-block relay engaged
  batteryVolts?: number; // car battery
  lastFixAt: string; // ISO 8601, from the last GPS fix
}

export interface PilotStatus {
  imei: string;
  lat: number;
  lon: number;
  speed: number;
  ignition: boolean;
  blocked: boolean;
  batteryVolts?: number;
  lastFixAt: string;
  updatedAt: string;
}

export interface PilotCommandResult {
  commandId: number;
  accepted: boolean;
}

export interface PilotClient {
  readonly mode: "live" | "mock";
  getFleet(): Promise<PilotFleetVehicle[]>;
  getStatus(imei: string): Promise<PilotStatus>;
  blockEngine(imei: string): Promise<PilotCommandResult>;
  unblockEngine(imei: string): Promise<PilotCommandResult>;
}

const BASE = process.env.PILOT_BASE_URL ?? "https://pilot-gps.com";

// undici (Node's fetch) has no total-response timeout. Pilot is read on the
// interactive fleet pages (modules/fleet/queries.ts), so a wedged pilot-gps.com
// would hang the render — and with MultiPilotClient, one stalled account would
// hold up the whole merged fleet. Both bounds are deliberately short:
//   auth  — a token exchange is one small POST; 10s is already pathological.
//   data  — /vehicles returns the whole fleet, so allow more, but a live page
//           that waits past 20s has already failed for the user.
const PILOT_AUTH_TIMEOUT_MS = 10_000;
const PILOT_REQUEST_TIMEOUT_MS = 20_000;

// AbortSignal.timeout() rejects with a DOMException named "TimeoutError".
function pilotTimeoutError(what: string, ms: number, err: unknown): Error | null {
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return new Error(`Pilot ${what} timed out after ${ms}ms`, { cause: err });
  }
  return null;
}

// --- Pilot response parsing helpers ------------------------------------------

function tsToIso(unixSeconds: unknown): string {
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return new Date().toISOString();
  return new Date(n * 1000).toISOString();
}

// Pilot reports a flat list of named sensors per vehicle. Names are
// account-specific labels (e.g. "Engine block status D2", "Ignition sensor").
function findSensor(sensors: any, match: RegExp): any | undefined {
  if (!Array.isArray(sensors)) return undefined;
  return sensors.find((s) => match.test(String(s?.name ?? "")));
}

function sensorBlocked(sensors: any): boolean {
  const s = findSensor(sensors, /engine block/i);
  if (!s) return false;
  const hum = String(s.hum_value ?? "").toLowerCase();
  if (hum.includes("unblock")) return false;
  if (hum.includes("block")) return true;
  return Number(s.dig_value) === 1;
}

function sensorIgnition(sensors: any): boolean {
  const s = findSensor(sensors, /ignition/i);
  if (!s) return false;
  const hum = String(s.hum_value ?? "").toLowerCase();
  if (hum.includes("off")) return false;
  if (hum.includes("on")) return true;
  return Number(s.dig_value) === 1;
}

function sensorBatteryVolts(sensors: any): number | undefined {
  const s = findSensor(sensors, /car batt/i);
  if (!s) return undefined;
  const v = Number(s.dig_value);
  return Number.isFinite(v) && v > 0 ? v : undefined;
}

export class LivePilotClient implements PilotClient {
  readonly mode = "live" as const;
  private token: string | null = null;
  private nodeId = "";
  private tokenExpiry = 0;

  constructor(
    private readonly user: string,
    private readonly pass: string,
  ) {}

  private async auth(): Promise<void> {
    if (this.token && Date.now() < this.tokenExpiry) return;
    let data: any;
    try {
      const res = await fetch(`${BASE}/api/v3/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: this.user, password: this.pass }),
        signal: AbortSignal.timeout(PILOT_AUTH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Pilot auth failed: ${res.status}`);
      data = await res.json();
    } catch (err) {
      const timeout = pilotTimeoutError("auth", PILOT_AUTH_TIMEOUT_MS, err);
      if (timeout) throw timeout;
      throw err;
    }
    if (!data?.token) {
      throw new Error(`Pilot auth rejected: ${data?.msg ?? "no token"}`);
    }
    this.token = String(data.token);
    this.nodeId = String(data.node_id ?? "");
    const ttl = typeof data.expires_in === "number" ? data.expires_in : 3600;
    this.tokenExpiry = Date.now() + (ttl - 60) * 1000;
  }

  private async req(path: string, init?: RequestInit): Promise<any> {
    await this.auth();
    try {
      const res = await fetch(`${BASE}/api/v3${path}`, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${this.token}`,
          "X-Node-Id": this.nodeId,
        },
        // `init` may carry its own signal; the explicit bound wins so no
        // caller can accidentally opt out of having a timeout at all.
        signal: AbortSignal.timeout(PILOT_REQUEST_TIMEOUT_MS),
      });
      if (res.status === 401) {
        this.token = null;
        throw new Error("Pilot token rejected — re-authenticate");
      }
      if (!res.ok) throw new Error(`Pilot ${path} failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      const timeout = pilotTimeoutError(path, PILOT_REQUEST_TIMEOUT_MS, err);
      if (timeout) throw timeout;
      throw err;
    }
  }

  async getFleet(): Promise<PilotFleetVehicle[]> {
    const data = await this.req("/vehicles");
    const rows: any[] = Array.isArray(data)
      ? data
      : (data?.data ?? data?.list ?? []);
    return rows.map((v) => {
      const st = v?.status ?? {};
      const sensors = v?.sensors_status ?? [];
      return {
        imei: String(v?.imei ?? ""),
        agentId: Number(v?.agentid ?? v?.veh_id ?? 0),
        name:
          String(v?.model ?? "").trim() ||
          String(v?.type ?? "").trim() ||
          "Vehicle",
        plate: String(v?.vehiclenumber ?? "").trim(),
        vin: v?.vin ? String(v.vin) : undefined,
        odometerKm: Number(v?.current_mileage ?? 0),
        lat: Number(st?.lat ?? 0),
        lon: Number(st?.lon ?? 0),
        speed: Number(st?.speed ?? 0),
        ignition: sensorIgnition(sensors),
        blocked: sensorBlocked(sensors),
        batteryVolts: sensorBatteryVolts(sensors),
        lastFixAt: tsToIso(st?.unixtimestamp),
      };
    });
  }

  async getStatus(imei: string): Promise<PilotStatus> {
    const data = await this.req(
      `/vehicles/status?imei=${encodeURIComponent(imei)}`,
    );
    const rows: any[] = Array.isArray(data) ? data : (data?.data ?? []);
    const s: any = rows[0] ?? {};
    const sensors = s?.sensors ?? [];
    return {
      imei,
      lat: Number(s?.lat ?? 0),
      lon: Number(s?.lon ?? 0),
      speed: Number(s?.speed ?? 0),
      ignition: sensorIgnition(sensors),
      blocked: sensorBlocked(sensors),
      batteryVolts: sensorBatteryVolts(sensors),
      lastFixAt: tsToIso(s?.unixtimestamp),
      updatedAt: new Date().toISOString(),
    };
  }

  private async engineCommand(imei: string, template: string): Promise<PilotCommandResult> {
    const data = await this.req(`/vehicles/commands?imei=${encodeURIComponent(imei)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_name: template }),
    });
    const commandId = Number(data?.command_id ?? data?.data?.command_id);
    if ((data?.code !== undefined && data.code !== 0) || !Number.isInteger(commandId) || commandId <= 0) {
      throw new Error(`Pilot rejected engine command: ${data?.msg ?? "missing command id"}`);
    }
    return { commandId, accepted: true };
  }

  async blockEngine(imei: string): Promise<PilotCommandResult> {
    return this.engineCommand(imei, process.env.PILOT_ENGINE_BLOCK_TEMPLATE ?? "engine_block");
  }

  async unblockEngine(imei: string): Promise<PilotCommandResult> {
    return this.engineCommand(imei, process.env.PILOT_ENGINE_UNBLOCK_TEMPLATE ?? "engine_unblock");
  }

}

// Mock fleet — used when no Pilot credentials are configured so the platform
// always runs. A few vehicles in varied states to exercise the UI.
const MOCK_FLEET: { imei: string; name: string; plate: string; ignition?: boolean; blocked?: boolean }[] =
  [
    { imei: "860111000000001", name: "Mercedes-Benz G63 AMG", plate: "Dubai A 12345" },
    { imei: "860111000000002", name: "Toyota Land Cruiser", plate: "Dubai F 67340", ignition: true },
    { imei: "860111000000003", name: "Nissan Patrol", plate: "Dubai D 23910" },
    { imei: "860111000000004", name: "Hyundai Sonata", plate: "Dubai M 60123", blocked: true },
    { imei: "860111000000005", name: "BMW X5", plate: "Dubai H 90021", ignition: true },
  ];

class MockPilotClient implements PilotClient {
  readonly mode = "mock" as const;

  async getFleet(): Promise<PilotFleetVehicle[]> {
    return MOCK_FLEET.map((b, i) => ({
      imei: b.imei,
      agentId: 1001 + i,
      name: b.name,
      plate: b.plate,
      vin: undefined,
      odometerKm: 14000 + i * 6200,
      lat: 25.115 + Math.random() * 0.06,
      lon: 55.2 + Math.random() * 0.06,
      speed: b.ignition ? 34 + i * 3 : 0,
      ignition: Boolean(b.ignition),
      blocked: Boolean(b.blocked),
      batteryVolts: 12.3 + Math.random(),
      lastFixAt: new Date(Date.now() - i * 90_000).toISOString(),
    }));
  }

  async getStatus(imei: string): Promise<PilotStatus> {
    const v = (await this.getFleet()).find((x) => x.imei === imei);
    return {
      imei,
      lat: v?.lat ?? 25.115 + Math.random() * 0.06,
      lon: v?.lon ?? 55.2 + Math.random() * 0.06,
      speed: v?.speed ?? 0,
      ignition: v?.ignition ?? false,
      blocked: v?.blocked ?? false,
      batteryVolts: v?.batteryVolts,
      lastFixAt: v?.lastFixAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async blockEngine(imei: string): Promise<PilotCommandResult> {
    if (!MOCK_FLEET.some((vehicle) => vehicle.imei === imei)) throw new Error("Mock vehicle not found");
    return { commandId: 1001, accepted: true };
  }

  async unblockEngine(imei: string): Promise<PilotCommandResult> {
    if (!MOCK_FLEET.some((vehicle) => vehicle.imei === imei)) throw new Error("Mock vehicle not found");
    return { commandId: 1002, accepted: true };
  }

}

// Multi-account: the holding runs several Pilot logins (TAKE Auto fleet +
// Cardiwan rent fleet, 2026-07-24). Cars are ONE physical pool that moves
// between brands, so we log into every account, fetch all fleets and merge by
// IMEI into a single live view — any tenant's vehicle matches the combined
// pool. getStatus tries each account until one owns the IMEI.
class MultiPilotClient implements PilotClient {
  readonly mode = "live" as const;
  constructor(private readonly clients: LivePilotClient[]) {}

  async getFleet(): Promise<PilotFleetVehicle[]> {
    const byImei = new Map<string, PilotFleetVehicle>();
    const results = await Promise.allSettled(this.clients.map((c) => c.getFleet()));
    for (const r of results) {
      if (r.status !== "fulfilled") {
        console.error("[pilot] one account fleet fetch failed:", r.reason?.message);
        continue;
      }
      for (const v of r.value) {
        if (v.imei && !byImei.has(v.imei)) byImei.set(v.imei, v);
      }
    }
    return [...byImei.values()];
  }

  async getStatus(imei: string): Promise<PilotStatus> {
    for (const c of this.clients) {
      try {
        const s = await c.getStatus(imei);
        if (s.lat !== 0 || s.lon !== 0) return s;
      } catch {
        /* try the next account */
      }
    }
    // None owned it / all empty — return the first account's (best-effort) answer.
    return this.clients[0].getStatus(imei);
  }

  private async ownedCommand(imei: string, command: "block" | "unblock"): Promise<PilotCommandResult> {
    for (const client of this.clients) {
      const fleet = await client.getFleet();
      if (fleet.some((vehicle) => vehicle.imei === imei)) {
        return command === "block" ? client.blockEngine(imei) : client.unblockEngine(imei);
      }
    }
    throw new Error("No configured Pilot account owns this vehicle");
  }

  async blockEngine(imei: string): Promise<PilotCommandResult> {
    return this.ownedCommand(imei, "block");
  }

  async unblockEngine(imei: string): Promise<PilotCommandResult> {
    return this.ownedCommand(imei, "unblock");
  }
}

/** Collect every configured Pilot account: PILOT_USERNAME/PASSWORD (+ _2, _3…). */
function pilotAccounts(): Array<{ user: string; pass: string }> {
  const accts: Array<{ user: string; pass: string }> = [];
  const base = { user: process.env.PILOT_USERNAME, pass: process.env.PILOT_PASSWORD };
  if (base.user && base.pass) accts.push({ user: base.user, pass: base.pass });
  for (let i = 2; i <= 9; i++) {
    const u = process.env[`PILOT_USERNAME_${i}`];
    const p = process.env[`PILOT_PASSWORD_${i}`];
    if (u && p) accts.push({ user: u, pass: p });
  }
  return accts;
}

export function getPilotClient(): PilotClient {
  const accts = pilotAccounts();
  if (accts.length === 0) return new MockPilotClient();
  if (accts.length === 1) return new LivePilotClient(accts[0].user, accts[0].pass);
  return new MultiPilotClient(accts.map((a) => new LivePilotClient(a.user, a.pass)));
}

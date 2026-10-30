/**
 * Pilot GPS → Twenty RENTAL fleet mirror (step 1, 2026-08-28).
 *
 * Pulls the vehicle list from the Pilot telematics API (Basic Auth,
 * https://pilot-gps.com/api/api.php?cmd=list) and upserts one card per
 * vehicle into the rental Twenty `vehicle` object. Idempotent on
 * externalId = `pilot:<veh_id>`. Blank-fill ONLY for status — the On Rent /
 * Overdue workflow owns that field, this script never touches it.
 *
 * Read-only against Pilot. DRY-RUN BY DEFAULT.
 *
 *   npx tsx scripts/pilot-fleet-sync.ts            # dry-run, prints plan
 *   npx tsx scripts/pilot-fleet-sync.ts --commit   # write to Twenty
 *
 * Env (.env.local): PILOT_API_EMAIL, PILOT_API_PASSWORD,
 * TWENTY_RENTAL_BASE_URL, TWENTY_RENTAL_API_KEY.
 */
import { readFileSync } from "node:fs";

const COMMIT = process.argv.includes("--commit");
const PILOT_BASE = process.env.PILOT_API_BASE ?? "https://pilot-gps.com/api/api.php";

function envFromFile(key: string): string {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = env.split("\n").find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim().replace(/^"|"$/g, "") : "";
}
const env = (k: string): string => process.env[k]?.trim() || envFromFile(k);

const PILOT_USER = env("PILOT_API_EMAIL");
const PILOT_PASS = env("PILOT_API_PASSWORD");
const T_BASE = (env("TWENTY_RENTAL_BASE_URL") || "http://localhost:3002").replace(/\/$/, "");
const T_KEY = env("TWENTY_RENTAL_API_KEY");
if (!PILOT_USER || !PILOT_PASS || !T_KEY) throw new Error("missing PILOT_API_* or TWENTY_RENTAL_API_KEY");

type PilotVehicle = {
  veh_id: number;
  imei?: string;
  model?: string;
  vehiclenumber?: string;
  vin?: string;
  current_mileage?: string;
  type?: string;
};

async function pilotList(): Promise<PilotVehicle[]> {
  const res = await fetch(`${PILOT_BASE}?cmd=list`, {
    headers: { Authorization: "Basic " + Buffer.from(`${PILOT_USER}:${PILOT_PASS}`).toString("base64") },
    signal: AbortSignal.timeout(60_000),
  });
  const body = (await res.json()) as { code: number; msg: string; list?: PilotVehicle[] };
  if (body.code !== 0 || !body.list) throw new Error(`pilot list failed: ${body.msg}`);
  return body.list;
}

async function tRest(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${T_BASE}/rest${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${T_KEY}`, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`twenty ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`[pilot-fleet-sync] mode=${COMMIT ? "COMMIT" : "DRY-RUN"}`);
  const pilot = await pilotList();
  console.log(`pilot vehicles: ${pilot.length}`);

  // Existing mirror, keyed by externalId (table is small — one page).
  const existing = new Map<string, { id: string; [k: string]: unknown }>();
  let cursor: string | null = null;
  do {
    const page = (await tRest(`/vehicles?limit=200${cursor ? `&ending_before=${cursor}` : ""}`)) as {
      data: { vehicles: { id: string; externalId?: string | null }[] };
      pageInfo: { endCursor: string | null; hasNextPage: boolean };
    };
    for (const v of page.data.vehicles) if (v.externalId) existing.set(v.externalId, v);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  let created = 0, updated = 0, unchanged = 0, failed = 0;
  for (const v of pilot) {
    const externalId = `pilot:${v.veh_id}`;
    const odometer = parseInt(String(v.current_mileage ?? ""), 10);
    const payload: Record<string, unknown> = {
      name: (v.vehiclenumber ?? "").trim() || `Pilot #${v.veh_id}`,
      externalId,
    };
    if (v.model?.trim()) payload.model = v.model.trim();
    if (v.imei?.trim()) payload.imei = v.imei.trim();
    if (Number.isFinite(odometer) && odometer >= 0) payload.odometer = odometer;

    const prior = existing.get(externalId);
    try {
      if (!prior) {
        console.log(` CREATE ${payload.name} (${payload.model ?? "?"}, ${payload.odometer ?? "?"} km)`);
        if (COMMIT) await tRest(`/vehicles`, { method: "POST", body: JSON.stringify(payload) });
        created++;
      } else {
        // Patch only what drifted; never touch status/plate (human-owned).
        const patch: Record<string, unknown> = {};
        for (const k of ["name", "model", "imei", "odometer"] as const) {
          if (payload[k] !== undefined && String(prior[k] ?? "") !== String(payload[k])) patch[k] = payload[k];
        }
        if (Object.keys(patch).length === 0) { unchanged++; continue; }
        console.log(` UPDATE ${payload.name}: ${Object.keys(patch).join(", ")}`);
        if (COMMIT) await tRest(`/vehicles/${prior.id}`, { method: "PATCH", body: JSON.stringify(patch) });
        updated++;
      }
      if (COMMIT) await sleep(150); // gentle on the REST rate limiter
    } catch (e) {
      failed++;
      console.error(` FAIL ${payload.name}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`done: ${created} created, ${updated} updated, ${unchanged} unchanged, ${failed} failed`);
}

main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });

// Direct Pilot-fleet seeder for OnWheels tenant.
// Reads pilot-fleet.json (pre-pulled from Pilot v3 API) and inserts vehicles
// without touching Next.js server-only chains.

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { db, pool } from "@/platform/db/client";
import { tenant, vehicle } from "@/platform/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

const TENANT_SLUG = "onwheels";
const FLEET_JSON = "/home/mca/onwheels-crm/pilot-fleet.json";

// Rough daily-rate heuristic by make (AED). For the demo only — real rates
// come from Yango later.
const DAILY_RATE: Record<string, number> = {
  "Mercedes-Benz": 1800,
  "BMW": 650,
  "Land Rover": 1200,
  "Range Rover": 1200,
  "Audi": 600,
  "Mini": 320,
  "Kia Telluride": 500,
  "Hyundai Palisade": 450,
  "Hyundai Genesis": 500,
  "Hyundai Sonata": 180,
  "Hyundai Elantra": 160,
  "Hyundai Venue": 160,
  "Toyota Corolla": 160,
  "Toyota": 180,
  "Honda Civic": 170,
  "Honda Accord": 220,
  "Chevrolet Captiva": 220,
  "Volkswagen T-Roc": 240,
  "Nissan Kicks": 170,
  "Kia Sportage": 220,
  "Kia Rio": 130,
  "Kia K5": 220,
  "Suzuki Swift": 110,
  "Mitsubishi Mirage": 100,
  "Mitsubishi Attrage": 100,
};

function splitMakeModel(fullModel: string): { make: string; model: string } {
  const trimmed = fullModel.trim();
  if (trimmed.startsWith("Mercedes-Benz")) return { make: "Mercedes-Benz", model: trimmed.slice("Mercedes-Benz".length).trim() || "Model" };
  if (trimmed.startsWith("Land Rover")) return { make: "Land Rover", model: trimmed.slice("Land Rover".length).trim() || "Model" };
  const parts = trimmed.split(/\s+/);
  return { make: parts[0] || "Unknown", model: parts.slice(1).join(" ") || parts[0] || "Unknown" };
}

function pickRate(make: string, model: string): number {
  const full = `${make} ${model}`;
  for (const key of Object.keys(DAILY_RATE)) {
    if (full.includes(key)) return DAILY_RATE[key];
  }
  if (DAILY_RATE[make]) return DAILY_RATE[make];
  return 200;
}

function cleanPlate(vehnum: string, model: string): string {
  // Pilot plates often contain the model as suffix: "AA29591 Rio" → "AA29591"
  // Strip the model tail if present. If the whole string is the plate (no model
  // suffix), return as-is.
  const first = vehnum.trim().split(/\s+/)[0];
  return first || vehnum.trim();
}

async function main() {
  const t = await db.select().from(tenant).where(eq(tenant.slug, TENANT_SLUG)).limit(1).then((r) => r[0] ?? null);
  if (!t) { console.error("Tenant 'onwheels' not found. Run setup-onwheels-tenant.ts first."); process.exit(1); }
  console.log(`Tenant ${t.id} (${t.slug})`);

  const raw = JSON.parse(readFileSync(FLEET_JSON, "utf8"));
  const rows = raw.data as any[];
  console.log(`Loaded ${rows.length} vehicles from Pilot JSON`);

  let inserted = 0, updated = 0;
  for (const r of rows) {
    const { make, model } = splitMakeModel(r.model || "Unknown");
    const plate = cleanPlate(r.vehiclenumber || "", r.model || "");
    const imei = String(r.imei || "");
    const agentId = String(r.agentid || r.veh_id || "");
    const odometer = Number(r.current_mileage || 0);
    const dailyRate = pickRate(make, model);
    const lat = r.status?.lat ? Number(r.status.lat) : null;
    const lon = r.status?.lon ? Number(r.status.lon) : null;
    const point = (lat != null && lon != null && !Number.isNaN(lat) && !Number.isNaN(lon))
      ? sql`ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography`
      : null;

    const existing = await db.select().from(vehicle).where(and(eq(vehicle.tenantId, t.id), eq(vehicle.imei, imei))).limit(1).then((r) => r[0] ?? null);
    const base = {
      tenantId: t.id, make, model, year: null as number | null, plate, division: "rent" as const,
      status: "available" as const, odometer, dailyRate, imei,
      pilotDeviceId: agentId, externalId: agentId, externalSource: "pilot",
    };
    const withPoint: any = point ? { ...base, point } : base;

    if (existing) {
      await db.update(vehicle).set({ ...withPoint, updatedAt: new Date() }).where(eq(vehicle.id, existing.id));
      updated++;
    } else {
      await db.insert(vehicle).values(withPoint);
      inserted++;
    }
    console.log(`  ✓ ${plate} — ${make} ${model} (${odometer} km, ${dailyRate} AED/day) ${lat ? `@ ${lat.toFixed(4)},${lon?.toFixed(4)}` : ""}`);
  }
  console.log(`\nDone. inserted=${inserted} updated=${updated}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

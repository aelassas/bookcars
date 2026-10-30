/**
 * RETIRED — DO NOT RUN. Superseded by platform/scripts/import-babek-fleet.ts.
 *
 * This importer deletes EVERY vehicle with external_source='babek-sheet' and
 * re-inserts the sheet from scratch, without assigning a company. Two problems,
 * both proven in production:
 *
 *  1. It does not set company_id, while the canonical importer only deletes rows
 *     that HAVE a company. Neither could see the other's rows, so running both
 *     produced two copies of all 98 cars — the live ones holding the rentals,
 *     the stale ones holding all 768 price tiers.
 *  2. Its blanket delete now covers cars that carry live rentals, bookings,
 *     price tiers and calendar events. Running it today would either destroy
 *     that history or fail on a foreign key.
 *
 * Kept for reference only; the guard below stops it from executing. Use
 * `npx tsx scripts/import-babek-fleet.ts`, which upserts on the unique index
 * from migration 0042 and preserves vehicle ids.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

throw new Error(
  "scripts/importers/import-babek-fleet.ts is RETIRED — it deletes live vehicles and creates duplicates. " +
    "Use scripts/import-babek-fleet.ts instead (upsert, company-aware, id-preserving).",
);
import { db, pool } from "@/platform/db/client";
import { tenant, vehicle } from "@/platform/db/schema";
import { eq, and, like } from "drizzle-orm";
import { readFileSync } from "fs";

const CSV =
  process.env.BABEK_CSV ??
  "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/wa-observer/babek-calendar.csv";
const TENANT_SLUG = "take-auto";
const COMMIT = process.argv.includes("--commit");

// Column indices in Babek's sheet (header row = line index 1; data from line 2).
const COL = { car: 0, color: 1, plate: 3, status: 4, b2cTier1: 29 };

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// Babek status → platform vehicle.status (available|on_rent|reserved|in_service|overdue)
function mapStatus(s: string): string {
  const k = (s || "").trim().toLowerCase();
  if (k.startsWith("rent")) return "on_rent";
  if (k.startsWith("book")) return "reserved";
  if (k.startsWith("serv")) return "in_service";
  if (k.startsWith("employ")) return "available"; // employee use — treat as not-bookable-external later
  return "available";
}

type Car = { make: string; model: string; year: number | null; plate: string; status: string; dailyRate: number; color: string };

async function main() {
  const tenantRow = await db
    .select()
    .from(tenant)
    .where(eq(tenant.slug, TENANT_SLUG))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!tenantRow) { console.error(`Tenant "${TENANT_SLUG}" not found.`); process.exit(1); }

  const lines = readFileSync(CSV, "utf8").split(/\r?\n/);
  const cars: Car[] = [];
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const c = parseCsvLine(lines[i]);
    const carName = (c[COL.car] || "").trim();
    const plate = (c[COL.plate] || "").trim();
    if (!carName || !plate) continue;
    const color = (c[COL.color] || "").trim();
    const ym = color.match(/\b(20\d{2}|19\d{2})\b/);
    const parts = carName.split(/\s+/);
    const rate = parseInt((c[COL.b2cTier1] || "").replace(/[^0-9]/g, ""), 10);
    cars.push({
      make: parts[0],
      model: parts.slice(1).join(" ") || carName,
      year: ym ? parseInt(ym[1], 10) : null,
      plate,
      status: mapStatus(c[COL.status]),
      dailyRate: Number.isFinite(rate) ? rate : 0,
      color,
    });
  }

  console.log(`\n📋 Parsed ${cars.length} real cars from Babek's sheet:\n`);
  cars.slice(0, 12).forEach((c) =>
    console.log(`   ${c.make} ${c.model} ${c.year ?? ""} | ${c.plate} | ${c.status} | ${c.dailyRate || "—"} AED/day`),
  );
  if (cars.length > 12) console.log(`   … and ${cars.length - 12} more`);
  const byStatus = cars.reduce<Record<string, number>>((a, c) => ((a[c.status] = (a[c.status] || 0) + 1), a), {});
  console.log(`\n   status mix:`, byStatus);

  const demo = await db
    .select({ id: vehicle.id })
    .from(vehicle)
    .where(and(eq(vehicle.tenantId, tenantRow.id), like(vehicle.plate, "[DEMO]%")));
  console.log(`\n🗑  Demo vehicles that will be removed: ${demo.length}`);

  if (!COMMIT) {
    console.log(`\n— DRY-RUN — no writes. Re-run with --commit to apply.\n`);
    await pool.end();
    return;
  }

  // idempotent: clear any prior babek-sheet import (leave the labeled [DEMO] seed —
  // it has demo rentals/leases attached via FKs; purge it separately if desired).
  await db
    .delete(vehicle)
    .where(and(eq(vehicle.tenantId, tenantRow.id), eq(vehicle.externalSource, "babek-sheet")));
  let n = 0;
  for (const c of cars) {
    await db.insert(vehicle).values({
      tenantId: tenantRow.id,
      make: c.make,
      model: c.model,
      year: c.year ?? undefined,
      plate: c.plate,
      division: "rent",
      status: c.status,
      dailyRate: c.dailyRate,
      externalSource: "babek-sheet",
      externalId: c.plate,
    });
    n++;
  }
  console.log(`\n✅ Committed: imported ${n} real cars into take-auto (${demo.length} [DEMO] seed left in place — purge separately).\n`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * Import Babek's tiered pricing into `price_tier` (contract Module 3 — pricing engine).
 * Per car: 4 B2C tiers + 4 B2B tiers (1-3 / 4-6 / 7-14 / 15+ days) + deposit + Cardoo.
 * Matches cars by plate to the babek-sheet vehicles. DRY-RUN default; --commit to write.
 *
 * NOTE: deposit/cardoo columns (sheet cols 39/40) are UNVERIFIED — flagged for Babek to confirm
 * (which column is deposit vs Cardoo). Tiers are high-confidence.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { readFileSync } from "fs";

const CSV =
  process.env.BABEK_CSV ??
  "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/wa-observer/babek-calendar.csv";
const TENANT_SLUG = "take-auto";
const COMMIT = process.argv.includes("--commit");

const COL = { car: 0, plate: 3, b2c: [29, 30, 31, 32], b2b: [34, 35, 36, 37], deposit: 39, cardoo: 40 };
const TIERS: [number, number | null][] = [[1, 3], [4, 6], [7, 14], [15, null]];

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur); return out;
}
const num = (x: string | undefined) => { const n = parseInt((x || "").replace(/[^0-9]/g, ""), 10); return Number.isFinite(n) ? n : null; };

async function main() {
  const tid = (await pool.query("SELECT id FROM tenant WHERE slug=$1", [TENANT_SLUG])).rows[0]?.id;
  if (!tid) { console.error(`Tenant ${TENANT_SLUG} not found`); process.exit(1); }
  const veh = (await pool.query<{ id: string; plate: string }>("SELECT id, plate FROM vehicle WHERE tenant_id=$1 AND external_source='babek-sheet'", [tid])).rows;
  const byPlate = new Map<string, string>(veh.map((v) => [String(v.plate).trim(), v.id]));

  const lines = readFileSync(CSV, "utf8").split(/\r?\n/);
  type Row = { vehicleId: string; channel: string; min: number; max: number | null; rate: number; deposit: number | null; cardoo: number | null };
  const rows: Row[] = [];
  let matched = 0, unmatched = 0;
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const c = parseCsvLine(lines[i]);
    const plate = (c[COL.plate] || "").trim();
    if (!plate || !(c[COL.car] || "").trim()) continue;
    const vid = byPlate.get(plate);
    if (!vid) { unmatched++; continue; }
    matched++;
    const deposit = num(c[COL.deposit]), cardoo = num(c[COL.cardoo]);
    for (const [chan, cols] of [["b2c", COL.b2c], ["b2b", COL.b2b]] as const) {
      TIERS.forEach(([min, max], t) => {
        const rate = num(c[cols[t]]);
        if (rate) rows.push({ vehicleId: vid, channel: chan, min, max, rate, deposit, cardoo });
      });
    }
  }

  console.log(`\n💰 Matched ${matched} cars, ${unmatched} unmatched. Built ${rows.length} price-tier rows.\n`);
  rows.slice(0, 8).forEach((r) => console.log(`   ${r.channel} ${r.min}-${r.max ?? "∞"}d → ${r.rate} AED/day  (dep ${r.deposit ?? "?"} / cardoo ${r.cardoo ?? "?"})`));

  if (!COMMIT) { console.log(`\n— DRY-RUN — no writes. Re-run with --commit.\n`); await pool.end(); return; }

  await pool.query(
    "DELETE FROM price_tier WHERE tenant_id=$1 AND vehicle_id IN (SELECT id FROM vehicle WHERE tenant_id=$1 AND external_source='babek-sheet')",
    [tid],
  );
  for (const r of rows) {
    await pool.query(
      "INSERT INTO price_tier (tenant_id, vehicle_id, channel, min_days, max_days, daily_rate, deposit, cardoo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [tid, r.vehicleId, r.channel, r.min, r.max, r.rate, r.deposit, r.cardoo],
    );
  }
  console.log(`\n✅ Committed ${rows.length} price-tier rows for ${matched} cars.\n`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });

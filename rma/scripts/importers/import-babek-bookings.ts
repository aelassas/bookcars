/**
 * Import Babek's real bookings into `booking` → the Booking Calendar shows live data
 * (contract Module 3). Parses the 3 booking blocks (B2C / B2B / Deposit) per car row.
 * Matches cars by plate. DRY-RUN default; --commit to write.
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

// Booking blocks in the sheet: [name?, date-from, date-to, manager, channel]
const BLOCKS = [
  { name: 5, from: 6, to: 7, mgr: 8, chan: "b2c" },
  { name: null, from: 10, to: 11, mgr: 12, chan: "b2b" },
  { name: null, from: 14, to: 15, mgr: 17, chan: "deposit" },
  { name: null, from: 19, to: 20, mgr: 22, chan: "deposit" },
  { name: null, from: 24, to: 25, mgr: 27, chan: "deposit" },
];

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur); return out;
}
function parseDate(s: string | undefined): string | null {
  const m = (s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, d, mo] = m; let y = m[3]; if (y.length === 2) y = "20" + y;
  const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}
function status(carStatus: string, primary: boolean): string {
  const k = (carStatus || "").toLowerCase();
  if (primary && k.startsWith("rent")) return "active";
  return "booked";
}

async function main() {
  const tid = (await pool.query("SELECT id FROM tenant WHERE slug=$1", [TENANT_SLUG])).rows[0]?.id;
  if (!tid) { console.error(`Tenant ${TENANT_SLUG} not found`); process.exit(1); }
  const veh = (await pool.query<{ id: string; plate: string }>("SELECT id, plate FROM vehicle WHERE tenant_id=$1 AND external_source='babek-sheet'", [tid])).rows;
  const byPlate = new Map<string, string>(veh.map((v) => [String(v.plate).trim(), v.id]));

  const lines = readFileSync(CSV, "utf8").split(/\r?\n/);
  type B = { vid: string; customer: string; chan: string; from: string; to: string | null; status: string; mgr: string };
  const bookings: B[] = [];
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const c = parseCsvLine(lines[i]);
    const plate = (c[3] || "").trim();
    const vid = byPlate.get(plate);
    if (!vid) continue;
    const carName = (c[5] || "").trim();
    const carStatus = c[4] || "";
    BLOCKS.forEach((b, idx) => {
      const from = parseDate(c[b.from]);
      if (!from) return;
      const to = parseDate(c[b.to]);
      bookings.push({
        vid,
        customer: (b.name != null ? (c[b.name] || "").trim() : carName) || carName,
        chan: b.chan,
        from,
        to,
        status: status(carStatus, idx === 0),
        mgr: (c[b.mgr] || "").trim(),
      });
    });
  }

  console.log(`\n📅 Built ${bookings.length} bookings from Babek's sheet.\n`);
  bookings.slice(0, 8).forEach((b) => console.log(`   ${b.chan} | ${b.from} → ${b.to ?? "?"} | ${b.status} | ${b.customer} | mgr ${b.mgr || "-"}`));
  const byStatus = bookings.reduce<Record<string, number>>((a, b) => ((a[b.status] = (a[b.status] || 0) + 1), a), {});
  console.log(`\n   status:`, byStatus);

  if (!COMMIT) { console.log(`\n— DRY-RUN — no writes. Re-run with --commit.\n`); await pool.end(); return; }

  await pool.query("DELETE FROM booking WHERE tenant_id=$1 AND source='babek-sheet'", [tid]);
  for (const b of bookings) {
    await pool.query(
      "INSERT INTO booking (tenant_id, vehicle_id, customer_name, channel, date_from, date_to, status, manager, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'babek-sheet')",
      [tid, b.vid, b.customer, b.chan, b.from, b.to, b.status, b.mgr],
    );
  }
  console.log(`\n✅ Committed ${bookings.length} bookings.\n`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });

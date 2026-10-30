/**
 * Import Babek's daily rental sheet -> fleet + active rentals, SPLIT BY BRAND.
 * Brand key = the sheet's "E/C" column: E* -> ETM, C* (or blank) -> Cardiwan.
 *
 * IDEMPOTENT BY UPSERT, NOT BY DELETE.
 *
 * The previous version deleted every 'babek-sheet' vehicle and re-inserted the
 * lot on each run. That handed every car a fresh uuid, so anything referencing
 * it — price_tier, booking, rental, vehicle_timeline_event — was orphaned or
 * blocked the delete outright. It also ran alongside a second importer with a
 * different delete predicate, which is how the fleet ended up holding two rows
 * for all 98 cars: the live ones carrying the rentals, the stale ones carrying
 * every single price tier.
 *
 * Now: vehicles upsert on (tenant_id, external_source, external_id) — the unique
 * index from 0042 — so ids are stable across runs and children stay attached.
 * Rentals are matched to the car's open sheet-imported rental and updated in
 * place; a car that left 'Rented' has its rental closed rather than deleted,
 * because deleting it would break the timeline events pointing at it.
 *
 * Run: npx tsx scripts/import-babek-fleet.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db, pool } from "@/platform/db/client";
import { tenant, company, vehicle, customer, rental, user } from "@/platform/db/schema";
import { priceTier } from "@/platform/db/rental-extras";
import { BABEK_SHEET_ID, getSheetValues, loadServiceAccount } from "@/platform/integrations/gsheets/writer";
import { and, eq, like, inArray, sql } from "drizzle-orm";
import type { QueryResult } from "pg";

const SHEET = "https://docs.google.com/spreadsheets/d/1jgPLQ8KAWLYKVL16ocAzpG_n-LU29wRMh5D75C_lJ64/export?format=csv&gid=0";
const TENANT_SLUG = "take-auto";
const MARK = "[babek-sheet]";

// Drizzle 0.45 + node-postgres types .returning() as any[] | QueryResult<never>;
// at runtime it is always the row array — normalize for the type system.
const firstId = (r: { id: string }[] | QueryResult<never>): string =>
  (Array.isArray(r) ? r[0] : r.rows[0]).id;

// minimal RFC4180 CSV parser -> string[][]
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch === "\r") { /* skip */ }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const STATUS_MAP: Record<string, string> = {
  rented: "on_rent", available: "available", service: "in_service",
  booked: "reserved", employee: "in_service",
};

function toDate(s: string): Date | null {
  const m = (s || "").trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}
const toInt = (s: string) => { const n = parseInt(String(s).replace(/[^\d]/g, ""), 10); return isNaN(n) ? 0 : n; };

async function main() {
  // The sheet went private — the public CSV export 401s every run. Read it
  // through the service account when creds exist (integrations/gsheets/
  // writer.ts); the public CSV stays as the fallback for a box without them.
  const sa = loadServiceAccount();
  let rows: string[][];
  if (sa) {
    rows = await getSheetValues(sa, BABEK_SHEET_ID);
    console.log(`${MARK} sheet read via service account (${rows.length} rows)`);
  } else {
    const res = await fetch(SHEET);
    if (!res.ok) throw new Error(`sheet fetch ${res.status}`);
    rows = parseCsv(await res.text());
  }
  const data = rows.slice(2); // row0 sections, row1 headers

  const [t] = await db.select().from(tenant).where(eq(tenant.slug, TENANT_SLUG)).limit(1);
  if (!t) throw new Error("tenant take-auto not found");
  const tid = t.id;
  const cos = await db.select().from(company).where(eq(company.tenantId, tid));
  const cardiwan = cos.find((c) => c.slug === "cardiwan");
  const etm = cos.find((c) => c.slug === "etm");
  if (!cardiwan || !etm) throw new Error("cardiwan/etm company not found");

  // Manager name in the sheet → platform user id, so a rental's agent is the
  // person who actually did it (Babek/Abdullah/Ali/Ammar). This is what the
  // returns auto-chase + line-head oversight target; unmapped names
  // (Walid/Lomali/-) resolve to null and fall back to the rent head.
  const users = await db.select({ id: user.id, name: user.name, email: user.email }).from(user);
  const MGR_NEEDLE: Record<string, string> = {
    babek: "babek", abdulla: "abdullah", abdullah: "abdullah",
    ali: "ali sohiel", ammar: "ammar", mohammed: "mohammed",
  };
  // Canonical accounts by email — there are duplicate name matches (e.g. two
  // "Babek" users), and we must attribute to the one that actually has the brand
  // memberships/login, not the orphan. Email wins over a name substring.
  const MGR_EMAIL: Record<string, string> = { babek: "babek@cardiwan.ae" };
  const mgrUserId = new Map<string, string>();
  for (const [sheetName, needle] of Object.entries(MGR_NEEDLE)) {
    const byEmail = MGR_EMAIL[sheetName]
      ? users.find((x) => (x.email ?? "").toLowerCase() === MGR_EMAIL[sheetName])
      : undefined;
    const u = byEmail ?? users.find((x) => (x.name ?? "").toLowerCase().includes(needle));
    if (u) mgrUserId.set(sheetName, u.id);
  }
  const resolveMgr = (raw: string): string | null => {
    const m = (raw || "").trim().toLowerCase();
    return m && m !== "-" ? mgrUserId.get(m) ?? null : null;
  };
  // Brand key = the "E/C" column, which is compound: the letter before the
  // slash owns the car, the suffix says where it was handed (/T = TAKE Auto,
  // to sell — those cars keep being rented meanwhile). Only the owner letter
  // decides the company; the raw value is stored on the vehicle so an
  // unrecognised suffix survives instead of being mapped to a guess.
  const companyFor = (ec: string) => ((ec || "").trim().toUpperCase().startsWith("E") ? etm.id : cardiwan.id);
  const blanks: string[] = [];
  console.log("Importing Babek sheet -> split by E/C (E=ETM, C=Cardiwan) · upsert mode");

  const custCache = new Map<string, string>();
  async function getCustomer(name: string, companyId: string): Promise<string> {
    const key = `${companyId}::${name.toLowerCase()}`;
    if (custCache.has(key)) return custCache.get(key)!;
    const [ex] = await db.select().from(customer).where(and(eq(customer.tenantId, tid), eq(customer.companyId, companyId), eq(customer.name, name))).limit(1);
    const id = ex ? ex.id : firstId(await db.insert(customer).values({ tenantId: tid, companyId, name, division: "rent", source: "sheet" }).returning());
    custCache.set(key, id); return id;
  }

  const stats = { vehicles: 0, opened: 0, updated: 0, closed: 0 };
  const perCompany: Record<string, { cars: number; rentals: number }> = {};
  const seen = new Set<string>();

  for (const r of data) {
    if (r.length < 5 || !r[0]?.trim()) continue;
    const carName = r[0].trim();
    const modelColor = (r[1] || "").trim();
    const ec = (r[2] || "").trim();
    const plate = (r[3] || "").trim();
    const statusRaw = (r[4] || "").trim().toLowerCase();
    if (!plate) continue;
    // A blank brand cell is not data — it currently lands in Cardiwan by
    // default. Record it so the guess is visible instead of silent.
    if (!ec) blanks.push(plate);
    const cid = companyFor(ec);
    const bucket = (perCompany[cid] ??= { cars: 0, rentals: 0 });
    const make = carName.split(/\s+/)[0];
    const model = (carName.slice(make.length).trim() + (modelColor ? ` ${modelColor}` : "")).trim();
    const yearM = modelColor.match(/(20\d{2})/);
    // Exact sheet columns (verified against the live CSV, not the merged-cell
    // markdown): B2C tiers 29-32, B2B tiers 34-37, deposit 39, cardoo 40.
    // The old code read deposit from col 36 — which is the B2B 7-14-day RATE,
    // so every imported deposit was wrong.
    const b2c = [29, 30, 31, 32].map((i) => toInt(r[i] || "0"));
    const b2b = [34, 35, 36, 37].map((i) => toInt(r[i] || "0"));
    const dailyRate = b2c[0] || b2c.find((x) => x) || 0;
    const deposit = toInt(r[39] || "0");
    const cardoo = toInt(r[40] || "0");
    const vStatus = STATUS_MAP[statusRaw] || "available";

    // Upsert on the 0042 unique index. The car keeps its id, so its price
    // tiers, bookings, rentals and timeline events all stay attached.
    const vid = firstId(
      await db
        .insert(vehicle)
        .values({
          tenantId: tid, companyId: cid, make, model: model || carName, plate,
          year: yearM ? Number(yearM[1]) : null, division: "rent", status: vStatus,
          dailyRate: dailyRate || 0, externalSource: "babek-sheet", externalId: plate,
          sheetBrandKey: ec || null,
        })
        .onConflictDoUpdate({
          target: [vehicle.tenantId, vehicle.externalSource, vehicle.externalId],
          set: {
            companyId: cid, make, model: model || carName, plate,
            year: yearM ? Number(yearM[1]) : null, status: vStatus,
            dailyRate: dailyRate || 0, sheetBrandKey: ec || null, updatedAt: new Date(),
          },
        })
        .returning(),
    );
    seen.add(vid);
    bucket.cars++;
    stats.vehicles++;

    // Mirror the FULL pricing grid the sheet carries (B2C + B2B × 4 duration
    // brackets + deposit + cardoo) into price_tier, so the finder/quote engine
    // uses Babek's real tiered prices, not just a headline daily rate. Rebuilt
    // per car each run — idempotent (there is no unique key to upsert on).
    const BRACKETS: [number, number][] = [[1, 3], [4, 6], [7, 14], [15, 30]];
    const tierRows = BRACKETS.flatMap(([mn, mx], k) => {
      const out: (typeof priceTier.$inferInsert)[] = [];
      if (b2c[k]) out.push({ tenantId: tid, vehicleId: vid, channel: "b2c", minDays: mn, maxDays: mx, dailyRate: b2c[k], deposit: deposit || null, cardoo: cardoo || null });
      if (b2b[k]) out.push({ tenantId: tid, vehicleId: vid, channel: "b2b", minDays: mn, maxDays: mx, dailyRate: b2b[k], deposit: deposit || null, cardoo: cardoo || null });
      return out;
    });
    await db.delete(priceTier).where(and(eq(priceTier.tenantId, tid), eq(priceTier.vehicleId, vid)));
    if (tierRows.length) await db.insert(priceTier).values(tierRows);

    // The car's currently-open sheet-imported rental, if any.
    const [openRental] = await db
      .select({ id: rental.id })
      .from(rental)
      .where(and(
        eq(rental.tenantId, tid),
        eq(rental.vehicleId, vid),
        eq(rental.status, "active"),
        like(rental.notes, `%${MARK}%`),
      ))
      .limit(1);

    const custName = (r[5] || "").trim();
    const from = toDate(r[6] || ""), to = toDate(r[7] || "");

    if (statusRaw === "rented" && custName && from) {
      const cust = await getCustomer(custName, cid);
      const end = to || new Date(from.getTime() + 30 * 86400000);
      const days = Math.max(1, Math.round((end.getTime() - from.getTime()) / 86400000));
      const notes = `${MARK} imported from Babek daily sheet · E/C=${ec || "?"} · mgr ${(r[8] || "").trim() || "?"}`;
      const values = {
        customerId: cust, startDate: from, returnDate: end,
        dailyRate: dailyRate || 0, totalDays: days, deposit: deposit || 0,
        // Attribute the rental to the manager who did it (sheet col 8) so the
        // returns auto-chase pings THEM, not just the rent head.
        salesAgentId: resolveMgr(r[8] || ""),
        total: (dailyRate || 0) * days, notes, updatedAt: new Date(),
      };

      if (openRental) {
        // Updated in place — deleting would break vehicle_timeline_event.rental_id.
        await db.update(rental).set(values).where(eq(rental.id, openRental.id));
        stats.updated++;
      } else {
        await db.insert(rental).values({
          tenantId: tid, companyId: cid, vehicleId: vid, balanceDue: 0,
          status: "active", contractType: "deposit", ...values,
        });
        stats.opened++;
      }
      bucket.rentals++;
    } else if (openRental) {
      // No longer 'Rented' in the sheet: close the rental, keep the row so its
      // history and calendar events survive.
      await db
        .update(rental)
        .set({ status: "returned", actualReturnDate: new Date(), updatedAt: new Date() })
        .where(eq(rental.id, openRental.id));
      stats.closed++;
    }
  }

  // Keep each car's calendar honest. A rental closed above would otherwise
  // still read "active" on the vehicle timeline, since the events were seeded
  // once and nothing propagated the status change. Dates follow too, because
  // the sheet is where a rental's end date actually gets corrected.
  const synced = await db.execute(sql`
    UPDATE vehicle_timeline_event e
       SET status = CASE r.status
                      WHEN 'cancelled' THEN 'cancelled'
                      WHEN 'returned'  THEN 'done'
                      WHEN 'completed' THEN 'done'
                      WHEN 'active'    THEN 'active'
                      ELSE 'planned'
                    END,
           starts_at  = r.start_date,
           ends_at    = COALESCE(r.actual_return_date, r.return_date),
           updated_at = now()
      FROM rental r
     WHERE e.rental_id = r.id
       AND e.type = 'rental'
       AND (e.status IS DISTINCT FROM CASE r.status
                                        WHEN 'cancelled' THEN 'cancelled'
                                        WHEN 'returned'  THEN 'done'
                                        WHEN 'completed' THEN 'done'
                                        WHEN 'active'    THEN 'active'
                                        ELSE 'planned'
                                      END
            OR e.starts_at IS DISTINCT FROM r.start_date
            OR e.ends_at IS DISTINCT FROM COALESCE(r.actual_return_date, r.return_date))
  `);
  console.log(`  calendar events re-synced to rental state: ${synced.rowCount ?? 0}`);

  // Cars that vanished from the sheet are NOT deleted — they may still carry
  // rentals, documents and timeline history. Report them for a human to judge.
  const stray = await db
    .select({ id: vehicle.id, plate: vehicle.plate })
    .from(vehicle)
    .where(and(
      eq(vehicle.tenantId, tid),
      eq(vehicle.externalSource, "babek-sheet"),
      inArray(vehicle.companyId, [cardiwan.id, etm.id]),
    ));
  const missing = stray.filter((v) => !seen.has(v.id));

  const label = (id: string) => (id === etm.id ? "ETM" : "Cardiwan");
  console.log("\n─── done ───");
  for (const [id, v] of Object.entries(perCompany)) console.log(`  ${label(id)}: ${v.cars} vehicles · ${v.rentals} active rentals`);
  console.log(`  upserted ${stats.vehicles} vehicles · rentals: ${stats.opened} opened, ${stats.updated} updated, ${stats.closed} closed`);
  if (missing.length) {
    console.log(`\n⚠️  ${missing.length} vehicle(s) in the DB are no longer in the sheet — NOT deleted, review by hand:`);
    for (const m of missing) console.log(`     ${m.plate}`);
  }
  if (blanks.length) {
    console.log(`\n⚠️  ${blanks.length} car(s) have an empty E/C cell and defaulted to Cardiwan — confirm the owner:`);
    for (const p of blanks) console.log(`     ${p}`);
  }
}

main().then(async () => { await pool.end(); process.exit(0); }).catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });

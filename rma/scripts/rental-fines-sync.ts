/**
 * Calendar 3 sheet → Twenty RENTAL rentals + per-window RTA fines / Salik.
 *
 * Pass A — sheet → `_rental` records:
 *   Every Calendar row with Status "Rented" and a parseable Date-from in
 *   block 1 (cols F–H) upserts a rental, keyed
 *   externalId = `cal3:<digits><CODE>:<fromDateISO>` (e.g. cal3:24787G:2026-08-06).
 *   The vehicle relation is matched by normalized plate (sheet "24787 G" and
 *   card name "E70574 EXEED" both reduce to `<digits>|<CODE>`); the vehicle's
 *   empty `plate` field is patched with the normalized form at most once per
 *   run. Rows whose plate matches no Twenty vehicle are skipped + logged.
 *   Status is set to the existing ACTIVE option only; options are never
 *   created or edited (the id-stripping incident).
 *
 * Pass B — fines & Salik:
 *   RTA guest API (src/platform/integrations/rta) once per unique plate,
 *   cached per run: vehicle.rtaFinesAed = ALL outstanding fines (every
 *   vehicle, not just rented ones); rental.rtaFinesAed = fines ticketed
 *   inside the rental window (startDate .. returnDate||today), plus a
 *   human-readable multi-line finesBreakdown.
 *   Salik customer portal (scripts/salik-trips.cjs, one session per account):
 *   toll + parking spend from startDate → today → rental.salikAed, and the
 *   same number onto the vehicle while its rental is active. Vehicles with
 *   no active rental keep their previous salikAed.
 *   finesCheckedAt = run time on every record written.
 *
 * DRY-RUN BY DEFAULT; --commit writes. External lookups (sheet, RTA, Salik)
 * run in both modes so the dry run shows the real numbers.
 *
 * Run from platform/ on the box:
 *   node --require ./node_modules/tsx/dist/preflight.cjs \
 *        --import file://$PWD/node_modules/tsx/dist/loader.mjs \
 *        scripts/rental-fines-sync.ts [--commit]
 *
 * Env: TWENTY_RENTAL_BASE_URL / TWENTY_RENTAL_API_KEY (from .env.local).
 * Secrets: scripts/.google-adc.json (Sheets refresh token),
 *          scripts/.salik-accounts.json (Salik logins) — never printed.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { lookupFines, type RtaFinesResult } from "@/platform/integrations/rta/client";
import { decodePlate } from "@/platform/integrations/rta/plate";
import { createTwentyClient, type TwentyClient } from "@/platform/integrations/twenty/client";
import { resolveTwentyInstance } from "@/platform/integrations/twenty/instance";

const COMMIT = process.argv.includes("--commit");

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SHEET_ID = "1WI-9mS-HtJkUZArOlLAvDevvyfRRXKzAm8tJBJJFKfw";
const ADC_PATH = join(ROOT, "scripts/.google-adc.json");
const SALIK_ACCOUNTS_PATH = join(ROOT, "scripts/.salik-accounts.json");

const VEHICLE_OBJECT_ID = "6a9d4eec-376c-41bc-afbd-8b72bd971a1c";
const RENTAL_OBJECT_ID = "66ffa2d5-8ce8-4567-b1de-4057e4a84595";

const RTA_DELAY_MS = 300;
const SALIK_DELAY_MS = 200;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const require = createRequire(import.meta.url);
// Zero-dep Salik customer-portal connector (docs/salik-connector.md).
const salik = require("../../scripts/salik-trips.cjs") as {
  login(user: string, pass: string): Promise<unknown>;
  getVehicles(jar: unknown): Promise<Map<string, { color: string; colorId: string }>>;
  getTollTrips(
    jar: unknown,
    q: { plateNumber: string; colorId: string; from: Date; to: Date },
  ): Promise<{ date: Date; amount: number; gate: string }[]>;
  getParkingTrips(
    jar: unknown,
    q: { from: Date; to: Date },
  ): Promise<{ plateNumber: string; plateColor: string; date: Date | null; amount: number }[]>;
};

// ── Google Sheets ───────────────────────────────────────────────────────────

async function accessToken(): Promise<string> {
  const adc = JSON.parse(readFileSync(ADC_PATH, "utf8"));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: adc.client_id,
      client_secret: adc.client_secret,
      refresh_token: adc.refresh_token,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`token mint failed: ${res.status}`);
  return body.access_token;
}

async function sheetValues(token: string, range: string): Promise<string[][]> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`sheets ${range} -> ${res.status}`);
  return body.values || [];
}

// ── sheet parsing ───────────────────────────────────────────────────────────

const cell = (r: unknown[], i: number) => (r[i] ?? "").toString().trim();

/** DD/MM/YYYY → local-midnight Date (box runs GST), null when unparseable. */
function parseDate(s: unknown): Date | null {
  const m = String(s ?? "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(y, Number(m[2]) - 1, Number(m[1]));
  return isNaN(d.getTime()) ? null : d;
}

/** Local date → UTC-midnight ISO for storage (no day shift for GST readers). */
const toIso = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();

interface SheetRental {
  plateRaw: string; // as written, whitespace-collapsed
  plateNo: string; // digits
  plateCode: string; // 1-2 letters, upper
  plateKey: string; // `<no>|<CODE>`
  renter: string;
  manager: string; // block-1 "Manager" (col I) — the agent running this rental
  from: Date;
  to: Date | null;
}

function rentedRows(rows: string[][]): { rentals: SheetRental[]; skipped: string[] } {
  const rentals: SheetRental[] = [];
  const skipped: string[] = [];
  for (const r of rows.slice(2)) {
    if (cell(r, 4).toLowerCase() !== "rented") continue;
    const car = cell(r, 0) || "(no car name)";
    const plateRaw = cell(r, 3).replace(/\s+/g, " ").trim();
    const decoded = decodePlate(plateRaw);
    const from = parseDate(r[6]);
    if (!decoded) {
      skipped.push(`${car} — plate "${plateRaw}" not parseable`);
      continue;
    }
    if (!from) {
      skipped.push(`${car} (${plateRaw}) — no parseable Date-from in block 1`);
      continue;
    }
    rentals.push({
      plateRaw,
      plateNo: decoded.query.plateNo,
      plateCode: decoded.query.plateCode,
      plateKey: `${decoded.query.plateNo}|${decoded.query.plateCode}`,
      renter: cell(r, 5) || "(no name)",
      manager: cell(r, 8),
      from,
      to: parseDate(r[7]),
    });
  }
  return { rentals, skipped };
}

// ── Twenty helpers ──────────────────────────────────────────────────────────

interface VehicleRow {
  id: string;
  name: string;
  plate: string | null;
  plateKey: string | null;
}

async function listVehicles(client: TwentyClient): Promise<VehicleRow[]> {
  const out: VehicleRow[] = [];
  for await (const v of client.listAll<Record<string, unknown>>("vehicles", { limit: 200 })) {
    const name = String(v.name ?? "");
    // Card names are "<plate> <model>" — only the FIRST token is the plate,
    // so model years/trim numbers ("2023", "430i") never pollute the key.
    const decoded = decodePlate(name.split(/\s+/)[0] ?? "");
    out.push({
      id: String(v.id),
      name,
      plate: (v.plate as string | null) ?? null,
      plateKey: decoded ? `${decoded.query.plateNo}|${decoded.query.plateCode}` : null,
    });
  }
  return out;
}

interface RentalRow {
  id: string;
  externalId: string | null;
}

async function listRentals(client: TwentyClient): Promise<RentalRow[]> {
  const out: RentalRow[] = [];
  for await (const r of client.listAll<Record<string, unknown>>("rentals", { limit: 200 })) {
    out.push({ id: String(r.id), externalId: (r.externalId as string | null) ?? null });
  }
  return out;
}

/** The rental status SELECT's ACTIVE option value, or null if it does not exist. */
async function activeStatusValue(client: TwentyClient): Promise<string | null> {
  const fields = await client.metadata.listFields();
  const status = fields.find((f) => f.objectMetadataId === RENTAL_OBJECT_ID && f.name === "status");
  const options = (status?.options as { value: string }[] | undefined) ?? [];
  return options.some((o) => o.value === "ACTIVE") ? "ACTIVE" : null;
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[rental-fines-sync] mode=${COMMIT ? "COMMIT" : "DRY-RUN"} ${new Date().toISOString()}`);

  const cfg = resolveTwentyInstance("rental");
  if (!cfg.configured) throw new Error("TWENTY_RENTAL_API_KEY not configured");
  const twenty = createTwentyClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, mode: "live" });

  const token = await accessToken();
  const rows = await sheetValues(token, "Calendar!A1:BZ125");
  const { rentals, skipped } = rentedRows(rows);
  console.log(`sheet: ${rentals.length} rented rows with a start date, ${skipped.length} skipped`);
  for (const s of skipped) console.log(`  SKIP sheet: ${s}`);

  const vehicles = await listVehicles(twenty);
  const vehicleByKey = new Map<string, VehicleRow>();
  for (const v of vehicles) {
    if (v.plateKey && !vehicleByKey.has(v.plateKey)) vehicleByKey.set(v.plateKey, v);
  }
  console.log(`twenty: ${vehicles.length} vehicles, ${vehicleByKey.size} with a parseable plate key`);

  const existing = await listRentals(twenty);
  const rentalByExtId = new Map(existing.filter((r) => r.externalId).map((r) => [r.externalId!, r.id]));
  const statusValue = await activeStatusValue(twenty);
  if (!statusValue) console.log("WARNING: rental status SELECT has no ACTIVE option — status left unset");

  // ── Pass A: upsert rentals ──────────────────────────────────────────────
  const unmatched: string[] = [];
  const platePatched = new Set<string>();
  let created = 0, updated = 0;
  interface ActiveRental extends SheetRental {
    rentalId: string | null; // null until committed
    vehicle: VehicleRow;
  }
  const active: ActiveRental[] = [];

  for (const r of rentals) {
    const vehicle = r.plateKey ? vehicleByKey.get(r.plateKey) : undefined;
    if (!vehicle) {
      unmatched.push(`${r.plateRaw} (${r.renter})`);
      continue;
    }
    const fromIso = toIso(r.from);
    const externalId = `cal3:${r.plateNo}${r.plateCode}:${fromIso.slice(0, 10)}`;
    const body: Record<string, unknown> = {
      name: `${r.plateNo} ${r.plateCode} · ${r.renter}`,
      startDate: fromIso,
      returnDate: r.to ? toIso(r.to) : null,
      vehicleId: vehicle.id,
      ...(r.manager ? { manager: r.manager } : {}),
      ...(statusValue ? { status: statusValue } : {}),
    };
    const existingId = rentalByExtId.get(externalId);
    try {
      if (COMMIT) {
        if (existingId) {
          await twenty.patch(`rentals/${existingId}`, body);
          updated++;
        } else {
          const res = (await twenty.post("rentals", { ...body, externalId })) as {
            data: { createRental: { id: string } };
          };
          rentalByExtId.set(externalId, res.data.createRental.id);
          created++;
        }
        // Backfill the vehicle's empty plate field, at most once per run.
        if (!vehicle.plate && !platePatched.has(vehicle.id)) {
          await twenty.patch(`vehicles/${vehicle.id}`, { plate: `${r.plateCode}${r.plateNo}` });
          vehicle.plate = `${r.plateCode}${r.plateNo}`;
          platePatched.add(vehicle.id);
        }
        await sleep(100);
      } else {
        if (existingId) updated++;
        else created++;
      }
      active.push({ ...r, rentalId: rentalByExtId.get(externalId) ?? existingId ?? null, vehicle });
    } catch (e) {
      console.error(`  FAIL upsert ${externalId}: ${(e as Error).message.slice(0, 160)}`);
    }
  }
  console.log(`pass A: ${created} created, ${updated} updated, ${unmatched.length} unmatched plates, ${platePatched.size} vehicle plates backfilled`);
  for (const u of unmatched) console.log(`  SKIP unmatched: ${u}`);

  // ── Pass B: RTA fines + Salik ───────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nowIso = new Date().toISOString();

  // RTA: one lookup per unique plate, cached — rented plates first, then
  // every other vehicle for the outstanding total.
  const rtaCache = new Map<string, RtaFinesResult | null>();
  const plateQueries: { key: string; no: string; code: string }[] = [];
  const seen = new Set<string>();
  for (const r of active) {
    if (!seen.has(r.plateKey)) {
      seen.add(r.plateKey);
      plateQueries.push({ key: r.plateKey, no: r.plateNo, code: r.plateCode });
    }
  }
  for (const v of vehicles) {
    if (!v.plateKey || seen.has(v.plateKey)) continue;
    seen.add(v.plateKey);
    const [no, code] = v.plateKey.split("|");
    plateQueries.push({ key: v.plateKey, no, code });
  }
  console.log(`pass B: ${plateQueries.length} unique plates to check with RTA`);

  let rtaOk = 0, rtaFailed = 0;
  for (const q of plateQueries) {
    const decoded = decodePlate(`${q.no} ${q.code}`);
    if (!decoded) {
      rtaCache.set(q.key, null);
      continue;
    }
    try {
      rtaCache.set(q.key, await lookupFines(decoded.query));
      rtaOk++;
    } catch (e) {
      console.error(`  RTA FAIL ${q.key}: ${(e as Error).message.slice(0, 120)}`);
      rtaCache.set(q.key, null);
      rtaFailed++;
    }
    await sleep(RTA_DELAY_MS);
  }
  console.log(`pass B RTA: ${rtaOk} ok, ${rtaFailed} failed`);

  // Salik: one session per account, plate → owning account map.
  type SalikOwner = { jar: unknown; colorId: string };
  const ownership = new Map<string, SalikOwner>();
  const allParking: { plateNumber: string; plateColor: string; date: Date | null; amount: number }[] = [];
  try {
    const accounts = JSON.parse(readFileSync(SALIK_ACCOUNTS_PATH, "utf8")) as { user: string; pass: string }[];
    const earliest = active.reduce((m, r) => (!m || r.from < m ? r.from : m), null as Date | null) ?? today;
    for (const acc of accounts) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const jar = await salik.login(acc.user, acc.pass);
          const vList = await salik.getVehicles(jar);
          for (const [num, v] of vList) ownership.set(`${num}|${v.color.toUpperCase()}`, { jar, colorId: v.colorId });
          allParking.push(...(await salik.getParkingTrips(jar, { from: earliest, to: today })));
          console.log(`salik: ${acc.user} — ${vList.size} vehicles, parking rows since ${earliest.toISOString().slice(0, 10)} fetched`);
          break;
        } catch (e) {
          if (attempt === 2) console.error(`salik: account ${acc.user} failed: ${(e as Error).message.slice(0, 120)}`);
          else await sleep(2000);
        }
      }
    }
  } catch (e) {
    console.error(`salik: skipped — ${(e as Error).message.slice(0, 120)}`);
  }

  const salikByKey = new Map<string, number>();
  let salikMiss = 0;
  for (const r of active) {
    if (salikByKey.has(r.plateKey)) continue;
    const owner =
      ownership.get(`${r.plateNo}|${r.plateCode}`) ||
      [...ownership.entries()].find(([k]) => k.startsWith(`${r.plateNo}|`))?.[1];
    if (!owner) {
      salikMiss++;
      continue;
    }
    try {
      const trips = await salik.getTollTrips(owner.jar, { plateNumber: r.plateNo, colorId: owner.colorId, from: r.from, to: today });
      const toll = trips.reduce((s, t) => s + t.amount, 0);
      const parking = allParking.filter(
        (p) => p.plateNumber === r.plateNo && (!r.plateCode || p.plateColor === r.plateCode) && p.date && p.date >= r.from,
      );
      salikByKey.set(r.plateKey, Math.round((toll + parking.reduce((s, p) => s + p.amount, 0)) * 100) / 100);
    } catch (e) {
      console.error(`  SALIK FAIL ${r.plateKey}: ${(e as Error).message.slice(0, 120)}`);
    }
    await sleep(SALIK_DELAY_MS);
  }
  console.log(`pass B Salik: ${salikByKey.size} plates priced, ${salikMiss} on no configured account`);

  // ── writes ──────────────────────────────────────────────────────────────
  const endOfDay = (d: Date) => {
    const e = new Date(d);
    e.setHours(23, 59, 59, 999);
    return e;
  };

  let rentalsWritten = 0, vehiclesWritten = 0;
  const vehicleSalik = new Map<string, number>(); // vehicleId -> salik of its current rental
  for (const r of active) {
    const salikAed = salikByKey.get(r.plateKey);
    if (salikAed !== undefined) vehicleSalik.set(r.vehicle.id, salikAed);

    const rta = rtaCache.get(r.plateKey);
    const windowEnd = endOfDay(r.to ?? today);
    const inWindow = (rta?.fines ?? []).filter((f) => {
      const d = new Date(f.ticketDate);
      return isNaN(d.getTime()) || (d >= r.from && d <= windowEnd);
    });
    const finesAed = inWindow.reduce((s, f) => s + f.amount, 0);
    const breakdown = inWindow
      .map((f) => `${String(f.ticketDate).slice(0, 10)} · ${f.amount} AED · ${f.description}`.slice(0, 300))
      .join("\n");

    console.log(
      `  ${r.plateKey} (${r.renter}, ${toIso(r.from).slice(0, 10)} → ${r.to ? toIso(r.to).slice(0, 10) : "open"}): ` +
        `window fines ${finesAed} AED (${inWindow.length}), salik ${salikAed ?? "n/a"} AED, outstanding ${rta?.totalAmount ?? "lookup failed"} AED`,
    );

    if (!COMMIT || !r.rentalId) continue;
    try {
      await twenty.patch(`rentals/${r.rentalId}`, {
        rtaFinesAed: rta ? finesAed : null,
        finesBreakdown: breakdown || null,
        ...(salikAed !== undefined ? { salikAed } : {}),
        finesCheckedAt: nowIso,
      });
      rentalsWritten++;
      await sleep(100);
    } catch (e) {
      console.error(`  FAIL rental write ${r.plateKey}: ${(e as Error).message.slice(0, 160)}`);
    }
  }

  for (const v of vehicles) {
    if (!v.plateKey) continue;
    const rta = rtaCache.get(v.plateKey);
    if (rta === undefined) continue; // plate never queried (shouldn't happen)
    if (rta === null) continue; // lookup failed — don't blank a good number
    const salikAed = vehicleSalik.get(v.id); // only vehicles with an active rental
    if (!COMMIT) {
      vehiclesWritten++;
      continue;
    }
    try {
      await twenty.patch(`vehicles/${v.id}`, {
        rtaFinesAed: rta.totalAmount,
        ...(salikAed !== undefined ? { salikAed } : {}),
        finesCheckedAt: nowIso,
      });
      vehiclesWritten++;
      await sleep(100);
    } catch (e) {
      console.error(`  FAIL vehicle write ${v.plateKey}: ${(e as Error).message.slice(0, 160)}`);
    }
  }

  console.log(
    `done: ${COMMIT ? `${rentalsWritten} rentals + ${vehiclesWritten} vehicles written` : "DRY-RUN — nothing written"} · ` +
      `${unmatched.length} unmatched sheet plates · ${salikMiss} plates off Salik accounts`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Calendar 3 sheet → Twenty RENTAL fleet backfill (2026-08-29).
 *
 * The Pilot mirror only covers cars with GPS trackers — 7 of 102 sheet plates.
 * The other ~95 are real fleet cars the rental desk works with daily, and
 * without vehicle cards their rentals can't file (rental-fines-sync skips
 * them). This imports every sheet row with a parseable plate that Twenty
 * doesn't already have:
 *
 *   name        "<CODE><digits> <Car>"   — same shape as the Pilot mirror
 *   plate       "<CODE><digits>"
 *   model       sheet "Car" column
 *   year        4-digit year parsed from "Model/Color", when present
 *   status      sheet Status → AVAILABLE / ON_RENT / RESERVED / IN_SERVICE
 *   externalId  "cal3:<digits>|<CODE>"   — distinct namespace from pilot:<id>
 *
 * Cars that ALREADY exist (Pilot-mirrored) get their empty `status` patched
 * from the sheet — that fills the column for the whole fleet. Plate/number
 * fields on existing cards are human-owned and never touched.
 *
 * DRY-RUN BY DEFAULT; --commit writes. Re-running is a no-op.
 *
 * Run from platform/ on the box:
 *   node --require ./node_modules/tsx/dist/preflight.cjs \
 *        --import file://$PWD/node_modules/tsx/dist/loader.mjs \
 *        scripts/import-calendar-fleet.ts [--commit]
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePlate } from "@/platform/integrations/rta/plate";
import { createTwentyClient } from "@/platform/integrations/twenty/client";
import { resolveTwentyInstance } from "@/platform/integrations/twenty/instance";

const COMMIT = process.argv.includes("--commit");
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SHEET_ID = "1WI-9mS-HtJkUZArOlLAvDevvyfRRXKzAm8tJBJJFKfw";
const ADC_PATH = join(ROOT, "scripts/.google-adc.json");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const STATUS_MAP: Record<string, string> = {
  rented: "ON_RENT",
  available: "AVAILABLE",
  booked: "RESERVED",
  service: "IN_SERVICE",
  employee: "IN_SERVICE",
};

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
  if (!res.ok) throw new Error(`token mint failed: ${res.status}`);
  return (await res.json()).access_token;
}

async function sheetValues(token: string, range: string): Promise<string[][]> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) },
  );
  if (!res.ok) throw new Error(`sheets get HTTP ${res.status}`);
  return ((await res.json()) as { values?: string[][] }).values ?? [];
}

const cell = (r: string[], i: number) => (r[i] ?? "").trim();

async function main() {
  console.log(`[import-calendar-fleet] mode=${COMMIT ? "COMMIT" : "DRY-RUN"}`);
  const token = await accessToken();
  const rows = await sheetValues(token, "Calendar!A1:E300");
  console.log(`sheet rows: ${rows.length}`);

  const cfg = resolveTwentyInstance("rental");
  if (!cfg.configured) throw new Error("TWENTY_RENTAL_API_KEY not configured");
  const client = createTwentyClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, mode: "live" });

  // Existing fleet keyed by plate
  const byPlateKey = new Map<string, { id: string; status: string | null }>();
  for await (const v of client.listAll<Record<string, unknown>>("vehicles", { limit: 200 })) {
    const name = String(v.name ?? "");
    const decoded = decodePlate(name.split(/\s+/)[0] ?? "") ?? decodePlate(String(v.plate ?? ""));
    if (decoded) {
      byPlateKey.set(`${decoded.query.plateNo}|${decoded.query.plateCode}`, {
        id: String(v.id),
        status: (v.status as string | null) ?? null,
      });
    }
  }
  console.log(`twenty vehicles with parseable plates: ${byPlateKey.size}`);

  let created = 0, statusPatched = 0, skippedExisting = 0, badRows = 0, failed = 0;
  for (const r of rows.slice(2)) {
    const car = cell(r, 0);
    const plateRaw = cell(r, 3).replace(/\s+/g, " ").trim();
    if (!car || !plateRaw) continue;
    const decoded = decodePlate(plateRaw);
    if (!decoded) { badRows++; continue; }
    const { plateNo, plateCode } = decoded.query;
    const plateKey = `${plateNo}|${plateCode}`;
    const plateNorm = `${plateCode}${plateNo}`;
    const sheetStatus = STATUS_MAP[cell(r, 4).toLowerCase()] ?? null;
    const modelColor = cell(r, 1);
    const yearMatch = modelColor.match(/\b(19|20)\d{2}\b/);

    const existing = byPlateKey.get(plateKey);
    try {
      if (existing) {
        skippedExisting++;
        if (!existing.status && sheetStatus) {
          if (COMMIT) {
            await client.patch(`vehicles/${existing.id}`, { status: sheetStatus });
            await sleep(100);
          }
          statusPatched++;
        }
        continue;
      }
      if (COMMIT) {
        await client.post("vehicles", {
          name: `${plateNorm} ${car}`,
          plate: plateNorm,
          model: car,
          ...(yearMatch ? { year: Number(yearMatch[0]) } : {}),
          ...(sheetStatus ? { status: sheetStatus } : {}),
          externalId: `cal3:${plateKey}`,
        });
        await sleep(120);
      }
      created++;
    } catch (e) {
      failed++;
      console.error(`  FAIL ${plateRaw} (${car}): ${(e as Error).message.slice(0, 160)}`);
    }
  }
  console.log(
    `done: ${created} created, ${statusPatched} statuses patched on existing, ` +
      `${skippedExisting} already in Twenty, ${badRows} unparseable rows, ${failed} failed`,
  );
}

main().catch((e) => { console.error(e); process.exit(1); });

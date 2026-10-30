/**
 * TARS (tars.rta.ae) sync into the CRM — fleet + rental contracts.
 *
 * Usage:
 *   npx tsx scripts/tars-sync.ts                 # DRY RUN (default) — live fetch, no writes
 *   npx tsx scripts/tars-sync.ts --commit        # live fetch + write to the DB
 *   npx tsx scripts/tars-sync.ts --from-samples  # offline: map the probed sample
 *                                                # payloads instead of the network
 *                                                # (paths overridable below)
 *
 * Data source:
 *   --from-samples  reads the verified probe captures (default
 *                   /tmp/probe-api_agencies_did_rta_51646245_vehicles.json and
 *                   /tmp/probe-rentals.json; override with --vehicles-file= and
 *                   --rentals-file=). Otherwise it logs into TARS via the saved
 *                   session (.tars-session.json, TARS_SESSION_FILE) or a fresh
 *                   Playwright SSO login — when the OTP arrives, WRITE THE CODE
 *                   to /tmp/tars-otp.txt (TARS_OTP_FILE) and the run continues.
 *
 * Database:
 *   Dry-run works WITHOUT DATABASE_URL (offline plan: every row is reported
 *   as "would upsert", insert/update unknown). With a reachable DB the plan
 *   diffs against the tenant (FLEET_HOME_SLUG, default "rma"). All tenant
 *   access goes through withDrizzleTenant (AGENTS.md rule 1).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { TarsClient, TarsSessionExpiredError, type TarsRental, type TarsVehicle } from "../src/platform/integrations/tars/client";
import { ensureSession } from "../src/platform/integrations/tars/session";
import { buildPlan, loadExisting, applyPlan, type SyncPlan, type ExistingState } from "../src/platform/integrations/tars/sync";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const FROM_SAMPLES = args.includes("--from-samples");
const opt = (name: string): string | undefined =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const TENANT_SLUG = process.env.FLEET_HOME_SLUG?.trim() || "rma";
const ORG_DID = process.env.TARS_ORG_DID?.trim() || "did:rta:51646245";
const BASE_URL = process.env.TARS_BASE_URL?.trim() || "https://tars.rta.ae";

const VEHICLES_FILE = opt("vehicles-file") ?? "/tmp/probe-api_agencies_did_rta_51646245_vehicles.json";
const RENTALS_FILE = opt("rentals-file") ?? "/tmp/probe-rentals.json";

interface ListPayload<T> {
  meta?: { hits: number };
  data?: T[];
}

function loadSamples(): { vehicles: TarsVehicle[]; rentals: TarsRental[] } {
  const v = JSON.parse(readFileSync(VEHICLES_FILE, "utf8")) as ListPayload<TarsVehicle>;
  const r = JSON.parse(readFileSync(RENTALS_FILE, "utf8")) as ListPayload<TarsRental>;
  console.log(
    `[tars-sync] samples: ${v.data?.length ?? 0} vehicles (hits ${v.meta?.hits ?? "?"}) · ` +
      `${r.data?.length ?? 0} rentals (hits ${r.meta?.hits ?? "?"})`,
  );
  return { vehicles: v.data ?? [], rentals: r.data ?? [] };
}

async function fetchLive(): Promise<{ vehicles: TarsVehicle[]; rentals: TarsRental[] }> {
  const fetchAll = async () => {
    const session = await ensureSession();
    const client = new TarsClient({ orgDid: ORG_DID, cookieHeader: session.cookieHeader, baseUrl: BASE_URL });
    const agency = await client.getAgency();
    console.log(`[tars-sync] agency: ${agency.name?.en ?? ORG_DID}`);
    const vehicles = await client.listVehicles();
    const rentals = await client.listRentals({ size: 500 });
    return { vehicles, rentals };
  };
  try {
    return await fetchAll();
  } catch (e) {
    if (!(e instanceof TarsSessionExpiredError)) throw e;
    // Saved jar went stale mid-run — drop it and re-login once.
    console.log("[tars-sync] session rejected by TARS — re-logging in…");
    const { clearSession } = await import("../src/platform/integrations/tars/session");
    clearSession();
    return fetchAll();
  }
}

function printPlan(plan: SyncPlan, offline: boolean): void {
  const tally = (items: { action: string }[]) =>
    items.reduce<Record<string, number>>((a, i) => ((a[i.action] = (a[i.action] ?? 0) + 1), a), {});
  console.log(`\n─── TARS sync plan (${offline ? "OFFLINE — no DB diff" : COMMIT ? "COMMIT" : "dry-run"}) ───`);
  console.log(`  vehicles: ${plan.vehicles.length} ${JSON.stringify(tally(plan.vehicles))}`);
  for (const v of plan.vehicles) {
    console.log(
      `    [${v.action}] ${v.mapped.plate} · ${v.mapped.make} ${v.mapped.model} ${v.mapped.year ?? ""}` +
        ` · ${v.mapped.status ?? "?"} · vin ${v.mapped.vin}` +
        (v.mapped.registrationExpiry ? ` · reg exp ${v.mapped.registrationExpiry}` : "") +
        (v.matchedBy ? ` · matched by ${v.matchedBy}` : ""),
    );
  }
  console.log(`  customers: ${plan.customers.length} ${JSON.stringify(tally(plan.customers))}`);
  for (const c of plan.customers) {
    console.log(
      `    [${c.action}] ${c.mapped.name} · ${c.mapped.phone ?? "no phone"}` +
        ` · eid ${c.mapped.emiratesId ?? "?"}` + (c.matchedBy ? ` · matched by ${c.matchedBy}` : ""),
    );
  }
  console.log(`  rentals: ${plan.rentals.length} ${JSON.stringify(tally(plan.rentals))}`);
  for (const r of plan.rentals) {
    console.log(
      `    [${r.action}] ${r.mapped.documentNumber} · ${r.mapped.status ?? "?"} · ${r.mapped.customer.name}` +
        ` · vin ${r.mapped.vehicleVin} · ${r.mapped.startDate.toISOString().slice(0, 10)} → ${r.mapped.returnDate.toISOString().slice(0, 10)} (${r.mapped.totalDays}d)`,
    );
  }
  if (plan.skipped.length) {
    console.log(`  skipped (${plan.skipped.length}):`);
    for (const s of plan.skipped) console.log(`    - ${s}`);
  }
}

async function main() {
  console.log(`[tars-sync] tenant slug "${TENANT_SLUG}" · org ${ORG_DID} · ${COMMIT ? "COMMIT" : "dry-run"}`);

  const { vehicles, rentals } = FROM_SAMPLES ? loadSamples() : await fetchLive();

  // Tenant + existing state — optional in dry-run (the box DB is not always
  // reachable from a workstation); REQUIRED for --commit.
  let tenantId: string | null = null;
  let existing: ExistingState | null = null;
  const hasDb = Boolean(process.env.DATABASE_URL);
  if (hasDb) {
    try {
      const { db, pool } = await import("../src/platform/db/client");
      const { tenant } = await import("../src/platform/db/schema");
      const { eq } = await import("drizzle-orm");
      const t = await db
        .select({ id: tenant.id })
        .from(tenant)
        .where(eq(tenant.slug, TENANT_SLUG))
        .limit(1)
        .then((r) => r[0] ?? null);
      if (!t) throw new Error(`tenant "${TENANT_SLUG}" not found`);
      tenantId = t.id;
      existing = await loadExisting(tenantId);
      console.log(
        `[tars-sync] tenant ${tenantId} · existing: ${existing.vehicles.length} vehicles, ` +
          `${existing.customers.length} customers, ${existing.rentals.length} TARS rentals`,
      );
      await pool.end();
    } catch (e) {
      if (COMMIT) throw e;
      console.log(
        `[tars-sync] DB unavailable (${e instanceof Error ? e.message : e}) — continuing OFFLINE.`,
      );
    }
  } else if (COMMIT) {
    throw new Error("--commit requires DATABASE_URL");
  } else {
    console.log("[tars-sync] DATABASE_URL not set — OFFLINE dry-run (no insert/update diff).");
  }

  const plan = buildPlan(vehicles, rentals, existing);
  printPlan(plan, existing === null);

  if (COMMIT && tenantId) {
    const counts = await applyPlan(tenantId, plan);
    console.log(
      `\n─── applied ───\n` +
        `  vehicles: +${counts.vehiclesInserted} / ~${counts.vehiclesUpdated}\n` +
        `  customers: +${counts.customersInserted} / ~${counts.customersUpdated}\n` +
        `  rentals:   +${counts.rentalsInserted} / ~${counts.rentalsUpdated}\n` +
        (counts.skipped.length ? `  skipped:   ${counts.skipped.length}\n` : ""),
    );
  } else {
    console.log(`\n[tars-sync] dry-run — nothing written. Re-run with --commit to apply.`);
  }
}

main().catch((e) => {
  if (e instanceof TarsSessionExpiredError) {
    console.error(`[tars-sync] TARS session expired and re-login failed: ${e.message}`);
  } else {
    console.error(`[tars-sync] failed: ${e instanceof Error ? e.message : e}`);
  }
  process.exit(1);
});

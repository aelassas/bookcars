/**
 * READ-ONLY TARS export → JSON files on disk.
 *
 * Side effects:
 *   • GETs tars.rta.ae/api endpoints via the existing client (no writes).
 *   • Logs in via Playwright when the saved jar is stale — triggers an OTP
 *     email to the registered address; the OTP must be delivered to
 *     /tmp/tars-otp.txt by a separate process (the mailbox poller).
 *   • Writes /tmp/tars-agency.json, /tmp/tars-vehicles.json,
 *     /tmp/tars-rentals.json.
 *
 * The CRM database is NEVER touched; this script exists so we can see
 * everything TARS has before deciding what to sync.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "node:fs";
import { TarsClient, TarsSessionExpiredError } from "../src/platform/integrations/tars/client";
import { ensureSession } from "../src/platform/integrations/tars/session";

const ORG_DID = process.env.TARS_ORG_DID?.trim() || "did:rta:51646245";
const BASE_URL = process.env.TARS_BASE_URL?.trim() || "https://tars.rta.ae";
const OUT_DIR = process.env.TARS_OUT_DIR?.trim() || "/tmp";

async function fetchAll() {
  const session = await ensureSession();
  const client = new TarsClient({ orgDid: ORG_DID, cookieHeader: session.cookieHeader, baseUrl: BASE_URL });
  const agency = await client.getAgency();
  console.log(`[tars-fetch] agency: ${agency.name?.en ?? ORG_DID}`);
  console.log(`[tars-fetch] fetching fleet…`);
  const vehicles = await client.listVehicles();
  console.log(`[tars-fetch]   got ${vehicles.length} vehicles`);
  console.log(`[tars-fetch] fetching rentals (all history)…`);
  const rentals = await client.listRentals({ size: 500 });
  console.log(`[tars-fetch]   got ${rentals.length} rentals`);
  return { agency, vehicles, rentals };
}

async function main() {
  console.log(`[tars-fetch] org ${ORG_DID} · READ-ONLY`);
  let result;
  try {
    result = await fetchAll();
  } catch (e) {
    if (!(e instanceof TarsSessionExpiredError)) throw e;
    console.log("[tars-fetch] session rejected — re-logging in…");
    const { clearSession } = await import("../src/platform/integrations/tars/session");
    clearSession();
    result = await fetchAll();
  }

  const agencyPath = `${OUT_DIR}/tars-agency.json`;
  const vehiclesPath = `${OUT_DIR}/tars-vehicles.json`;
  const rentalsPath = `${OUT_DIR}/tars-rentals.json`;

  writeFileSync(agencyPath, JSON.stringify(result.agency, null, 2));
  writeFileSync(vehiclesPath, JSON.stringify({ meta: { count: result.vehicles.length }, data: result.vehicles }, null, 2));
  writeFileSync(rentalsPath, JSON.stringify({ meta: { count: result.rentals.length }, data: result.rentals }, null, 2));

  console.log(`\n[tars-fetch] wrote:`);
  console.log(`  ${agencyPath}`);
  console.log(`  ${vehiclesPath}`);
  console.log(`  ${rentalsPath}`);
  console.log(`\n[tars-fetch] summary:`);
  console.log(`  vehicles: ${result.vehicles.length}`);
  console.log(`  rentals:  ${result.rentals.length}`);
}

main().catch((e) => {
  console.error(`[tars-fetch] FAILED: ${e instanceof Error ? e.stack : String(e)}`);
  process.exit(1);
});

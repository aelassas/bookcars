/**
 * Kaiten sync into the box — pulls the "takeauto" space board cards → vehicle.
 * Read-only against Kaiten (SOURCE_READ_ONLY): we pull, never write back.
 * Mirrors the syncKaitenNow server action but takes the key from env.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { syncKaitenBoard } from "@/platform/integrations/kaiten/sync";

const TENANT_SLUG = "take-auto";
const KEY = process.env.KAITEN_API_KEY;

async function main() {
  if (!KEY) {
    console.error("KAITEN_API_KEY is not set in .env.local");
    process.exit(1);
  }
  const tenantRow = await db
    .select()
    .from(tenant)
    .where(eq(tenant.slug, TENANT_SLUG))
    .limit(1)
    .then((r) => r[0] ?? null);
  if (!tenantRow) {
    console.error(`Tenant "${TENANT_SLUG}" not found.`);
    process.exit(1);
  }

  console.log("Kaiten sync into TAKE Auto…\n");
  const result = await syncKaitenBoard(db, tenantRow.id, KEY);

  console.log("\n─── Kaiten sync complete ───");
  console.log(`  Vehicles synced:  ${result.vehiclesSynced}`);
  console.log(`  Vehicles skipped: ${result.vehiclesSkipped}`);
  console.log(`  Docs skipped:     ${result.docsSkipped}`);
  if (result.errors.length > 0) {
    console.log(`\n  Errors (${result.errors.length}):`);
    result.errors.slice(0, 10).forEach((e) => console.log(`    - ${e}`));
  }
}

main()
  .then(async () => { await pool.end(); process.exit(0); })
  .catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });

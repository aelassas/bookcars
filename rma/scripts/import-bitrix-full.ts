/**
 * FULL Bitrix24 import into the box (no record cap) — for later analysis.
 * Read-only against Bitrix (SOURCE_READ_ONLY): we pull, never write back.
 * Mirrors import-bitrix-demo.ts but drops maxRecordsPerEntity → full pagination.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { syncBitrix24 } from "@/platform/integrations/bitrix24/sync";

const WEBHOOK_URL = process.env.BITRIX24_WEBHOOK_URL;
const TENANT_SLUG = "take-auto";

async function main() {
  if (!WEBHOOK_URL) {
    console.error("BITRIX24_WEBHOOK_URL is not set in .env.local");
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

  console.log("FULL Bitrix24 import into TAKE Auto (no record cap)…\n");
  const result = await syncBitrix24(db, tenantRow.id, WEBHOOK_URL, {
    syncContacts: true,
    syncLeads: true,
    syncDeals: true,
    syncCompanies: true,
    // no maxRecordsPerEntity → pull everything
  });

  console.log("\n─── FULL import complete ───");
  console.log(`  Users synced:      ${result.usersSynced}`);
  console.log(`  Contacts synced:   ${result.contactsSynced}`);
  console.log(`  Leads synced:      ${result.leadsSynced}`);
  console.log(`  Deals synced:      ${result.dealsSynced}`);
  console.log(`  Companies synced:  ${result.companiesSynced}`);
  if (result.errors.length > 0) {
    console.log(`\n  Errors (${result.errors.length}):`);
    result.errors.slice(0, 10).forEach((e) => console.log(`    - ${e}`));
  }
}

main()
  .then(async () => { await pool.end(); process.exit(0); })
  .catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });

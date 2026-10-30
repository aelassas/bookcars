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

  const tenantRow = await db.select().from(tenant).where(eq(tenant.slug, TENANT_SLUG)).limit(1).then((r) => r[0] ?? null);
  if (!tenantRow) {
    console.error(`Tenant "${TENANT_SLUG}" not found. Run setup-takeauto-tenant.ts first.`);
    process.exit(1);
  }

  console.log("Importing Bitrix demo subset into TAKE Auto platform…\n");

  const result = await syncBitrix24(db, tenantRow.id, WEBHOOK_URL, {
    syncContacts: true,
    syncLeads: true,
    syncDeals: true,
    syncCompanies: true,
    maxRecordsPerEntity: 500,
  });

  console.log("\n─── Import complete ───");
  console.log(`  Users synced:      ${result.usersSynced}`);
  console.log(`  Contacts synced:   ${result.contactsSynced}`);
  console.log(`  Leads synced:      ${result.leadsSynced}`);
  console.log(`  Deals synced:      ${result.dealsSynced}`);
  console.log(`  Companies synced:  ${result.companiesSynced}`);
  if (result.errors.length > 0) {
    console.log(`\n  Errors (${result.errors.length}):`);
    result.errors.slice(0, 10).forEach((e) => console.log(`    - ${e}`));
  }
  console.log("");

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { config } from "dotenv";
config({ path: ".env.local" });

import { pool } from "@/platform/db/client";
import { notifyServiceDue } from "@/modules/notify/service-due";

async function main() {
  const slug = process.env.NOTIFY_TENANT_SLUG || "rma";
  const result = await pool.query<{ id: string }>("SELECT id FROM tenant WHERE slug=$1", [slug]);
  const tenantId = result.rows[0]?.id;
  if (!tenantId) throw new Error(`Tenant not found: ${slug}`);
  const summary = await notifyServiceDue(tenantId, { dryRun: process.env.NOTIFY_LIVE !== "true" });
  console.log(`[service-reminders] ${JSON.stringify(summary)}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

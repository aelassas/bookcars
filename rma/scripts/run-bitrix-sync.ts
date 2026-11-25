import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { syncBitrix24, type BitrixSyncOptions } from "@/platform/integrations/bitrix24/sync";

const WEBHOOK = process.env.BITRIX24_WEBHOOK_URL;
const cap = process.env.BITRIX_CAP ? Number(process.env.BITRIX_CAP) : undefined;

async function main() {
  if (!WEBHOOK) { console.error("BITRIX24_WEBHOOK_URL not set"); process.exit(1); }
  const t = await db.select().from(tenant).where(eq(tenant.slug, "take-auto")).limit(1).then((r) => r[0] ?? null);
  if (!t) { console.error("tenant not found"); process.exit(1); }
  console.log("[bitrix] sync start cap=" + (cap ?? "none"));
  const dealsOnly = process.env.BITRIX_DEALS_ONLY === "true";
  const opts: BitrixSyncOptions = { syncContacts: !dealsOnly, syncLeads: !dealsOnly, syncDeals: true, syncCompanies: !dealsOnly };
  if (cap) opts.maxRecordsPerEntity = cap;
  const result = await syncBitrix24(db, t.id, WEBHOOK, opts);
  console.log("[bitrix] done " + JSON.stringify(result));
}
main().then(async () => { await pool.end(); process.exit(0); }).catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });

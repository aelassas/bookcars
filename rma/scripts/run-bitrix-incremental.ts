import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { syncBitrix24 } from "@/platform/integrations/bitrix24/sync";
import { readFileSync, writeFileSync } from "fs";
const WEBHOOK = process.env.BITRIX24_WEBHOOK_URL;
const MARKER = "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/platform/.bitrix-incr-marker";
function fmt(d: Date) { return d.toISOString(); }
async function main() {
  if (!WEBHOOK) { console.error("no webhook"); process.exit(1); }
  const t = await db.select().from(tenant).where(eq(tenant.slug, "take-auto")).limit(1).then((r) => r[0] ?? null);
  if (!t) { console.error("no tenant"); process.exit(1); }
  let since: string;
  try { since = readFileSync(MARKER, "utf8").trim(); } catch { since = fmt(new Date(Date.now() - 6 * 3600 * 1000)); }
  const runAt = new Date();
  console.log("[bitrix-incr] modifiedSince=" + since);
  const result = await syncBitrix24(db, t.id, WEBHOOK, { syncContacts: true, syncLeads: true, syncDeals: true, syncCompanies: true, modifiedSince: since });
  console.log("[bitrix-incr] " + JSON.stringify(result));
  writeFileSync(MARKER, fmt(new Date(runAt.getTime() - 2 * 3600 * 1000)));
}
main().then(async () => { await pool.end(); process.exit(0); }).catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });

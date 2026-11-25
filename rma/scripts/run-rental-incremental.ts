import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { syncBitrix24 } from "@/platform/integrations/bitrix24/sync";

// Incremental pull for the rental Bitrix portals into their brand tenants.
//
// Required env (Bitrix incoming-webhook URLs, kept out of the repo):
//   BITRIX_CARDIWAN_WEBHOOK — e.g. https://cardiwan.bitrix24.ru/rest/<user>/<token>/
//   BITRIX_EASYRENT_WEBHOOK — e.g. https://easyrent.bitrix24.ru/rest/<user>/<token>/
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name} (Bitrix webhook URL)`);
  return v;
}

const PORTALS = [
  { slug: "cardiwan", webhook: requireEnv("BITRIX_CARDIWAN_WEBHOOK") },
  { slug: "easyrent", webhook: requireEnv("BITRIX_EASYRENT_WEBHOOK") },
];

async function main() {
  const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  for (const p of PORTALS) {
    const [t] = await db.select().from(tenant).where(eq(tenant.slug, p.slug)).limit(1);
    if (!t) { console.error("no tenant:", p.slug); continue; }
    try {
      const r = await syncBitrix24(db, t.id, p.webhook, {
        syncContacts: true, syncLeads: true, syncDeals: true, syncCompanies: false,
        modifiedSince: since,
      });
      console.log(`[rental-incr ${p.slug}] since=${since}`, JSON.stringify(r));
    } catch (e) {
      console.error(`[rental-incr ${p.slug}] FAILED:`, (e as Error).message);
    }
  }
  process.exit(0);
}
main();

import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { syncBitrix24 } from "@/platform/integrations/bitrix24/sync";

// Each rental portal -> its own brand tenant. Separate tenants => the
// (tenant, external_source, external_id) key never collides across portals.
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

const ONLY = process.env.ONLY;
const MAX = process.env.MAX ? parseInt(process.env.MAX, 10) : undefined;

async function main() {
  for (const p of PORTALS) {
    if (ONLY && p.slug !== ONLY) continue;
    const [t] = await db.select().from(tenant).where(eq(tenant.slug, p.slug)).limit(1);
    if (!t) { console.error("no tenant:", p.slug); continue; }
    console.log(`=== importing ${p.slug} (max=${MAX ?? "all"}) ===`);
    try {
      const r = await syncBitrix24(db, t.id, p.webhook, {
        syncContacts: true, syncLeads: true, syncDeals: true, syncCompanies: true,
        maxRecordsPerEntity: MAX,
      });
      console.log(p.slug, "->", JSON.stringify(r));
    } catch (e) {
      console.error(p.slug, "FAILED:", (e as Error).message);
    }
  }
  process.exit(0);
}
main();

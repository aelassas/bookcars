import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { syncBitrix24 } from "@/platform/integrations/bitrix24/sync";

/**
 * One-off: pull each rent brand's OWN Bitrix portal for 2026 only, with
 * contact linkage, so the platform mirror carries this year's live leads
 * (the shared incremental sync only touches take-auto). Notifications are
 * suppressed — this is a historical back-fill, not fresh arrivals.
 *
 * Webhooks come from the environment (never committed):
 *   CW_HOOK=https://cardiwan.bitrix24.ru/rest/.../  \
 *   ER_HOOK=https://easyrent.bitrix24.ru/rest/.../  \
 *   npx tsx scripts/reimport-2026.ts
 */
const SINCE = process.env.REIMPORT_SINCE || "2026-01-01T00:00:00";

const JOBS = [
  { slug: "cardiwan", hook: process.env.CW_HOOK },
  { slug: "easyrent", hook: process.env.ER_HOOK },
].filter((j): j is { slug: string; hook: string } => Boolean(j.hook));

async function main() {
  if (JOBS.length === 0) {
    console.error("No portal webhooks in env (CW_HOOK / ER_HOOK). Nothing to do.");
    process.exit(1);
  }
  for (const j of JOBS) {
    const t = await db.select().from(tenant).where(eq(tenant.slug, j.slug)).limit(1).then((r) => r[0] ?? null);
    if (!t) {
      console.error(`[reimport ${j.slug}] no such tenant — skipping`);
      continue;
    }
    console.log(`[reimport ${j.slug}] modifiedSince=${SINCE}`);
    const result = await syncBitrix24(db, t.id, j.hook, {
      syncContacts: true,
      syncLeads: true,
      syncDeals: true,
      syncCompanies: true,
      modifiedSince: SINCE,
      suppressNotify: true,
    });
    console.log(`[reimport ${j.slug}] ` + JSON.stringify(result));
  }
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });

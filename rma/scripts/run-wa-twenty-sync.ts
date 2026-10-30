import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { syncWaMessagesToTwenty } from "@/platform/integrations/twenty/push-message";

/**
 * WhatsApp → Twenty projection runner (heartbeat, 5-min). Business tenants
 * only — the platform's own messages live per tenant. Each tenant is projected
 * into ITS OWN Twenty deployment (sales :3001 / rental :3002); the routing is
 * resolved inside push-message.ts from the tenant slug.
 *
 *   npx tsx scripts/run-wa-twenty-sync.ts                      (all, in order)
 *   npx tsx scripts/run-wa-twenty-sync.ts cardiwan easyrent    (just these)
 *
 * The argument form matters operationally: the tenants run SEQUENTIALLY and a
 * tenant with a large backlog holds the line for minutes, so the rental brands
 * used to sit behind take-auto on every single pass. Being able to run one
 * brand on its own is what lets a lagging desk be caught up on demand.
 */
const DEFAULT_SLUGS = ["take-auto", "cardiwan", "easyrent"];

async function main() {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const slugs = requested.length > 0 ? requested : DEFAULT_SLUGS;
  for (const slug of slugs) {
    const [t] = await db.select({ id: tenant.id }).from(tenant).where(eq(tenant.slug, slug)).limit(1);
    if (!t) {
      console.warn(`[wa→twenty] ${slug}: no such tenant — skipped`);
      continue;
    }
    try {
      const r = await syncWaMessagesToTwenty(db, t.id, { maxMessages: 200 });
      if (r.messagesProjected > 0 || r.failed > 0 || r.noPerson > 0) {
        console.log(`[wa→twenty] ${slug}: lines=${r.messagesProjected} notes=+${r.notesCreated}/~${r.notesAppended} media=${r.mediaAttached} onDeal=${r.linkedToDeal} noDeal=${r.noDeal} noPerson=${r.noPerson} failed=${r.failed}${r.firstError ? " first=" + r.firstError.slice(0, 120) : ""}`);
      }
    } catch (e) {
      // A Twenty outage must never break the heartbeat — log and move on.
      console.error(`[wa→twenty] ${slug} failed:`, (e as Error).message);
    }
  }
}
main().then(async () => { await pool.end(); process.exit(0); })
      .catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });

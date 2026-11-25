import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { syncKaitenBoard } from "@/platform/integrations/kaiten/sync";

const TENANT_SLUG = "take-auto";
const KEYS = [process.env.KAITEN_API_KEY, process.env.KAITEN_API_KEY_2].filter(Boolean) as string[];

async function main() {
  const t = await db.select().from(tenant).where(eq(tenant.slug, TENANT_SLUG)).limit(1).then((r) => r[0] ?? null);
  if (!t) { console.error("tenant not found"); process.exit(1); }
  let lastErr: unknown;
  for (let i = 0; i < KEYS.length; i++) {
    const key = KEYS[i];
    const tag = "key#" + (i + 1) + " (..." + key.slice(-6) + ")";
    try {
      console.log("[kaiten] trying " + tag);
      const result = await syncKaitenBoard(db, t.id, key);
      if (result.errors && result.errors.length && result.vehiclesSynced === 0) {
        console.warn("[kaiten] " + tag + " returned errors, failing over:", result.errors.slice(0, 2));
        lastErr = result.errors; continue;
      }
      console.log("[kaiten] OK via " + tag + " synced=" + result.vehiclesSynced + " skipped=" + result.vehiclesSkipped + " docs=" + result.docsSkipped);
      return;
    } catch (e) {
      console.warn("[kaiten] " + tag + " threw, failing over:", (e as Error).message);
      lastErr = e;
    }
  }
  console.error("[kaiten] ALL keys failed:", lastErr);
  process.exit(1);
}
main().then(async () => { await pool.end(); process.exit(0); }).catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });

/**
 * Register Bitrix24 + Kaiten as saved integration_connection rows so the
 * Settings → Integrations cards show "Connected" with counts (instead of a
 * one-off import). Mirrors connectBitrix24 / connectKaiten server actions.
 * Creds come from env (already in .env.local). Read-only sync unchanged.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db, pool } from "@/platform/db/client";
import { tenant, integrationConnection } from "@/platform/db/schema";
import { eq } from "drizzle-orm";

const TENANT_SLUG = "take-auto";

async function upsert(tenantId: string, provider: string, cfg: Record<string, string>) {
  await db
    .insert(integrationConnection)
    .values({ tenantId, provider, config: cfg, status: "active", lastSyncAt: new Date() })
    .onConflictDoUpdate({
      target: [integrationConnection.tenantId, integrationConnection.provider],
      set: { config: cfg, status: "active", lastSyncAt: new Date(), updatedAt: new Date() },
    });
  console.log(`  ✓ ${provider} connection saved (status=active)`);
}

async function main() {
  const webhookUrl = process.env.BITRIX24_WEBHOOK_URL;
  const kaitenKey = process.env.KAITEN_API_KEY;
  const [t] = await db.select().from(tenant).where(eq(tenant.slug, TENANT_SLUG)).limit(1);
  if (!t) { console.error("tenant not found"); process.exit(1); }

  if (webhookUrl) await upsert(t.id, "bitrix24", { webhookUrl });
  else console.log("  ⚠ BITRIX24_WEBHOOK_URL not set — skipping bitrix24");
  if (kaitenKey) await upsert(t.id, "kaiten", { apiKey: kaitenKey });
  else console.log("  ⚠ KAITEN_API_KEY not set — skipping kaiten");

  await db.update(tenant).set({ migrationStatus: "connected" }).where(eq(tenant.id, t.id));
  console.log("  ✓ tenant migrationStatus = connected");
}

main()
  .then(async () => { await pool.end(); process.exit(0); })
  .catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });

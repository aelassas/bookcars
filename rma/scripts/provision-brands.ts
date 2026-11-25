/**
 * Provision the 4 TAKE Auto brand tenants (Cardiwan, Easy Rent, ETM, TAKE Auto) and make
 * the owner (Muhaturkmen) a tenant_admin of each, so they can log into all four.
 * Mirrors provisionTenant() (tenant + AI config); idempotent. take-auto already exists.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "@/platform/db/client";
import { tenant, tenantMember, aiProviderConfig } from "@/platform/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

const CLIENT_USER_ID = "4c55ec86-0270-4a18-9311-886885234e0b"; // Muhaturkmen@gmail.com
const ADMIN_ID = "83d63f65-4db3-4d56-9771-a0d44fc3e9fd"; // platform admin (createdBy)
const tok = () => randomBytes(32).toString("hex");

const NEW = [
  { slug: "cardiwan", name: "Cardiwan" },
  { slug: "easyrent", name: "Easy Rent" },
  { slug: "etm", name: "ETM" },
];
const ALL = ["cardiwan", "easyrent", "etm", "take-auto"];

async function main() {
  for (const b of NEW) {
    const [exists] = await db.select({ id: tenant.id }).from(tenant).where(eq(tenant.slug, b.slug)).limit(1);
    if (exists) { console.log(`  ${b.slug}: already exists`); continue; }
    await db.transaction(async (tx) => {
      const inserted = await tx.insert(tenant).values({
        slug: b.slug, name: b.name, status: "active", tier: "enterprise",
        createdBy: ADMIN_ID, callgearWebhookToken: tok(), whatsappWebhookToken: tok(),
      }).returning();
      const t = Array.isArray(inserted) ? inserted[0] : inserted;
      await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${t.id}'`));
      await tx.insert(aiProviderConfig).values({
        tenantId: t.id, provider: "local",
        localEndpoint: "http://localhost:11434/api/chat", localModel: "qwen3.5:9b-mlx",
      });
    });
    console.log(`  ${b.slug}: ✅ created (Enterprise, all modules)`);
  }

  for (const slug of ALL) {
    const [t] = await db.select({ id: tenant.id }).from(tenant).where(eq(tenant.slug, slug)).limit(1);
    if (!t) { console.log(`  ${slug}: tenant missing — skip`); continue; }
    const [m] = await db.select({ id: tenantMember.id }).from(tenantMember)
      .where(and(eq(tenantMember.tenantId, t.id), eq(tenantMember.userId, CLIENT_USER_ID))).limit(1);
    if (m) { console.log(`  ${slug}: owner already admin`); continue; }
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${t.id}'`));
      await tx.insert(tenantMember).values({ tenantId: t.id, userId: CLIENT_USER_ID, roles: ["tenant_admin"] });
    });
    console.log(`  ${slug}: ✅ owner added as tenant_admin`);
  }
  console.log("\n  Done. Login as Muhaturkmen@gmail.com → access /cardiwan /easyrent /etm /take-auto");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

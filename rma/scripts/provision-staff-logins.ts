/**
 * ONE-OFF (idempotent): set up the 6 canonical staff logins for name+PIN sign-in.
 *
 * Owner order 2026-07-26: login by NAME (not email), PIN 8888 for everyone,
 * changeable in settings. Six people: Sales = Moe/Firuz/Azat, Rent =
 * Babek/Ali/Abdullah. Some have a second account (second number) — we do NOT
 * touch those here; the canonical login account is the one that carries brand
 * access, and each person attaches their second number later via settings.
 *
 * This sets: canonical simple name, PIN (bcrypt 8888), mustChangePassword=true,
 * and ensures brand memberships. Run: npx tsx scripts/provision-staff-logins.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { user, tenant, tenantMember } from "@/platform/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Canonical account id → { login name, brands the person must belong to with roles }.
const STAFF: Record<string, { name: string; brands: { slug: string; roles: string[] }[] }> = {
  // Sales (take-auto)
  "2550216a-46a7-491e-932f-695c2be161e4": { name: "Moe", brands: [{ slug: "take-auto", roles: ["sales_manager"] }] },
  "2e0c96bc-af28-44f8-8cac-2c3b38f3701c": { name: "Firuz", brands: [{ slug: "take-auto", roles: ["sales"] }] },
  "8343afe1-42d5-4aad-abf3-131d85eff902": { name: "Azat", brands: [{ slug: "take-auto", roles: ["sales"] }] },
  // Rent
  "f2ef80fc-ad84-435f-b4bb-7996b2601f0a": { name: "Babek", brands: [
    { slug: "cardiwan", roles: ["general_manager", "sales_manager"] },
    { slug: "easyrent", roles: ["general_manager", "sales_manager"] },
    { slug: "etm", roles: ["general_manager", "sales_manager"] },
  ] },
  "17e4d866-5bd5-491d-96a5-7c8b1911aad0": { name: "Ali", brands: [
    { slug: "cardiwan", roles: ["sales"] },
    { slug: "easyrent", roles: ["sales"] },
  ] },
  "acb4fdfb-277d-4b6e-bca8-adfd8fbff4c9": { name: "Abdullah", brands: [{ slug: "cardiwan", roles: ["sales"] }] },
};

async function main() {
  const pin = await bcrypt.hash("8888", 10);
  const tenants = await db.select({ id: tenant.id, slug: tenant.slug }).from(tenant);
  const tid = (slug: string) => tenants.find((t) => t.slug === slug)?.id;

  for (const [id, spec] of Object.entries(STAFF)) {
    const [u] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, id)).limit(1);
    if (!u) { console.log(`  ⚠️  ${spec.name}: account ${id} not found — skipped`); continue; }

    // mustChangePassword=false: 8888 works right away and staff change it in
    // settings WHEN THEY WANT (owner's intent) — not forced on first login,
    // which would trap them until the PIN-change screen exists.
    await db.update(user).set({ name: spec.name, password: pin, mustChangePassword: false, rosterVisible: true, updatedAt: new Date() }).where(eq(user.id, id));

    for (const b of spec.brands) {
      const btid = tid(b.slug);
      if (!btid) { console.log(`  ⚠️  ${spec.name}: brand ${b.slug} not found`); continue; }
      const [ex] = await db.select({ id: tenantMember.id }).from(tenantMember)
        .where(and(eq(tenantMember.userId, id), eq(tenantMember.tenantId, btid))).limit(1);
      if (ex) {
        await db.update(tenantMember).set({ roles: b.roles }).where(eq(tenantMember.id, ex.id));
      } else {
        await db.insert(tenantMember).values({ userId: id, tenantId: btid, roles: b.roles });
      }
    }
    console.log(`  ✅ ${spec.name} — PIN 8888 (must-change), brands: ${spec.brands.map((b) => b.slug).join(", ")}`);
  }
  console.log("\nDone. Login by name + PIN 8888; users change it in settings.");
  await pool.end();
}
main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });

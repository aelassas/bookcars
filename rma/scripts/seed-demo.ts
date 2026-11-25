#!/usr/bin/env tsx
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "@/platform/db/client";
import { user, tenant, tenantMember, customer, vehicle, lead, deal } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { eq } from "drizzle-orm";

const DEMO_EMAIL = "demo@takeauto.ae";
const DEMO_SLUG = "take-auto";

async function main() {
  const existingUser = await db.select().from(user).where(eq(user.email, DEMO_EMAIL)).limit(1);
  let u = existingUser[0];
  if (!u) {
    const rows = await db.insert(user).values({ email: DEMO_EMAIL, name: "Demo Admin" }).returning();
    u = Array.isArray(rows) ? rows[0] : rows;
    console.log("Created demo user:", u.id);
  }

  const existingTenant = await db.select().from(tenant).where(eq(tenant.slug, DEMO_SLUG)).limit(1);
  let t = existingTenant[0];
  if (!t) {
    const rows = await db
      .insert(tenant)
      .values({
        slug: DEMO_SLUG,
        name: "TAKE Auto Demo",
        modules: ["dashboard", "crm", "customers", "messages", "fleet", "rentals", "returns", "collections", "tasks"],
      })
      .returning();
    t = Array.isArray(rows) ? rows[0] : rows;
    console.log("Created demo tenant:", t.id);
  }

  const existingMember = await db
    .select()
    .from(tenantMember)
    .where(eq(tenantMember.userId, u.id))
    .limit(1);
  if (!existingMember[0]) {
    await db.insert(tenantMember).values({ tenantId: t.id, userId: u.id, roles: ["tenant_admin"] });
    console.log("Granted tenant_admin to demo user");
  }

  await withDrizzleTenant(t.id, async (tx) => {
    const customersCount = await tx.select({ count: customer.id }).from(customer);
    if (Number(customersCount[0].count) === 0) {
      await tx.insert(customer).values([
        { tenantId: t.id, name: "Ahmed Al-Rashid", phone: "+971501234567", division: "rent", source: "whatsapp" },
        { tenantId: t.id, name: "Sarah Johnson", phone: "+971502345678", division: "lease", source: "instagram" },
        { tenantId: t.id, name: "Mohammed Khan", phone: "+971503456789", division: "rent", source: "walk_in" },
      ]);
      console.log("Seeded customers");
    }

    const vehiclesCount = await tx.select({ count: vehicle.id }).from(vehicle);
    if (Number(vehiclesCount[0].count) === 0) {
      await tx.insert(vehicle).values([
        { tenantId: t.id, make: "Toyota", model: "Land Cruiser", plate: "D 12345", dailyRate: 450, status: "available", odometer: 24000 },
        { tenantId: t.id, make: "Mercedes", model: "G-Class", plate: "D 67890", dailyRate: 1200, status: "available", odometer: 12000 },
        { tenantId: t.id, make: "BMW", model: "X5", plate: "D 11111", dailyRate: 550, status: "on_rent", odometer: 35000 },
        { tenantId: t.id, make: "Nissan", model: "Patrol", plate: "D 22222", dailyRate: 400, status: "reserved", odometer: 41000 },
      ]);
      console.log("Seeded vehicles");
    }

    const leadsCount = await tx.select({ count: lead.id }).from(lead);
    if (Number(leadsCount[0].count) === 0) {
      await tx.insert(lead).values([
        { tenantId: t.id, customerName: "Khalid", phone: "+971504567890", source: "whatsapp", status: "new" },
        { tenantId: t.id, customerName: "Lina", phone: "+971505678901", source: "instagram", status: "contacted" },
        { tenantId: t.id, customerName: "Omar", phone: "+971506789012", source: "facebook", status: "qualified" },
      ]);
      console.log("Seeded leads");
    }

    const dealsCount = await tx.select({ count: deal.id }).from(deal);
    if (Number(dealsCount[0].count) === 0) {
      await tx.insert(deal).values([
        { tenantId: t.id, ref: "DEAL-001", type: "rent", stage: "inquiry", status: "open", value: 1350 },
        { tenantId: t.id, ref: "DEAL-002", type: "lease", stage: "quote", status: "open", value: 8400 },
        { tenantId: t.id, ref: "DEAL-003", type: "rent", stage: "contract", status: "open", value: 2200 },
      ]);
      console.log("Seeded deals");
    }
  });

  console.log(`Demo ready at http://localhost:3000/${DEMO_SLUG}/crm`);
  console.log("Login with:", DEMO_EMAIL, "/ any password (credentials stub)");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

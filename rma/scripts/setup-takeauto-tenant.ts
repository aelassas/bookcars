import { config } from "dotenv";
config({ path: ".env.local" });

import { db, pool } from "@/platform/db/client";
import { tenant, user, tenantMember, vehicle, rental, customer, lead, deal, message } from "@/platform/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { syncVehiclesFromPilot } from "@/modules/fleet/queries";

// ─── Config ─────────────────────────────────────────────────────────────────

const TENANT_SLUG = "take-auto";
const TENANT_NAME = "TAKE Auto Car Rental";
const TENANT_LOCALE = "en-AE";
const TENANT_CURRENCY = "AED";

const ADMIN_EMAIL = "admin@takeauto.ae";
const ADMIN_PASSWORD = "Admin123";
const ADMIN_NAME = "Admin";

const WEBHOOK_URL = process.env.BITRIX24_WEBHOOK_URL;

async function main() {
  console.log("Setting up TAKE Auto tenant…\n");

  // 1. Upsert tenant
  let tenantRow = await db.select().from(tenant).where(eq(tenant.slug, TENANT_SLUG)).limit(1).then((r) => r[0] ?? null);

  if (tenantRow) {
    await db
      .update(tenant)
      .set({ name: TENANT_NAME, locale: TENANT_LOCALE, primaryCurrency: TENANT_CURRENCY, updatedAt: new Date() })
      .where(eq(tenant.id, tenantRow.id));
    tenantRow = { ...tenantRow, name: TENANT_NAME, locale: TENANT_LOCALE, primaryCurrency: TENANT_CURRENCY };
    console.log(`  ✓ Tenant "${TENANT_SLUG}" updated`);
  } else {
    const inserted = await db
      .insert(tenant)
      .values({ slug: TENANT_SLUG, name: TENANT_NAME, locale: TENANT_LOCALE, primaryCurrency: TENANT_CURRENCY })
      .returning();
    tenantRow = inserted[0];
    console.log(`  ✓ Tenant "${TENANT_SLUG}" created`);
  }

  // 2. Upsert admin user with password
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  let userRow = await db.select().from(user).where(eq(user.email, ADMIN_EMAIL)).limit(1).then((r) => r[0] ?? null);
  if (userRow) {
    await db
      .update(user)
      .set({ name: ADMIN_NAME, password: passwordHash, updatedAt: new Date() })
      .where(eq(user.id, userRow.id));
    userRow = { ...userRow, name: ADMIN_NAME, password: passwordHash };
    console.log(`  ✓ Admin user updated`);
  } else {
    const inserted = await db.insert(user).values({ email: ADMIN_EMAIL, name: ADMIN_NAME, password: passwordHash }).returning();
    userRow = inserted[0];
    console.log(`  ✓ Admin user created`);
  }

  // 3. Upsert membership with all roles
  const existingMember = await db
    .select()
    .from(tenantMember)
    .where(eq(tenantMember.tenantId, tenantRow.id))
    .then((rows) => rows.find((m) => m.userId === userRow.id));

  const allRoles = ["tenant_admin", "sales", "primary", "security", "fleet", "hr", "finance", "technical"];

  if (existingMember) {
    await db
      .update(tenantMember)
      .set({ roles: allRoles, updatedAt: new Date() })
      .where(eq(tenantMember.id, existingMember.id));
  } else {
    await db.insert(tenantMember).values({ tenantId: tenantRow.id, userId: userRow.id, roles: allRoles });
  }
  console.log(`  ✓ Admin membership with all roles`);

  // 4. Sync fleet from Pilot
  console.log("\n─── Syncing fleet from Pilot ───");
  try {
    const fleetResult = await syncVehiclesFromPilot(tenantRow.id);
    console.log(`  ✓ ${fleetResult.count} vehicles synced (${fleetResult.mode})`);
  } catch (e) {
    console.error(`  ✗ Fleet sync failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 5. Import Bitrix demo subset
  if (WEBHOOK_URL) {
    console.log("\n─── Importing Bitrix demo subset ───");
    try {
      const { syncBitrix24 } = await import("@/platform/integrations/bitrix24/sync");
      const bitrixResult = await syncBitrix24(db, tenantRow.id, WEBHOOK_URL, {
        syncContacts: true,
        syncLeads: true,
        syncDeals: true,
        syncCompanies: true,
        maxRecordsPerEntity: 500,
      });
      console.log(`  ✓ Contacts: ${bitrixResult.contactsSynced}`);
      console.log(`  ✓ Leads: ${bitrixResult.leadsSynced}`);
      console.log(`  ✓ Deals: ${bitrixResult.dealsSynced}`);
      console.log(`  ✓ Companies: ${bitrixResult.companiesSynced}`);
      if (bitrixResult.errors.length > 0) {
        console.log(`  ⚠ ${bitrixResult.errors.length} error(s):`);
        for (const err of bitrixResult.errors) {
          console.log(`     - ${err}`);
        }
      }
    } catch (e) {
      console.error(`  ✗ Bitrix import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    console.log("\n─── Skipping Bitrix import (BITRIX24_WEBHOOK_URL not set) ───");
  }

  // 6. Seed narrative anchors (Vikram Singh, etc.)
  console.log("\n─── Seeding narrative anchors ───");
  await seedNarrativeAnchors(tenantRow.id);

  console.log("\n─── Demo ready ───");
  console.log(`  Login:    http://localhost:3000/login`);
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("");

  await pool.end();
}

async function seedNarrativeAnchors(tenantId: string) {
  const anchors = [
    { name: "Vikram Singh", phone: "+971 55 123 4567", email: "vikram.singh@takeauto.ae", imei: "864275072451449", plate: "J72928", scenario: "McLaren 765LT — overdue, blocked", daysAgo: 18, duration: 10, rate: 4500, deposit: 10000 },
    { name: "Rashed Khan", phone: "+971 50 987 6543", imei: "864636067481701", plate: "BB79182", scenario: "Nissan Patrol — due today", daysAgo: 7, duration: 7, rate: 650, deposit: 2000 },
    { name: "Ahmed Al-Mansoori", phone: "+971 56 111 2222", email: "ahmed@almansoori.ae", imei: "864636062089715", plate: "H34165", scenario: "Mercedes G63 — active lease", daysAgo: 45, duration: 90, rate: 1800, deposit: 5000 },
    { name: "Damac Properties LLC", phone: "+971 4 373 0000", email: "fleet@damac.ae", imei: "864275070018612", plate: "CC79078", scenario: "Range Rover — corporate lease", daysAgo: 120, duration: 365, rate: 1200, deposit: 10000 },
    { name: "Mohammed Saleh", phone: "+971 55 444 5555", imei: "864636064791391", plate: "AA81643", scenario: "Toyota Land Cruiser — active rental", daysAgo: 3, duration: 14, rate: 550, deposit: 1500 },
    { name: "John Carter", phone: "+1 305 555 0199", email: "john.carter@outlook.com", imei: "866069062187248", plate: "C94787", scenario: "Mercedes E-Class — due tomorrow", daysAgo: 6, duration: 7, rate: 480, deposit: 1500 },
    { name: "Aisha Khalid", phone: "+971 56 777 8888", imei: "864636064845775", plate: "BB42573", scenario: "Mercedes G63 — available, hot lead", daysAgo: 0, duration: 0, rate: 1800, deposit: 5000 },
  ];

  const now = new Date();

  for (const a of anchors) {
    // Find vehicle by IMEI
    const veh = await db.select().from(vehicle).where(and(eq(vehicle.tenantId, tenantId), eq(vehicle.imei, a.imei))).limit(1).then((r) => r[0] ?? null);
    if (!veh) {
      console.log(`  ⚠ Vehicle ${a.plate} not found in fleet, skipping anchor`);
      continue;
    }

    // Upsert customer
    let cust = await db.select().from(customer).where(and(eq(customer.tenantId, tenantId), eq(customer.phone, a.phone))).limit(1).then((r) => r[0] ?? null);
    if (cust) {
      await db.update(customer).set({ name: a.name, email: a.email ?? cust.email, updatedAt: new Date() }).where(eq(customer.id, cust.id));
      cust = { ...cust, name: a.name, email: a.email ?? cust.email };
    } else {
      const inserted = await db.insert(customer).values({ tenantId, name: a.name, phone: a.phone, email: a.email, division: "rent", source: "walk_in" }).returning();
      // .returning() types as any[] | QueryResult<never>; at runtime it is the row array.
      cust = (Array.isArray(inserted) ? inserted : inserted.rows)[0];
    }

    // Create rental (skip Aisha - no rental)
    if (a.duration > 0) {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - a.daysAgo);
      startDate.setHours(10, 0, 0, 0);
      const returnDate = new Date(startDate);
      returnDate.setDate(returnDate.getDate() + a.duration);
      returnDate.setHours(10, 0, 0, 0);
      const total = a.rate * a.duration;
      const balanceDue = a.name === "Vikram Singh" ? total + 2000 : 0;

      const existingRental = await db.select().from(rental).where(and(eq(rental.tenantId, tenantId), eq(rental.customerId, cust.id), eq(rental.vehicleId, veh.id))).limit(1).then((r) => r[0] ?? null);
      if (existingRental) {
        await db.update(rental).set({ startDate, returnDate, dailyRate: a.rate, totalDays: a.duration, total, deposit: a.deposit, balanceDue, status: "active", updatedAt: new Date() }).where(eq(rental.id, existingRental.id));
      } else {
        await db.insert(rental).values({ tenantId, customerId: cust.id, vehicleId: veh.id, startDate, returnDate, dailyRate: a.rate, totalDays: a.duration, total, deposit: a.deposit, balanceDue, status: "active" });
      }
    }
  }

  // Seed messages
  const messages: {
    channel: string;
    from: string;
    customerName: string;
    body: string;
    status: string;
    classification?: Record<string, string>;
  }[] = [
    { channel: "whatsapp", from: "+971 55 333 9999", customerName: "Кэролайн Хан", body: "Здравствуйте! Нужен кабриолет на 5-11 апреля, что есть из доступного? Бюджет до 600 AED/сутки. Спасибо!", status: "new" },
    { channel: "instagram", from: "@dubai_rentals_ua", customerName: "Dubai Rentals UA", body: "Hi, do you have G63 available next week? Need it for 3 days. Can you deliver to Dubai Marina?", status: "new" },
    { channel: "yango", from: "+971 50 222 4444", customerName: "Yango Lead #4821", body: "مرحباً، أريد استئجار سيارة لمدة شهر. ما هي العروض المتاحة؟", status: "new" },
    { channel: "facebook", from: "+971 55 666 1111", customerName: "Alex Petrov", body: "Привет! Есть ли Land Cruiser на май? Нужна на 2 недели для семьи. Какая цена за 14 дней?", status: "new" },
    { channel: "whatsapp", from: "+971 56 999 0000", customerName: "Fatima Al-Zahra", body: "Hello, I need a luxury car for a wedding on Friday. Do you have Rolls-Royce or Bentley available?", status: "classified", classification: { intent: "luxury rental inquiry", urgency: "high", language: "en", customer_segment: "retail", vehicle_class_hint: "ultra-luxury" } },
    { channel: "instagram", from: "@luxury_dxb", customerName: "Luxury DXB", body: "Hey! Looking for McLaren or Ferrari for a weekend shoot. 2 days max. What's the damage? 🔥", status: "new" },
    { channel: "whatsapp", from: "+971 50 111 3333", customerName: "Sergey Volkov", body: "Добрый день! Нужен Patrol или Land Cruiser на 10 дней с 15 апреля. Есть ли скидка за долгосрок?", status: "new" },
    { channel: "yango", from: "+971 55 888 2222", customerName: "Yango Lead #5103", body: "Hi, my friend recommended TAKE Auto. I need a car for daily commute — something economical like Sonata or Accent. Monthly rate?", status: "new" },
  ];

  for (const m of messages) {
    const existing = await db.select().from(message).where(and(eq(message.tenantId, tenantId), eq(message.body, m.body))).limit(1).then((r) => r[0] ?? null);
    if (!existing) {
      await db.insert(message).values({ tenantId, channel: m.channel, from: m.from, customerName: m.customerName, body: m.body, status: m.status, classification: m.classification ?? null });
    }
  }

  // Seed leads
  const leadNames = [
    "Кэролайн Хан — Cabriolet inquiry",
    "Dubai Rentals UA — G63 weekly",
    "Yango Lead #4821 — Monthly rental AR",
    "Alex Petrov — Land Cruiser 2 weeks",
    "Fatima Al-Zahra — Wedding Rolls/Bentley",
  ];
  const leadStatuses = ["new", "contacted", "qualified", "contacted", "new"];
  const leadSources = ["whatsapp", "instagram", "yango", "facebook", "walk_in"];

  for (let i = 0; i < leadNames.length; i++) {
    const existing = await db.select().from(lead).where(and(eq(lead.tenantId, tenantId), eq(lead.phone, messages[i]?.from ?? ""))).limit(1).then((r) => r[0] ?? null);
    if (existing) {
      await db.update(lead).set({ customerName: leadNames[i], status: leadStatuses[i], source: leadSources[i], updatedAt: new Date() }).where(eq(lead.id, existing.id));
    } else {
      await db.insert(lead).values({ tenantId, customerName: leadNames[i], phone: messages[i]?.from ?? `+97150${i}000000`, status: leadStatuses[i], source: leadSources[i] });
    }
  }

  // Seed historical deals
  const deals = [
    { ref: "TAC-2025-0891", type: "rent" as const, status: "won" as const, stage: "closed" as const, value: 12600 },
    { ref: "TAC-2025-1022", type: "lease" as const, status: "won" as const, stage: "closed" as const, value: 54000 },
    { ref: "TAC-2025-1103", type: "rent" as const, status: "lost" as const, stage: "closed" as const, value: 8400 },
    { ref: "TAC-2025-1156", type: "rent" as const, status: "won" as const, stage: "closed" as const, value: 9800 },
  ];

  for (const d of deals) {
    const existing = await db.select().from(deal).where(and(eq(deal.tenantId, tenantId), eq(deal.ref, d.ref))).limit(1).then((r) => r[0] ?? null);
    if (!existing) {
      await db.insert(deal).values({ tenantId, ...d });
    }
  }

  console.log("  ✓ Narrative anchors seeded");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

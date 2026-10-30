// Setup OnWheels tenant with real Pilot sync + narrative anchors from real OnWheels fleet.
// Adapted from scripts/setup-takeauto-tenant.ts.

import { config } from "dotenv";
config({ path: ".env.local" });

import { db, pool } from "@/platform/db/client";
import { tenant, user, tenantMember, vehicle, rental, customer, message } from "@/platform/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { syncVehiclesFromPilot } from "@/modules/fleet/queries";

const TENANT_SLUG = "onwheels";
const TENANT_NAME = "OnWheels Car Rental";
const TENANT_LOCALE = "ru-AE";
const TENANT_CURRENCY = "AED";
const BRAND_NAME = "OnWheels CRM";

const ADMIN_EMAIL = "mikael@onwheelsrent.ae";
const ADMIN_PASSWORD = "Welcome1!";
const ADMIN_NAME = "Микаел Оганян";

const STAFF: { email: string; name: string; password: string; roles: string[] }[] = [
  { email: "mikael@onwheelsrent.ae",   name: "Микаел Оганян (CEO)",            password: "Welcome1!", roles: ["tenant_admin", "sales", "primary", "security", "fleet", "hr", "finance", "technical"] },
  { email: "janibek@onwheelsrent.ae",  name: "Джанибек Айроян (совладелец)",   password: "Welcome1!", roles: ["tenant_admin", "sales", "primary", "security", "fleet", "hr", "finance", "technical"] },
  { email: "maya@onwheelsrent.ae",     name: "Майя Молочаева (менеджер продаж)", password: "Welcome1!", roles: ["sales", "primary"] },
  { email: "gor@onwheelsrent.ae",      name: "Гор Унанян (финансист)",         password: "Welcome1!", roles: ["finance"] },
  { email: "jennifer@onwheelsrent.ae", name: "Jennifer (fleet manager)",       password: "Welcome1!", roles: ["finance", "fleet"] },
  { email: "natalya@onwheelsrent.ae",  name: "Наталья Гусар (бухгалтер)",      password: "Welcome1!", roles: ["finance"] },
  { email: "zaman@onwheelsrent.ae",    name: "Zaman (водитель)",               password: "Welcome1!", roles: ["fleet"] },
  { email: "bilal@onwheelsrent.ae",    name: "Bilal (водитель)",               password: "Welcome1!", roles: ["fleet"] },
  { email: "haroon@onwheelsrent.ae",   name: "Haroon (водитель)",              password: "Welcome1!", roles: ["fleet"] },
  { email: "hamlet@onwheelsrent.ae",   name: "Гамлет (глава сервиса)",         password: "Welcome1!", roles: ["technical", "fleet"] },
];

async function main() {
  console.log("Setting up OnWheels tenant…\n");

  // 1. Upsert tenant
  let tenantRow = await db.select().from(tenant).where(eq(tenant.slug, TENANT_SLUG)).limit(1).then((r) => r[0] ?? null);
  if (tenantRow) {
    await db.update(tenant).set({ name: TENANT_NAME, locale: TENANT_LOCALE, primaryCurrency: TENANT_CURRENCY, brandName: BRAND_NAME, updatedAt: new Date() }).where(eq(tenant.id, tenantRow.id));
    tenantRow = { ...tenantRow, name: TENANT_NAME, locale: TENANT_LOCALE, primaryCurrency: TENANT_CURRENCY, brandName: BRAND_NAME };
    console.log(`  ✓ Tenant "${TENANT_SLUG}" updated`);
  } else {
    const inserted = await db.insert(tenant).values({ slug: TENANT_SLUG, name: TENANT_NAME, locale: TENANT_LOCALE, primaryCurrency: TENANT_CURRENCY, brandName: BRAND_NAME }).returning();
    tenantRow = inserted[0];
    console.log(`  ✓ Tenant "${TENANT_SLUG}" created`);
  }

  // 2. Upsert all 10 staff + memberships
  for (const s of STAFF) {
    const passwordHash = await bcrypt.hash(s.password, 12);
    let userRow = await db.select().from(user).where(eq(user.email, s.email)).limit(1).then((r) => r[0] ?? null);
    if (userRow) {
      await db.update(user).set({ name: s.name, password: passwordHash, updatedAt: new Date() }).where(eq(user.id, userRow.id));
      userRow = { ...userRow, name: s.name, password: passwordHash };
    } else {
      const inserted = await db.insert(user).values({ email: s.email, name: s.name, password: passwordHash }).returning();
      userRow = inserted[0];
    }
    const existing = await db.select().from(tenantMember).where(eq(tenantMember.tenantId, tenantRow.id)).then((rows) => rows.find((m) => m.userId === userRow.id));
    if (existing) {
      await db.update(tenantMember).set({ roles: s.roles, updatedAt: new Date() }).where(eq(tenantMember.id, existing.id));
    } else {
      await db.insert(tenantMember).values({ tenantId: tenantRow.id, userId: userRow.id, roles: s.roles });
    }
    console.log(`  ✓ ${s.name} <${s.email}> [${s.roles.join(",")}]`);
  }

  // 3. Sync fleet from real OnWheels Pilot account (34 vehicles)
  console.log("\n─── Syncing fleet from Pilot (onwheels@pilot.ae) ───");
  try {
    const fleetResult = await syncVehiclesFromPilot(tenantRow.id);
    console.log(`  ✓ ${fleetResult.count} vehicles synced (${fleetResult.mode})`);
  } catch (e) {
    console.error(`  ✗ Fleet sync failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 4. Narrative anchors using REAL OnWheels fleet plates
  console.log("\n─── Seeding narrative anchors (real plates) ───");
  await seedNarrativeAnchors(tenantRow.id);

  console.log("\n─── Demo ready ───");
  console.log(`  Login:    (public URL)/login`);
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  Tenant:   /${TENANT_SLUG}`);
  console.log("");
  await pool.end();
}

async function seedNarrativeAnchors(tenantId: string) {
  // Scenarios tied to REAL OnWheels vehicles pulled from Pilot
  const anchors: {
    name: string; phone: string; email?: string;
    imei: string; plate: string; scenario: string;
    daysAgo: number; duration: number; rate: number; deposit: number;
  }[] = [
    { name: "Александр Петров", phone: "+971 55 123 4567", email: "a.petrov@gmail.com", imei: "867747078073351", plate: "BB42728 G63",           scenario: "Mercedes G63 — overdue, blocked",          daysAgo: 18, duration: 10, rate: 1800, deposit: 5000 },
    { name: "Rashed Al-Mansoori", phone: "+971 50 987 6543",                              imei: "867747078194041", plate: "F58961 Range Rover",   scenario: "Range Rover — due today",                  daysAgo: 7,  duration: 7,  rate: 1200, deposit: 3000 },
    { name: "Damac Properties LLC", phone: "+971 4 373 0000", email: "fleet@damac.ae",   imei: "867747078416942", plate: "CC55475 X3",            scenario: "BMW X3 — corporate lease",                 daysAgo: 45, duration: 90, rate: 650,  deposit: 2500 },
    { name: "Елена Соколова",      phone: "+971 56 111 2222",                             imei: "867747078512401", plate: "W30625 Palisade",       scenario: "Hyundai Palisade — family, active",        daysAgo: 3,  duration: 14, rate: 450,  deposit: 1500 },
    { name: "John Carter",         phone: "+1 305 555 0199", email: "john.c@outlook.com", imei: "867747078901009", plate: "N53984 MINI Cooper",   scenario: "MINI Countryman — due tomorrow",           daysAgo: 6,  duration: 7,  rate: 320,  deposit: 1000 },
    { name: "Айша Халед",          phone: "+971 56 777 8888",                             imei: "867747078180409", plate: "Y19843 Telluride",     scenario: "Kia Telluride — weekend, started yesterday", daysAgo: 1,  duration: 3,  rate: 500,  deposit: 1500 },
    { name: "Hot Lead — WA",       phone: "+971 50 555 1212",                             imei: "867747078056923", plate: "H35969 Sonata",         scenario: "Hyundai Sonata — available, hot lead",     daysAgo: 0,  duration: 0,  rate: 180,  deposit: 500 },
  ];
  const now = new Date();
  for (const a of anchors) {
    const veh = await db.select().from(vehicle).where(and(eq(vehicle.tenantId, tenantId), eq(vehicle.imei, a.imei))).limit(1).then((r) => r[0] ?? null);
    if (!veh) { console.log(`  ⚠ Vehicle ${a.plate} (imei ${a.imei}) not in fleet, skipping`); continue; }

    let cust = await db.select().from(customer).where(and(eq(customer.tenantId, tenantId), eq(customer.phone, a.phone))).limit(1).then((r) => r[0] ?? null);
    if (cust) {
      await db.update(customer).set({ name: a.name, email: a.email ?? cust.email, updatedAt: new Date() }).where(eq(customer.id, cust.id));
      cust = { ...cust, name: a.name, email: a.email ?? cust.email };
    } else {
      const inserted = await db.insert(customer).values({ tenantId, name: a.name, phone: a.phone, email: a.email, division: "rent", source: "walk_in" }).returning();
      cust = (Array.isArray(inserted) ? inserted : (inserted as any).rows)[0];
    }

    if (a.duration > 0) {
      const startDate = new Date(now); startDate.setDate(startDate.getDate() - a.daysAgo); startDate.setHours(10,0,0,0);
      const returnDate = new Date(startDate); returnDate.setDate(returnDate.getDate() + a.duration); returnDate.setHours(10,0,0,0);
      const total = a.rate * a.duration;
      const balanceDue = a.name.startsWith("Александр Петров") ? total + 2000 : 0;
      const existing = await db.select().from(rental).where(and(eq(rental.tenantId, tenantId), eq(rental.customerId, cust.id), eq(rental.vehicleId, veh.id))).limit(1).then((r) => r[0] ?? null);
      if (existing) {
        await db.update(rental).set({ startDate, returnDate, dailyRate: a.rate, totalDays: a.duration, total, deposit: a.deposit, balanceDue, status: "active", updatedAt: new Date() }).where(eq(rental.id, existing.id));
      } else {
        await db.insert(rental).values({ tenantId, customerId: cust.id, vehicleId: veh.id, startDate, returnDate, dailyRate: a.rate, totalDays: a.duration, total, deposit: a.deposit, balanceDue, status: "active" });
      }
      console.log(`  ✓ ${a.name} → ${a.plate} (${a.scenario})`);
    } else {
      console.log(`  ✓ ${a.name} — ${a.scenario} (lead, no rental)`);
    }
  }

  // Fresh WhatsApp / Yango / Instagram messages for the Inbox demo
  const msgs: { channel: string; from: string; customerName: string; body: string; status: string }[] = [
    { channel: "whatsapp", from: "+971 55 333 9999", customerName: "Dmitry Kozlov",     body: "Привет! G63 свободен на выходные? Бюджет до 2000/сутки, нужна с водителем.", status: "new" },
    { channel: "whatsapp", from: "+971 50 222 4444", customerName: "Yango Lead #4821",  body: "مرحباً، أريد استئجار سيارة لمدة شهر. ما هي العروض المتاحة؟", status: "new" },
    { channel: "instagram", from: "@dubai_rentals_ua", customerName: "Dubai Rentals",   body: "Hi, do you have Range Rover available next week? 3 days, delivery to Marina.", status: "new" },
    { channel: "facebook", from: "+971 55 666 1111", customerName: "Alex Petrov",       body: "Привет! Есть Palisade или Patrol на май на 2 недели для семьи?", status: "new" },
    { channel: "whatsapp", from: "+971 56 999 0000", customerName: "Fatima Al-Zahra",   body: "Hello, I need a luxury car for wedding Friday. Do you have Bentley or Rolls?", status: "classified" },
    { channel: "yango", from: "+971 55 888 2222", customerName: "Yango Lead #5103",     body: "Нужна Sonata или Elantra на месяц. Какая цена с длинной арендой?", status: "new" },
    { channel: "whatsapp", from: "+971 50 111 3333", customerName: "Сергей Волков",     body: "Добрый день! Нужен Telluride или Palisade на 10 дней с 20 октября. Есть скидка?", status: "new" },
    { channel: "whatsapp", from: "+971 54 555 7788", customerName: "Hamid Al-Rashid",   body: "G63 или Range Rover available for 5 days? Starting Thursday.", status: "new" },
  ];
  for (const m of msgs) {
    await db.insert(message).values({ tenantId, channel: m.channel as any, from: m.from, body: m.body, status: m.status as any, customerName: m.customerName });
  }
  console.log(`  ✓ ${msgs.length} inbox messages seeded`);
}

main().catch((e) => { console.error(e); process.exit(1); });

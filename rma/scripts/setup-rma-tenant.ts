// Setup RMA tenant — RMA CAR RENTAL L.L.C - S.O.C (Dubai), 20 cars, 3 staff.
// Adapted from scripts/setup-onwheels-tenant.ts.

import { config } from "dotenv";
config({ path: ".env.local" });

import { db, pool } from "@/platform/db/client";
import { tenant, user, tenantMember, vehicle, rental, customer, message } from "@/platform/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

const TENANT_SLUG = "rma";
const TENANT_NAME = "RMA Car Rental";
const TENANT_LOCALE = "ru-AE";
const TENANT_CURRENCY = "AED";
const BRAND_NAME = "RMA-CRM";

const STAFF: { email: string; name: string; password: string; roles: string[] }[] = [
  { email: "ruslan@rma.network", name: "Руслан Ананьев (Owner)",         password: "Welcome1!", roles: ["tenant_admin", "sales", "primary", "security", "fleet", "hr", "finance", "technical"] },
  { email: "marat@rma.network",  name: "Марат Ананьев (Son / Manager)",  password: "Welcome1!", roles: ["tenant_admin", "sales", "primary", "fleet"] },
  { email: "lilia@rma.network",  name: "Лилия Ананьева (Wife / Finance)", password: "Welcome1!", roles: ["sales", "finance", "primary"] },
];

// 20-car Dubai rental fleet (mid-tier tourist cars + a few premium).
// No GPS trackers yet per intake form, so no IMEI / Pilot sync.
const FLEET: { make: string; model: string; year: number; plate: string; color: string; dailyRate: number }[] = [
  { make: "Nissan",       model: "Sunny",       year: 2024, plate: "DXB A 12101", color: "White",  dailyRate: 110 },
  { make: "Kia",          model: "Pegas",       year: 2024, plate: "DXB A 12202", color: "Silver", dailyRate: 110 },
  { make: "Toyota",       model: "Yaris",       year: 2024, plate: "DXB B 23301", color: "White",  dailyRate: 130 },
  { make: "Hyundai",      model: "Accent",      year: 2024, plate: "DXB B 23402", color: "Grey",   dailyRate: 130 },
  { make: "Toyota",       model: "Corolla",     year: 2024, plate: "DXB C 34501", color: "White",  dailyRate: 160 },
  { make: "Hyundai",      model: "Elantra",     year: 2024, plate: "DXB C 34602", color: "Silver", dailyRate: 160 },
  { make: "Mitsubishi",   model: "Attrage",     year: 2023, plate: "DXB D 45701", color: "White",  dailyRate: 100 },
  { make: "Nissan",       model: "Sentra",      year: 2024, plate: "DXB D 45802", color: "Black",  dailyRate: 150 },
  { make: "Kia",          model: "Rio",         year: 2023, plate: "DXB E 56901", color: "Red",    dailyRate: 130 },
  { make: "Chevrolet",    model: "Spark",       year: 2023, plate: "DXB E 56002", color: "Blue",   dailyRate: 100 },
  { make: "Hyundai",      model: "Sonata",      year: 2024, plate: "DXB F 67103", color: "White",  dailyRate: 180 },
  { make: "Toyota",       model: "Camry",       year: 2024, plate: "DXB F 67204", color: "Silver", dailyRate: 220 },
  { make: "Honda",        model: "Accord",      year: 2023, plate: "DXB G 78305", color: "Black",  dailyRate: 220 },
  { make: "Kia",          model: "K5",          year: 2024, plate: "DXB G 78406", color: "White",  dailyRate: 220 },
  { make: "Nissan",       model: "Kicks",       year: 2024, plate: "DXB H 89507", color: "Grey",   dailyRate: 170 },
  { make: "Mitsubishi",   model: "Pajero",      year: 2023, plate: "DXB H 89608", color: "White",  dailyRate: 350 },
  { make: "Nissan",       model: "Patrol",      year: 2024, plate: "DXB K 90709", color: "Black",  dailyRate: 450 },
  { make: "Toyota",       model: "Prado",       year: 2023, plate: "DXB K 90810", color: "White",  dailyRate: 400 },
  { make: "Lexus",        model: "NX",          year: 2024, plate: "DXB L 11911", color: "White",  dailyRate: 500 },
  { make: "Land Rover",   model: "Range Rover Evoque", year: 2023, plate: "DXB L 11012", color: "Grey", dailyRate: 600 },
];

async function main() {
  console.log("Setting up RMA tenant…\n");

  // 1. Upsert tenant
  let tenantRow = await db.select().from(tenant).where(eq(tenant.slug, TENANT_SLUG)).limit(1).then((r) => r[0] ?? null);
  if (tenantRow) {
    await db.update(tenant).set({ name: TENANT_NAME, locale: TENANT_LOCALE, primaryCurrency: TENANT_CURRENCY, brandName: BRAND_NAME, onboardedAt: new Date(), updatedAt: new Date() }).where(eq(tenant.id, tenantRow.id));
    tenantRow = { ...tenantRow, name: TENANT_NAME, locale: TENANT_LOCALE, primaryCurrency: TENANT_CURRENCY, brandName: BRAND_NAME, onboardedAt: new Date() };
    console.log(`  ✓ Tenant "${TENANT_SLUG}" updated`);
  } else {
    const inserted = await db.insert(tenant).values({ slug: TENANT_SLUG, name: TENANT_NAME, locale: TENANT_LOCALE, primaryCurrency: TENANT_CURRENCY, brandName: BRAND_NAME, onboardedAt: new Date() }).returning();
    tenantRow = inserted[0];
    console.log(`  ✓ Tenant "${TENANT_SLUG}" created`);
  }

  // 2. Upsert staff + memberships
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

  // 3. Seed 20 vehicles
  console.log("\n─── Seeding 20-car fleet ───");
  for (const v of FLEET) {
    const existing = await db.select().from(vehicle).where(and(eq(vehicle.tenantId, tenantRow.id), eq(vehicle.plate, v.plate))).limit(1).then((r) => r[0] ?? null);
    if (existing) {
      await db.update(vehicle).set({ make: v.make, model: v.model, year: v.year, dailyRate: v.dailyRate, updatedAt: new Date() }).where(eq(vehicle.id, existing.id));
    } else {
      await db.insert(vehicle).values({
        tenantId: tenantRow.id,
        make: v.make,
        model: v.model,
        year: v.year,
        plate: v.plate,
        division: "rent",
        status: "available",
        dailyRate: v.dailyRate,
      });
    }
    console.log(`  ✓ ${v.plate} — ${v.make} ${v.model} ${v.year} (${v.color}, ${v.dailyRate} AED/d)`);
  }

  // 4. Narrative anchors — 6 realistic scenarios for the Mikael demo
  console.log("\n─── Seeding narrative anchors (demo rentals) ───");
  await seedAnchors(tenantRow.id);

  console.log("\n─── RMA demo ready ───");
  console.log(`  URL:      http://187.127.219.106:8087/login/${TENANT_SLUG}`);
  console.log(`  Owner:    ruslan@rma.network  / Welcome1!`);
  console.log(`  Son:      marat@rma.network   / Welcome1!`);
  console.log(`  Wife:     lilia@rma.network   / Welcome1!`);
  console.log(`  Tenant:   /${TENANT_SLUG}`);
  console.log("");
  await pool.end();
}

async function seedAnchors(tenantId: string) {
  // Scenarios reflecting RMA intake (tourist deposit 1500, daily rentals, 1-3 enquiries/day).
  const anchors: {
    name: string; phone: string; email?: string;
    plate: string; scenario: string;
    daysAgo: number; duration: number; rate: number; deposit: number; balanceExtra?: number;
  }[] = [
    { name: "John Smith (tourist)",   phone: "+971 55 101 2301", email: "john.smith@gmail.com", plate: "DXB F 67103", scenario: "Hyundai Sonata — tourist, started yesterday",       daysAgo: 1,  duration: 7,  rate: 180, deposit: 1500 },
    { name: "Марина Волкова",         phone: "+971 50 202 3302", email: "marina.v@mail.ru",     plate: "DXB C 34501", scenario: "Toyota Corolla — monthly, 3 weeks in",              daysAgo: 21, duration: 30, rate: 160, deposit: 1500 },
    { name: "Fatima Al-Zahra",        phone: "+971 56 303 4403",                                 plate: "DXB K 90709", scenario: "Nissan Patrol — weekend trip, due tomorrow",         daysAgo: 2,  duration: 3,  rate: 450, deposit: 2500 },
    { name: "Dmitry Kozlov",          phone: "+971 54 404 5504",                                 plate: "DXB L 11911", scenario: "Lexus NX — OVERDUE, balance 1000 AED",              daysAgo: 10, duration: 7,  rate: 500, deposit: 2000, balanceExtra: 1000 },
    { name: "Rashed Al-Mansoori",     phone: "+971 50 505 6605",                                 plate: "DXB G 78305", scenario: "Honda Accord — returning customer, 2nd rental",     daysAgo: 5,  duration: 14, rate: 220, deposit: 1500 },
    { name: "Елена Петрова",          phone: "+971 55 606 7706",                                 plate: "DXB F 67204", scenario: "Toyota Camry — business trip, picks up today",      daysAgo: 0,  duration: 5,  rate: 220, deposit: 1500 },
  ];
  const now = new Date();
  for (const a of anchors) {
    const veh = await db.select().from(vehicle).where(and(eq(vehicle.tenantId, tenantId), eq(vehicle.plate, a.plate))).limit(1).then((r) => r[0] ?? null);
    if (!veh) { console.log(`  ⚠ Vehicle ${a.plate} not in fleet, skipping ${a.name}`); continue; }

    let cust = await db.select().from(customer).where(and(eq(customer.tenantId, tenantId), eq(customer.phone, a.phone))).limit(1).then((r) => r[0] ?? null);
    if (cust) {
      await db.update(customer).set({ name: a.name, email: a.email ?? cust.email, updatedAt: new Date() }).where(eq(customer.id, cust.id));
    } else {
      await db.insert(customer).values({ tenantId, name: a.name, phone: a.phone, email: a.email, division: "rent", source: "whatsapp" });
      cust = await db.select().from(customer).where(and(eq(customer.tenantId, tenantId), eq(customer.phone, a.phone))).limit(1).then((r) => r[0] ?? null);
    }

    const startDate = new Date(now); startDate.setDate(startDate.getDate() - a.daysAgo); startDate.setHours(10,0,0,0);
    const returnDate = new Date(startDate); returnDate.setDate(returnDate.getDate() + a.duration); returnDate.setHours(10,0,0,0);
    const total = a.rate * a.duration;
    const balanceDue = a.balanceExtra ?? 0;
    const isOverdue = returnDate < now;
    const existing = await db.select().from(rental).where(and(eq(rental.tenantId, tenantId), eq(rental.customerId, cust!.id), eq(rental.vehicleId, veh.id))).limit(1).then((r) => r[0] ?? null);
    if (existing) {
      await db.update(rental).set({ startDate, returnDate, dailyRate: a.rate, totalDays: a.duration, total, deposit: a.deposit, balanceDue, status: isOverdue ? "overdue" : "active", updatedAt: new Date() }).where(eq(rental.id, existing.id));
    } else {
      await db.insert(rental).values({ tenantId, customerId: cust!.id, vehicleId: veh.id, startDate, returnDate, dailyRate: a.rate, totalDays: a.duration, total, deposit: a.deposit, balanceDue, status: isOverdue ? "overdue" : "active" });
    }
    await db.update(vehicle).set({ status: isOverdue ? "overdue" : "on_rent", updatedAt: new Date() }).where(eq(vehicle.id, veh.id));
    console.log(`  ✓ ${a.name} → ${a.plate} (${a.scenario})`);
  }

  // Fresh inbox messages for Mikael demo
  const msgs: { channel: string; from: string; customerName: string; body: string; status: string }[] = [
    { channel: "whatsapp", from: "+971 55 707 8807", customerName: "Mohammed",         body: "Hi, do you have a Patrol or Prado for 3 days starting tomorrow? Budget 500/day.", status: "new" },
    { channel: "whatsapp", from: "+971 50 808 9908", customerName: "Айнур Темирова",   body: "Здравствуйте! Нужна машина эконом класса на месяц. Какие цены?", status: "new" },
    { channel: "dubizzle", from: "dubizzle-lead-9823", customerName: "Dubizzle lead",   body: "Rental enquiry — Toyota Camry — 7 days — delivery to JVC", status: "new" },
    { channel: "whatsapp", from: "+971 56 909 0109", customerName: "Khalid",           body: "مرحبا، أحتاج سيارة اقتصادية لمدة أسبوعين، ما هي الأسعار؟", status: "new" },
    { channel: "whatsapp", from: "+971 54 101 2210", customerName: "Returning — Sergey", body: "Привет Руслан! Хочу продлить аренду Camry ещё на 5 дней.", status: "classified" },
    { channel: "whatsapp", from: "+971 55 202 3311", customerName: "Anna Pavlova",     body: "Можно забрать Elantra завтра утром? Я звонила вчера.", status: "new" },
  ];
  for (const m of msgs) {
    await db.insert(message).values({ tenantId, channel: m.channel as any, from: m.from, body: m.body, status: m.status as any, customerName: m.customerName });
  }
  console.log(`  ✓ ${msgs.length} inbox messages seeded`);
}

main().catch((e) => { console.error(e); process.exit(1); });

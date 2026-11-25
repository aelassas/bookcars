import { config } from "dotenv";
config({ path: ".env.local" });

import { db, pool } from "@/platform/db/client";
import { tenant, vehicle, customer, lead, deal, rental, message, user, verificationToken } from "@/platform/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const TENANT_SLUG = "take-auto";

interface Anchor {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  imei: string;
  plate: string;
  scenario: string;
  rentalStartDaysAgo: number;
  rentalDurationDays: number;
  dailyRate: number;
  deposit: number;
  division?: string;
}

const ANCHORS: Anchor[] = [
  {
    customerName: "Vikram Singh",
    customerPhone: "+971 55 123 4567",
    customerEmail: "vikram.singh@takeauto.ae",
    imei: "864275072451449",
    plate: "J72928",
    scenario: "McLaren 765LT — overdue, blocked",
    rentalStartDaysAgo: 18,
    rentalDurationDays: 10,
    dailyRate: 4500,
    deposit: 10000,
    division: "rent",
  },
  {
    customerName: "Rashed Khan",
    customerPhone: "+971 50 987 6543",
    imei: "864636067481701",
    plate: "BB79182",
    scenario: "Nissan Patrol — due today",
    rentalStartDaysAgo: 7,
    rentalDurationDays: 7,
    dailyRate: 650,
    deposit: 2000,
    division: "rent",
  },
  {
    customerName: "Ahmed Al-Mansoori",
    customerPhone: "+971 56 111 2222",
    customerEmail: "ahmed@almansoori.ae",
    imei: "864636062089715",
    plate: "H34165",
    scenario: "Mercedes G63 — active lease",
    rentalStartDaysAgo: 45,
    rentalDurationDays: 90,
    dailyRate: 1800,
    deposit: 5000,
    division: "lease",
  },
  {
    customerName: "Damac Properties LLC",
    customerPhone: "+971 4 373 0000",
    customerEmail: "fleet@damac.ae",
    imei: "864275070018612",
    plate: "CC79078",
    scenario: "Range Rover — corporate lease",
    rentalStartDaysAgo: 120,
    rentalDurationDays: 365,
    dailyRate: 1200,
    deposit: 10000,
    division: "lease",
  },
  {
    customerName: "Mohammed Saleh",
    customerPhone: "+971 55 444 5555",
    imei: "864636064791391",
    plate: "AA81643",
    scenario: "Toyota Land Cruiser — active rental",
    rentalStartDaysAgo: 3,
    rentalDurationDays: 14,
    dailyRate: 550,
    deposit: 1500,
    division: "rent",
  },
  {
    customerName: "John Carter",
    customerPhone: "+1 305 555 0199",
    customerEmail: "john.carter@outlook.com",
    imei: "866069062187248",
    plate: "C94787",
    scenario: "Mercedes E-Class — due tomorrow",
    rentalStartDaysAgo: 6,
    rentalDurationDays: 7,
    dailyRate: 480,
    deposit: 1500,
    division: "rent",
  },
  {
    customerName: "Aisha Khalid",
    customerPhone: "+971 56 777 8888",
    imei: "864636064845775",
    plate: "BB42573",
    scenario: "Mercedes G63 — available, hot lead pending",
    rentalStartDaysAgo: 0,
    rentalDurationDays: 0,
    dailyRate: 1800,
    deposit: 5000,
    division: "rent",
  },
];

const INBOUND_MESSAGES = [
  {
    channel: "whatsapp",
    from: "+971 55 333 9999",
    customerName: "Кэролайн Хан",
    body: "Здравствуйте! Нужен кабриолет на 5-11 апреля, что есть из доступного? Бюджет до 600 AED/сутки. Спасибо!",
    status: "new",
  },
  {
    channel: "instagram",
    from: "@dubai_rentals_ua",
    customerName: "Dubai Rentals UA",
    body: "Hi, do you have G63 available next week? Need it for 3 days. Can you deliver to Dubai Marina?",
    status: "new",
  },
  {
    channel: "yango",
    from: "+971 50 222 4444",
    customerName: "Yango Lead #4821",
    body: "مرحباً، أريد استئجار سيارة لمدة شهر. ما هي العروض المتاحة؟",
    status: "new",
  },
  {
    channel: "facebook",
    from: "+971 55 666 1111",
    customerName: "Alex Petrov",
    body: "Привет! Есть ли Land Cruiser на май? Нужна на 2 недели для семьи. Какая цена за 14 дней?",
    status: "new",
  },
  {
    channel: "whatsapp",
    from: "+971 56 999 0000",
    customerName: "Fatima Al-Zahra",
    body: "Hello, I need a luxury car for a wedding on Friday. Do you have Rolls-Royce or Bentley available?",
    status: "classified",
    classification: { intent: "luxury rental inquiry", urgency: "high", language: "en", customer_segment: "retail", vehicle_class_hint: "ultra-luxury" },
  },
  {
    channel: "instagram",
    from: "@luxury_dxb",
    customerName: "Luxury DXB",
    body: "Hey! Looking for McLaren or Ferrari for a weekend shoot. 2 days max. What’s the damage? 🔥",
    status: "new",
  },
  {
    channel: "whatsapp",
    from: "+971 50 111 3333",
    customerName: "Sergey Volkov",
    body: "Добрый день! Нужен Patrol или Land Cruiser на 10 дней с 15 апреля. Есть ли скидка за долгосрок?",
    status: "new",
  },
  {
    channel: "yango",
    from: "+971 55 888 2222",
    customerName: "Yango Lead #5103",
    body: "Hi, my friend recommended TAKE Auto. I need a car for daily commute — something economical like Sonata or Accent. Monthly rate?",
    status: "new",
  },
];

async function main() {
  console.log("Seeding TAKE Auto narrative data…\n");

  const tenantRow = await db.select().from(tenant).where(eq(tenant.slug, TENANT_SLUG)).limit(1).then((r) => r[0] ?? null);
  if (!tenantRow) {
    console.error(`Tenant "${TENANT_SLUG}" not found. Run setup-takeauto-tenant.ts first.`);
    process.exit(1);
  }
  const tenantId = tenantRow.id;

  // ─── Vehicles (resolve by IMEI or plate, upsert if missing) ───────────────
  const allVehicles = await db.select().from(vehicle).where(eq(vehicle.tenantId, tenantId));
  const vehicleByImei = new Map(allVehicles.filter((v) => v.imei).map((v) => [v.imei!, v]));
  const vehicleByPlate = new Map(allVehicles.filter((v) => v.plate).map((v) => [v.plate, v]));

  const resolvedVehicles: Map<string, typeof vehicle.$inferSelect> = new Map();
  for (const a of ANCHORS) {
    let v = vehicleByImei.get(a.imei);
    if (!v && a.plate) v = vehicleByPlate.get(a.plate);
    if (!v) {
      // Upsert anchor vehicle so the demo works even without Pilot sync
      const existingByPlate = await db
        .select()
        .from(vehicle)
        .where(and(eq(vehicle.tenantId, tenantId), eq(vehicle.plate, a.plate)))
        .limit(1)
        .then((r) => r[0] ?? null);
      if (existingByPlate) {
        await db
          .update(vehicle)
          .set({ imei: a.imei, updatedAt: new Date() })
          .where(eq(vehicle.id, existingByPlate.id));
        v = { ...existingByPlate, imei: a.imei };
      } else {
        const inserted = await db
          .insert(vehicle)
          .values({
            tenantId,
            make: a.scenario.split(" — ")[0]?.split(" ").slice(0, -1).join(" ") ?? "Unknown",
            model: a.scenario.split(" — ")[0]?.split(" ").slice(-1)[0] ?? "",
            plate: a.plate,
            imei: a.imei,
            status: "available",
            gpsBlocked: a.scenario.includes("blocked"),
          })
          .returning();
        // .returning() types as any[] | QueryResult<never>; at runtime it is the row array.
        v = (Array.isArray(inserted) ? inserted : inserted.rows)[0];
      }
      console.log(`  ✓ Upserted anchor vehicle: ${a.plate}`);
    }
    resolvedVehicles.set(a.customerName, v);
  }

  // ─── Upsert customers ─────────────────────────────────────────────────────
  const customerMap = new Map<string, typeof customer.$inferSelect>();
  for (const a of ANCHORS) {
    const v = resolvedVehicles.get(a.customerName);
    if (!v) continue;

    let cust = await db
      .select()
      .from(customer)
      .where(and(eq(customer.tenantId, tenantId), eq(customer.phone, a.customerPhone)))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (cust) {
      await db
        .update(customer)
        .set({ name: a.customerName, email: a.customerEmail ?? cust.email, division: a.division ?? "rent", updatedAt: new Date() })
        .where(eq(customer.id, cust.id));
      cust = { ...cust, name: a.customerName, email: a.customerEmail ?? cust.email, division: a.division ?? "rent" };
    } else {
      const inserted = await db
        .insert(customer)
        .values({ tenantId, name: a.customerName, phone: a.customerPhone, email: a.customerEmail, division: a.division ?? "rent", source: "walk_in" })
        .returning();
      cust = (Array.isArray(inserted) ? inserted : inserted.rows)[0];
    }
    customerMap.set(a.customerName, cust);
    console.log(`  ✓ Customer: ${a.customerName}`);
  }

  // ─── Leads (5 active + some historical) ───────────────────────────────────
  const leadStatuses = ["new", "contacted", "qualified", "contacted", "new"] as const;
  const leadSources = ["whatsapp", "instagram", "yango", "facebook", "walk_in"] as const;
  const leadNames = [
    "Кэролайн Хан — Cabriolet inquiry",
    "Dubai Rentals UA — G63 weekly",
    "Yango Lead #4821 — Monthly rental AR",
    "Alex Petrov — Land Cruiser 2 weeks",
    "Fatima Al-Zahra — Wedding Rolls/Bentley",
  ];

  const leadMap = new Map<string, typeof lead.$inferSelect>();
  for (let i = 0; i < leadNames.length; i++) {
    const existing = await db
      .select()
      .from(lead)
      .where(and(eq(lead.tenantId, tenantId), eq(lead.phone, INBOUND_MESSAGES[i]?.from ?? "")))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (existing) {
      await db
        .update(lead)
        .set({ customerName: leadNames[i], status: leadStatuses[i], source: leadSources[i], updatedAt: new Date() })
        .where(eq(lead.id, existing.id));
      leadMap.set(leadNames[i], { ...existing, customerName: leadNames[i], status: leadStatuses[i], source: leadSources[i] });
    } else {
      const inserted = await db
        .insert(lead)
        .values({
          tenantId,
          customerName: leadNames[i],
          phone: INBOUND_MESSAGES[i]?.from ?? `+97150${i}000000`,
          status: leadStatuses[i],
          source: leadSources[i],
        })
        .returning();
      leadMap.set(leadNames[i], inserted[0]);
    }
    console.log(`  ✓ Lead: ${leadNames[i]}`);
  }

  // ─── Deals (4 historical: 3 won, 1 lost) ──────────────────────────────────
  const historicalDeals = [
    { ref: "TAC-2025-0891", type: "rent" as const, status: "won" as const, stage: "closed" as const, value: 12600, customerName: "Vikram Singh" },
    { ref: "TAC-2025-1022", type: "lease" as const, status: "won" as const, stage: "closed" as const, value: 54000, customerName: "Damac Properties LLC" },
    { ref: "TAC-2025-1103", type: "rent" as const, status: "lost" as const, stage: "closed" as const, value: 8400, customerName: "John Carter" },
    { ref: "TAC-2025-1156", type: "rent" as const, status: "won" as const, stage: "closed" as const, value: 9800, customerName: "Mohammed Saleh" },
  ];

  for (const d of historicalDeals) {
    const existing = await db
      .select()
      .from(deal)
      .where(and(eq(deal.tenantId, tenantId), eq(deal.ref, d.ref)))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!existing) {
      await db.insert(deal).values({ tenantId, ref: d.ref, type: d.type, status: d.status, stage: d.stage, value: d.value });
      console.log(`  ✓ Deal: ${d.ref} (${d.status})`);
    } else {
      console.log(`  ✓ Deal: ${d.ref} (already exists)`);
    }
  }

  // ─── Rentals (anchored to real vehicles) ──────────────────────────────────
  const now = new Date();
  for (const a of ANCHORS) {
    const cust = customerMap.get(a.customerName);
    const veh = resolvedVehicles.get(a.customerName);
    if (!cust || !veh) continue;

    // Skip rental for Aisha Khalid (available, hot lead pending)
    if (a.rentalDurationDays === 0) continue;

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - a.rentalStartDaysAgo);
    startDate.setHours(10, 0, 0, 0);

    const returnDate = new Date(startDate);
    returnDate.setDate(returnDate.getDate() + a.rentalDurationDays);
    returnDate.setHours(10, 0, 0, 0);

    const totalDays = a.rentalDurationDays;
    const total = a.dailyRate * totalDays;
    // Make Vikram overdue with balance due
    const balanceDue = a.customerName === "Vikram Singh" ? total + 2000 : 0;
    const status = a.customerName === "Vikram Singh" ? "active" : balanceDue > 0 ? "active" : "active";

    const existing = await db
      .select()
      .from(rental)
      .where(and(eq(rental.tenantId, tenantId), eq(rental.customerId, cust.id), eq(rental.vehicleId, veh.id)))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (existing) {
      await db
        .update(rental)
        .set({ startDate, returnDate, dailyRate: a.dailyRate, totalDays, total, deposit: a.deposit, balanceDue, status, updatedAt: new Date() })
        .where(eq(rental.id, existing.id));
    } else {
      await db.insert(rental).values({
        tenantId,
        customerId: cust.id,
        vehicleId: veh.id,
        startDate,
        returnDate,
        dailyRate: a.dailyRate,
        totalDays,
        total,
        deposit: a.deposit,
        balanceDue,
        status,
      });
    }
    console.log(`  ✓ Rental: ${a.customerName} → ${veh.plate} (${startDate.toISOString().slice(0, 10)} → ${returnDate.toISOString().slice(0, 10)})`);
  }

  // ─── Messages (8 inbound) ─────────────────────────────────────────────────
  for (const m of INBOUND_MESSAGES) {
    const existing = await db
      .select()
      .from(message)
      .where(and(eq(message.tenantId, tenantId), eq(message.body, m.body)))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!existing) {
      await db.insert(message).values({
        tenantId,
        channel: m.channel,
        from: m.from,
        customerName: m.customerName,
        body: m.body,
        status: m.status,
        classification: m.classification ?? null,
      });
      console.log(`  ✓ Message: ${m.customerName} (${m.channel})`);
    } else {
      console.log(`  ✓ Message: ${m.customerName} (already exists)`);
    }
  }

  // ─── Portal user for Vikram Singh ─────────────────────────────────────────
  const vikramEmail = "vikram.singh@takeauto.ae";
  let vikramUser = await db.select().from(user).where(eq(user.email, vikramEmail)).limit(1).then((r) => r[0] ?? null);
  if (!vikramUser) {
    const inserted = await db.insert(user).values({ email: vikramEmail, name: "Vikram Singh" }).returning();
    vikramUser = inserted[0];
  }

  // Generate magic link for Vikram
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    const rawToken = Array.from(crypto.randomBytes(32)).map((b) => ("0" + b.toString(16)).slice(-2)).join("");
    const hashedToken = crypto.createHash("sha256").update(`${rawToken}${secret}`).digest("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db
      .insert(verificationToken)
      .values({ identifier: vikramEmail, token: hashedToken, expires })
      .onConflictDoUpdate({
        target: [verificationToken.identifier, verificationToken.token],
        set: { expires },
      });
    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const vikramUrl = `${baseUrl}/api/auth/callback/email?callbackUrl=%2Fportal&token=${rawToken}&email=${encodeURIComponent(vikramEmail)}`;
    console.log(`  ✓ Portal magic link for Vikram Singh:`);
    console.log(`    ${vikramUrl}`);
  }

  console.log("\n✅ Narrative seed complete.\n");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

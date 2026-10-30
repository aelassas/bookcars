// Seed script for Rental Booster demo data.
// Creates vehicles, customers, and messages for the TAKE Auto tenant.

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/platform/db/client";
import { tenant, vehicle, customer, message } from "../src/platform/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  // Find TAKE Auto tenant
  const tenants = await db.select().from(tenant).where(eq(tenant.slug, "take-auto")).limit(1);
  if (!tenants[0]) {
    console.error("TAKE Auto tenant not found. Run hello-tenant first.");
    process.exit(1);
  }
  const tenantId = tenants[0].id;
  console.log(`Seeding for tenant ${tenantId} (take-auto)`);

  // ─── Vehicles ───────────────────────────────────────────────────────────
  const vehicleData = [
    { make: "Toyota", model: "Camry", year: 2022, plate: "A 12345", division: "rent" as const, status: "available" as const, dailyRate: 180, odometer: 45200, imei: "860000011111111" },
    { make: "BMW", model: "X5", year: 2023, plate: "B 67890", division: "rent" as const, status: "on_rent" as const, dailyRate: 450, odometer: 12800, imei: "860000022222222" },
    { make: "Mercedes", model: "C-Class", year: 2021, plate: "C 11111", division: "lease" as const, status: "available" as const, dailyRate: 0, odometer: 67300, imei: "860000033333333" },
    { make: "Nissan", model: "Altima", year: 2022, plate: "D 22222", division: "rent" as const, status: "in_service" as const, dailyRate: 140, odometer: 38900, imei: null },
    { make: "Ford", model: "Mustang", year: 2023, plate: "E 33333", division: "rent" as const, status: "available" as const, dailyRate: 550, odometer: 9100, imei: "860000044444444" },
  ];

  for (const v of vehicleData) {
    await db.insert(vehicle).values({ tenantId, ...v });
  }
  console.log(`✅ Seeded ${vehicleData.length} vehicles`);

  // ─── Customers ──────────────────────────────────────────────────────────
  const customerData = [
    { name: "Ahmed Al-Rashid", phone: "+971 50 123 4567", email: "ahmed@example.com", division: "rent" as const, source: "whatsapp" as const, notes: "Repeat customer, prefers sedans" },
    { name: "Maria Santos", phone: "+971 55 987 6543", email: "maria@example.com", division: "lease" as const, source: "instagram" as const, notes: "Looking for long-term lease" },
    { name: "John Davidson", phone: "+971 52 555 1212", email: "john@example.com", division: "rent" as const, source: "localrent" as const, notes: "Tourist, needs SUV for desert trip" },
    { name: "Fatima Hassan", phone: "+971 56 444 3333", email: null, division: "rent" as const, source: "walk_in" as const, notes: "Wedding event, wants luxury car" },
    { name: "Omar Khalil", phone: "+971 50 777 8888", email: "omar@example.com", division: "rent" as const, source: "yango" as const, notes: "Corporate account manager" },
  ];

  for (const c of customerData) {
    await db.insert(customer).values({ tenantId, ...c });
  }
  console.log(`✅ Seeded ${customerData.length} customers`);

  // ─── Messages ───────────────────────────────────────────────────────────
  const messageData = [
    { channel: "whatsapp" as const, from: "+971 50 123 4567", body: "Hello! I'd like to reserve a minivan for a road trip with friends. What's the process?", status: "new" as const, customerName: "Ahmed Al-Rashid" },
    { channel: "instagram" as const, from: "@maria_rentals", body: "Hey! I want to book a luxury car for a special event next week. What do you have available?", status: "new" as const, customerName: "Maria Santos" },
    { channel: "whatsapp" as const, from: "+971 52 555 1212", body: "Hi! My car shut down on Sheikh Zayed Road. The engine warning light is on. Please help!", status: "new" as const, customerName: "John Davidson" },
    { channel: "email" as const, from: "omar@example.com", body: "Good afternoon. I need to discuss our corporate rental agreement renewal and payment terms.", status: "new" as const, customerName: "Omar Khalil" },
    { channel: "facebook" as const, from: "Fatima Hassan", body: "Hi! I'm interested in renting a convertible for a day trip. Can you let me know the availability?", status: "new" as const, customerName: "Fatima Hassan" },
    { channel: "whatsapp" as const, from: "+971 50 999 0000", body: "I'd like to book an electric car for a weekend getaway. What are my choices?", status: "new" as const, customerName: null },
  ];

  for (const m of messageData) {
    await db.insert(message).values({ tenantId, ...m });
  }
  console.log(`✅ Seeded ${messageData.length} messages`);

  console.log("\n🎉 Rental Booster seed complete!");
  console.log("Visit: http://localhost:3000/takeauto/messages");
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});

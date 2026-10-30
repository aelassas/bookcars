import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq } from "drizzle-orm";
import { db, pool } from "@/platform/db/client";
import { tenant, vehicle } from "@/platform/db/schema";
import { priceTier } from "@/platform/db/rental-extras";

async function main() {
  const [rma] = await db.select().from(tenant).where(eq(tenant.slug, "rma")).limit(1);
  if (!rma) throw new Error("Tenant 'rma' not found");

  const vehicles = await db.select().from(vehicle).where(eq(vehicle.tenantId, rma.id));
  let seeded = 0;
  for (const item of vehicles) {
    if (item.dailyRate == null) continue;
    await db.delete(priceTier).where(and(
      eq(priceTier.tenantId, rma.id),
      eq(priceTier.vehicleId, item.id),
      eq(priceTier.channel, "b2c"),
    ));
    await db.insert(priceTier).values({
      tenantId: rma.id,
      vehicleId: item.id,
      channel: "b2c",
      minDays: 1,
      maxDays: null,
      dailyRate: item.dailyRate,
      deposit: 1500,
    });
    seeded++;
  }

  console.log(`Seeded ${seeded} B2C price tiers for RMA`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

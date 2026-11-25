import { db, pool } from "@/platform/db/client";
import { vehicle, rental, customer } from "@/platform/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const t = { id: "d7f4587b-ffc9-47aa-87e3-40fdb88e5ab5" };
  
  // Delete old rentals not tied to our anchor narrative
  const anchorPlates = ["J72928", "S48945", "BB79182", "H34165", "CC79078", "AA81643", "C94787", "BB42573"];
  
  // First find anchor vehicle IDs
  const anchorVehicles = await db.select().from(vehicle).where(eq(vehicle.tenantId, t.id));
  const anchorIds = anchorVehicles.filter(v => anchorPlates.includes(v.plate)).map(v => v.id);
  
  console.log("Anchor vehicle IDs:", anchorIds.length);
  
  // Delete rentals for non-anchor vehicles (like Ahmed Al-Rashid)
  const nonAnchorRentals = await db.select().from(rental).where(eq(rental.tenantId, t.id));
  let deletedRentals = 0;
  for (const r of nonAnchorRentals) {
    if (!anchorIds.includes(r.vehicleId)) {
      await db.delete(rental).where(eq(rental.id, r.id));
      deletedRentals++;
    }
  }
  console.log("Deleted non-anchor rentals:", deletedRentals);
  
  // Delete non-anchor customers (those without rentals now)
  const customersWithRentals = await db.select({ customerId: rental.customerId }).from(rental).where(eq(rental.tenantId, t.id));
  const customerIdsWithRentals = new Set(customersWithRentals.map(r => r.customerId));
  
  const allCustomers = await db.select().from(customer).where(eq(customer.tenantId, t.id));
  let deletedCustomers = 0;
  for (const c of allCustomers) {
    if (!customerIdsWithRentals.has(c.id) && !c.email?.includes("vikram.singh")) {
      await db.delete(customer).where(eq(customer.id, c.id));
      deletedCustomers++;
    }
  }
  console.log("Deleted orphan customers:", deletedCustomers);
  
  // Delete vehicles not in current Pilot fleet (keep only those with IMEI matching live fleet)
  const { getPilotClient } = await import("@/platform/integrations/pilot/client");
  const pilot = getPilotClient();
  const liveFleet = await pilot.getFleet();
  const liveImeis = new Set(liveFleet.map((v) => v.imei));
  
  const allVehicles = await db.select().from(vehicle).where(eq(vehicle.tenantId, t.id));
  let deletedVehicles = 0;
  for (const v of allVehicles) {
    if (v.imei && !liveImeis.has(v.imei)) {
      await db.delete(vehicle).where(eq(vehicle.id, v.id));
      deletedVehicles++;
    }
  }
  console.log("Deleted stale vehicles:", deletedVehicles);
  
  // Count remaining
  const [vc] = await db.select({ count: sql<number>`count(*)::int` }).from(vehicle).where(eq(vehicle.tenantId, t.id));
  console.log("Remaining vehicles:", vc.count);
  
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });

import { db, pool } from "@/platform/db/client";
import { vehicle, rental } from "@/platform/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const t = { id: "d7f4587b-ffc9-47aa-87e3-40fdb88e5ab5" };
  
  const { getPilotClient } = await import("@/platform/integrations/pilot/client");
  const pilot = getPilotClient();
  const liveFleet = await pilot.getFleet();
  const liveImeis = new Set(liveFleet.map((v) => v.imei));
  console.log("Live fleet IMEIs:", liveImeis.size);
  
  // Find vehicles with active rentals
  const rentals = await db.select({ vehicleId: rental.vehicleId }).from(rental).where(eq(rental.tenantId, t.id));
  const rentedVehicleIds = new Set(rentals.map(r => r.vehicleId));
  console.log("Rented vehicle IDs:", rentedVehicleIds.size);
  
  const allVehicles = await db.select().from(vehicle).where(eq(vehicle.tenantId, t.id));
  let deleted = 0;
  let kept = 0;
  
  for (const v of allVehicles) {
    const isLive = v.imei && liveImeis.has(v.imei);
    const hasRental = rentedVehicleIds.has(v.id);
    
    if (isLive || hasRental) {
      kept++;
    } else {
      await db.delete(vehicle).where(eq(vehicle.id, v.id));
      deleted++;
    }
  }
  
  console.log("Kept:", kept, "Deleted:", deleted);
  
  const [vc] = await db.select({ count: sql<number>`count(*)::int` }).from(vehicle).where(eq(vehicle.tenantId, t.id));
  console.log("Remaining vehicles:", vc.count);
  
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });

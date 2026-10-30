import { db, pool } from "@/platform/db/client";
import { vehicle, rental, customer } from "@/platform/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

async function main() {
  const t = { id: "d7f4587b-ffc9-47aa-87e3-40fdb88e5ab5" };

  for (const p of ["J72928", "S48945"]) {
    const rows = await db.select().from(vehicle).where(eq(vehicle.plate, p));
    const v = rows[0];
    if (v) console.log(p, "=>", v.make, v.model, "IMEI:", v.imei, "blocked:", v.gpsBlocked, "status:", v.status);
    else console.log(p, "=> NOT FOUND");
  }

  const [vc] = await db.select({ count: sql<number>`count(*)::int` }).from(vehicle).where(eq(vehicle.tenantId, t.id));
  console.log("Total vehicles:", vc.count);

  const [bc] = await db.select({ count: sql<number>`count(*)::int` }).from(vehicle).where(and(eq(vehicle.tenantId, t.id), eq(vehicle.gpsBlocked, true)));
  console.log("Blocked vehicles:", bc.count);

  const collections = await db.select({
    customerName: customer.name,
    vehiclePlate: vehicle.plate,
    balanceDue: rental.balanceDue,
    returnDate: rental.returnDate
  }).from(rental)
  .innerJoin(customer, eq(rental.customerId, customer.id))
  .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
  .where(and(eq(rental.tenantId, t.id), eq(rental.status, "active"), sql`${rental.balanceDue} > 0`, sql`${rental.returnDate} <= now()`));

  console.log("Collections:", collections.length);
  collections.forEach(r => console.log(" ", r.customerName, r.vehiclePlate, "AED", r.balanceDue, "returned", r.returnDate?.toISOString().slice(0,10)));

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const returns = await db.select({
    customerName: customer.name,
    vehiclePlate: vehicle.plate,
    returnDate: rental.returnDate
  }).from(rental)
  .innerJoin(customer, eq(rental.customerId, customer.id))
  .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
  .where(and(eq(rental.tenantId, t.id), eq(rental.status, "active"), gte(rental.returnDate, startOfDay), lte(rental.returnDate, endOfDay)));

  console.log("Returns today:", returns.length);
  returns.forEach(r => console.log(" ", r.customerName, r.vehiclePlate, "return", r.returnDate?.toISOString().slice(0,10)));

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });

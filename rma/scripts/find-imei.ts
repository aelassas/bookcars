import { db, pool } from "@/platform/db/client";
import { vehicle } from "@/platform/db/schema";
import { eq, like } from "drizzle-orm";

async function main() {
  const imeis = ["864275072451449", "864636068360243", "864636067481701", "864636062089715", "864275070018612", "864636064791391", "866069062187248", "864636064845775"];
  for (const imei of imeis) {
    const rows = await db.select().from(vehicle).where(eq(vehicle.imei, imei));
    if (rows[0]) {
      console.log(imei, "=>", rows[0].plate, rows[0].make, rows[0].model, "blocked:", rows[0].gpsBlocked, "status:", rows[0].status);
    } else {
      console.log(imei, "=> NOT FOUND");
    }
  }
  
  // Also search by plate patterns
  const plates = ["%72928%", "%48945%"];
  for (const p of plates) {
    const rows = await db.select().from(vehicle).where(like(vehicle.plate, p));
    rows.forEach(r => console.log("plate-like", p, "=>", r.plate, r.make, r.model, "IMEI:", r.imei));
  }
  
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });

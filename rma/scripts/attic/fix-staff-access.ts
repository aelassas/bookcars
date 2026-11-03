import { config } from "dotenv";
config({ path: ".env.local" });
import bcrypt from "bcryptjs";
import { db, pool } from "@/platform/db/client";
import { sql } from "drizzle-orm";

const PASS = process.argv[2];
if (!PASS) throw new Error("usage: fix-staff-access.ts <tempPassword>");

const STAFF = ["ayham@rental.ae", "babek@cardiwan.ae", "alisohielrent@gmail.com", "ab7abdullah@outlook.com"];
const RENTAL_TENANTS = ["cardiwan", "easyrent", "etm"];

async function main() {
  const hash = await bcrypt.hash(PASS, 10);
  for (const email of STAFF) {
    const r = await db.execute(sql`update "user" set password = ${hash} where lower(email) = ${email} returning id`);
    const id = (r as unknown as { rows: { id: string }[] }).rows[0]?.id;
    console.log(email, id ? "password set" : "NOT FOUND");
    if (!id) continue;
    for (const slug of RENTAL_TENANTS) {
      await db.execute(sql`
        insert into tenant_member (id, tenant_id, user_id, roles, created_at, updated_at, company_ids, cross_branch)
        select gen_random_uuid(), t.id, ${id}, ARRAY['sales']::text[], now(), now(), ARRAY[]::uuid[], false
        from tenant t where t.slug = ${slug}
        on conflict do nothing`);
    }
    console.log(email, "memberships ensured");
  }
  const check = await db.execute(sql`
    select u.email, t.slug from "user" u
    join tenant_member tm on tm.user_id = u.id
    join tenant t on t.id = tm.tenant_id
    where lower(u.email) = any(ARRAY['ayham@rental.ae','babek@cardiwan.ae','alisohielrent@gmail.com','ab7abdullah@outlook.com'])
    order by 1, 2`);
  console.table((check as unknown as { rows: unknown[] }).rows);
}
main().finally(() => pool.end());

// Create the non-BYPASSRLS application role used to actually ENFORCE RLS
// at runtime (see src/platform/tenancy/rls.ts + DB_APP_ROLE).
//
//   npx tsx scripts/create-app-role.ts        (or: npm run db:app-role)
//
// Idempotent. Run as the DB owner (the default DATABASE_URL). The app keeps
// connecting as the owner and does `SET LOCAL ROLE` per tenant transaction,
// so no second password/secret is needed. To enforce, set
// DB_APP_ROLE=<role> in the app env.

import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { ensureAppRole } from "../src/platform/db/app-role";

const ROLE = process.env.DB_APP_ROLE?.trim() || "app_runtime";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const c = await pool.connect();
  try {
    await ensureAppRole(c, ROLE);
    const [{ rolbypassrls }] = (
      await c.query(`SELECT rolbypassrls FROM pg_roles WHERE rolname = '${ROLE}'`)
    ).rows;
    console.log(`[create-app-role] role "${ROLE}" ready. bypassrls=${rolbypassrls}`);
    console.log(`[create-app-role] set DB_APP_ROLE=${ROLE} in the app env to enforce RLS at runtime.`);
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[create-app-role] failed:", e.message);
  process.exit(1);
});

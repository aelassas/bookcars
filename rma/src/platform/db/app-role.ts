import type { PoolClient } from "pg";

// Idempotently ensure a non-BYPASSRLS application role exists with the
// privileges needed to run tenant DML under enforced RLS. Run as the DB
// owner. NOLOGIN: the app keeps connecting as the owner and does
// `SET LOCAL ROLE` per tenant transaction (no second secret needed).
export async function ensureAppRole(c: PoolClient, role: string): Promise<void> {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(role)) {
    throw new Error(`Invalid role name: ${role}`);
  }
  // NOBYPASSRLS is the default at CREATE and needs no superuser. We avoid
  // ALTER ROLE on the bypass/super attributes because managed Postgres
  // owners (e.g. Neon's neondb_owner) aren't superusers and can't alter
  // them. A role created here therefore never bypasses RLS.
  await c.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
        CREATE ROLE "${role}" NOLOGIN NOBYPASSRLS;
      END IF;
    END $$;
  `);
  await c.query(`GRANT "${role}" TO CURRENT_USER`);
  await c.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);
  await c.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${role}"`);
  await c.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${role}"`);
  await c.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${role}"`
  );
  await c.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "${role}"`
  );
}

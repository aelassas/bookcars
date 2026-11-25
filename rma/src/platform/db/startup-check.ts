import { sql } from "drizzle-orm";
import { db } from "./client";

// ADR-001 v2 §6.3 + ADR-002 §2 layer 2.
// Boot-time guard. Refuses to start the app if any table with a
// tenant_id column lacks the RLS triad: ENABLE + FORCE + a policy named
// <table>_tenant_isolation. Catches anything that slipped past the
// tenantTable() helper (raw-SQL migrations, manual psql debugging,
// etc.). Failure is loud and immediate.
//
// Cost: one query, ~50ms at boot. Worth it.

interface RlsRow {
  table_name: string;
  rls_enabled: boolean;
  rls_forced: boolean;
  has_isolation_policy: boolean;
}

export async function verifyRlsAtBoot(): Promise<void> {
  const result = await db.execute(sql`
    SELECT
      c.relname                                          AS table_name,
      c.relrowsecurity                                   AS rls_enabled,
      c.relforcerowsecurity                              AS rls_forced,
      EXISTS (
        SELECT 1
        FROM pg_policies p
        WHERE p.tablename  = c.relname
          AND p.policyname = c.relname || '_tenant_isolation'
      )                                                  AS has_isolation_policy
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind  = 'r'
      AND n.nspname  = 'public'
      AND EXISTS (
        SELECT 1
        FROM pg_attribute a
        WHERE a.attrelid    = c.oid
          AND a.attname     = 'tenant_id'
          AND NOT a.attisdropped
      )
  `);

  // node-postgres returns { rows }; some Drizzle drivers return the
  // array directly. Normalise.
  const rows: RlsRow[] = Array.isArray(result)
    ? (result as unknown as RlsRow[])
    : ((result as unknown as { rows: RlsRow[] }).rows ?? []);

  const violations: string[] = [];
  for (const row of rows) {
    if (!row.rls_enabled) {
      violations.push(`  - ${row.table_name}: RLS not enabled`);
    }
    if (!row.rls_forced) {
      violations.push(
        `  - ${row.table_name}: RLS not FORCEd (run scripts/tighten-rls.sql)`,
      );
    }
    if (!row.has_isolation_policy) {
      violations.push(
        `  - ${row.table_name}: missing ${row.table_name}_tenant_isolation policy`,
      );
    }
  }

  if (violations.length > 0) {
    throw new Error(
      [
        "[startup-check] RLS violations on tenant-scoped tables — refusing to start.",
        "Fix by declaring the table via tenantTable() (see ADR-002).",
        "",
        ...violations,
      ].join("\n"),
    );
  }
}

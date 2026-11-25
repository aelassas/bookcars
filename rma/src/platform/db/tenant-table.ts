import { pgTable, pgPolicy, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ADR-002 §3. Tenant-isolation predicate matching ADR-001 v2 §6.2 exactly.
const TENANT_PREDICATE = sql`tenant_id = current_setting('app.tenant_id', true)::uuid`;

// Company/brand scoping predicate (defense-in-depth on top of tenant RLS and
// the query-layer companyScope() helper). Declared RESTRICTIVE so it is ANDed
// with the permissive tenant policy. GUCs are set per-transaction in
// withTenant/withDrizzleTenant from the signed-in user's scope:
//   app.is_cross    'on' for cross-brand users (security/owner) → see all
//   app.company_ids comma-separated UUIDs the user may see; '' (or unset) =
//                   unscoped (system/jobs/admin) → no restriction (no regression)
// A NULL company_id row stays visible (legacy/unassigned rows fall back to
// tenant isolation only).
const COMPANY_PREDICATE = sql`(
  coalesce(current_setting('app.is_cross', true), 'off') = 'on'
  OR coalesce(current_setting('app.company_ids', true), '') = ''
  OR company_id IS NULL
  OR company_id = ANY (string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
)`;

/**
 * Declare a tenant-scoped table with RLS enforced by default.
 *
 * In one declaration you get:
 *   - The table
 *   - RLS enabled
 *   - The canonical tenant-isolation policy (USING + WITH CHECK)
 *   - An index on tenant_id
 *   - (opt-in) the company/brand-scope policy, for tables with a company_id
 *     column — set opts.companyScoped = true.
 *
 * FORCE ROW LEVEL SECURITY is applied post-migration by
 * platform/scripts/tighten-rls.sql. The boot guard verifies it.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function tenantTable(
  name: string,
  columns: any,
  extras?: any,
  opts?: { companyScoped?: boolean },
) {
  return (pgTable as any)(
    name,
    columns,
    (t: any) => [
      pgPolicy(`${name}_tenant_isolation`, {
        as: "permissive",
        for: "all",
        using: TENANT_PREDICATE,
        withCheck: TENANT_PREDICATE,
      }),
      ...(opts?.companyScoped
        ? [
            pgPolicy(`${name}_company_scope`, {
              as: "restrictive",
              for: "all",
              using: COMPANY_PREDICATE,
              withCheck: COMPANY_PREDICATE,
            }),
          ]
        : []),
      index(`${name}_tenant_id_idx`).on(t.tenantId),
      ...(extras?.(t) ?? []),
    ],
  ).enableRLS();
}

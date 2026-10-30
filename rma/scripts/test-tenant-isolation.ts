// Tenant isolation test — the one that closes the existential multi-tenant
// risk: prove tenant A cannot read or write tenant B's rows under ENFORCED
// RLS (i.e. running as the non-BYPASSRLS app role, not the owner).
//
//   npx tsx scripts/test-tenant-isolation.ts     (or: npm run test:isolation)
//
// Self-contained: creates two throwaway tenants + a customer in each (as
// owner), runs the checks as the app role via SET LOCAL ROLE, then cleans
// up. Exits non-zero on any failure so it can gate CI.

import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { ensureAppRole } from "../src/platform/db/app-role";

const ROLE = process.env.DB_APP_ROLE?.trim() || "app_runtime";
const SLUG_A = "__iso_test_a__";
const SLUG_B = "__iso_test_b__";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "  ✓" : "  ✗ FAIL"} ${label}`);
  if (!ok) failures++;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const c = await pool.connect();
  try {
    await ensureAppRole(c, ROLE);
    await cleanup(c); // remove leftovers from a prior aborted run

    // --- Seed two tenants + one customer each (as owner; bypass) ---
    const a = (
      await c.query(`INSERT INTO tenant (slug, name) VALUES ($1,$2) RETURNING id`, [SLUG_A, "Iso Test A"])
    ).rows[0].id as string;
    const b = (
      await c.query(`INSERT INTO tenant (slug, name) VALUES ($1,$2) RETURNING id`, [SLUG_B, "Iso Test B"])
    ).rows[0].id as string;
    await c.query(`INSERT INTO customer (tenant_id, name) VALUES ($1,$2)`, [a, "A-customer"]);
    await c.query(`INSERT INTO customer (tenant_id, name) VALUES ($1,$2)`, [b, "B-customer"]);

    console.log(`\nRole under test: "${ROLE}"`);
    const bypass = (await c.query(`SELECT rolbypassrls FROM pg_roles WHERE rolname=$1`, [ROLE])).rows[0]?.rolbypassrls;
    check(`app role does NOT bypass RLS (rolbypassrls=false)`, bypass === false);

    // --- 1. Tenant A context sees only A's customer ---
    await c.query("BEGIN");
    await c.query(`SET LOCAL ROLE "${ROLE}"`);
    await c.query(`SET LOCAL app.tenant_id = '${a}'`);
    const seenByA = await c.query(
      `SELECT name FROM customer WHERE name IN ('A-customer','B-customer')`
    );
    await c.query("COMMIT");
    check(
      "tenant A sees its own customer and NOT tenant B's",
      seenByA.rows.length === 1 && seenByA.rows[0].name === "A-customer"
    );

    // --- 2. No tenant context => zero rows (fail-closed) ---
    // Use a fresh connection so app.tenant_id is truly unset (NULL). On a
    // reused connection a prior SET leaves it as '' and the policy's
    // ''::uuid cast errors instead — also safe (fails closed), but NULL is
    // the clean demonstration.
    const fresh = await pool.connect();
    let noCtxOk = false;
    try {
      await fresh.query("BEGIN");
      await fresh.query(`SET LOCAL ROLE "${ROLE}"`);
      const noCtx = await fresh.query(`SELECT count(*)::int n FROM customer`);
      await fresh.query("COMMIT");
      noCtxOk = noCtx.rows[0].n === 0;
    } catch {
      // policy error on missing context is also fail-closed → acceptable
      await fresh.query("ROLLBACK").catch(() => {});
      noCtxOk = true;
    } finally {
      fresh.release();
    }
    check("no app.tenant_id set => 0 rows visible (fail-closed)", noCtxOk);

    // --- 3. Cross-tenant WRITE is rejected (WITH CHECK) ---
    let writeBlocked = false;
    await c.query("BEGIN");
    try {
      await c.query(`SET LOCAL ROLE "${ROLE}"`);
      await c.query(`SET LOCAL app.tenant_id = '${a}'`);
      await c.query(`INSERT INTO customer (tenant_id, name) VALUES ('${b}', 'cross-write')`);
    } catch {
      writeBlocked = true;
    } finally {
      await c.query("ROLLBACK");
    }
    check("tenant A cannot INSERT a row for tenant B (RLS WITH CHECK)", writeBlocked);

    // --- 4. Cross-tenant UPDATE cannot touch B's rows ---
    await c.query("BEGIN");
    await c.query(`SET LOCAL ROLE "${ROLE}"`);
    await c.query(`SET LOCAL app.tenant_id = '${a}'`);
    const upd = await c.query(`UPDATE customer SET name='hacked' WHERE name='B-customer'`);
    await c.query("COMMIT");
    check("tenant A cannot UPDATE tenant B's rows (0 affected)", upd.rowCount === 0);

    // --- 5. Control: owner (bypass) DOES see both — proves the role matters ---
    await c.query("BEGIN");
    await c.query(`SET LOCAL app.tenant_id = '${a}'`);
    const ownerSees = await c.query(
      `SELECT count(*)::int n FROM customer WHERE name IN ('A-customer','B-customer')`
    );
    await c.query("COMMIT");
    check(
      "control: owner connection bypasses RLS and sees both (why DB_APP_ROLE is required in prod)",
      ownerSees.rows[0].n === 2
    );
  } finally {
    await cleanup(c).catch(() => {});
    c.release();
    await pool.end();
  }

  console.log(
    failures === 0
      ? `\n✅ TENANT ISOLATION: PASS (${ROLE} enforces RLS)`
      : `\n❌ TENANT ISOLATION: ${failures} FAILURE(S)`
  );
  process.exit(failures === 0 ? 0 : 1);
}

async function cleanup(c: import("pg").PoolClient) {
  const ids = (
    await c.query(`SELECT id FROM tenant WHERE slug IN ($1,$2)`, [SLUG_A, SLUG_B])
  ).rows.map((r) => r.id as string);
  if (ids.length) {
    await c.query(`DELETE FROM customer WHERE tenant_id = ANY($1::uuid[])`, [ids]);
    await c.query(`DELETE FROM tenant WHERE id = ANY($1::uuid[])`, [ids]);
  }
}

main().catch((e) => {
  console.error("[test-tenant-isolation] error:", e.message);
  process.exit(1);
});

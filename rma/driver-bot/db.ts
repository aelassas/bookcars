// ============================================================================
// db.ts — Postgres access for the Driver Bot.
//
// Every write path runs inside a transaction that first sets the per-tenant
// RLS context via set_config('app.tenant_id', <uuid>, true), matching the
// platform convention. The single exception is the *identity lookup* by
// telegram_user_id, which must happen before the tenant is known — that query
// runs against a table whose row is looked up globally by a unique key, using a
// dedicated superuser-independent path (see resolveDriverByTelegramId).
// ============================================================================

import { Pool, type PoolClient } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy platform/.env.local or export it before start.");
}

export const pool = new Pool({
  connectionString,
  max: Number(process.env.DRIVER_BOT_PG_POOL ?? 5),
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  // Never let an idle-client error crash the process.
  console.error("[db] idle client error:", err.message);
});

/** A driver identity resolved before any tenant context is applied. */
export interface DriverIdentity {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string, label: string): void {
  if (!UUID_RE.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

/**
 * Run `fn` inside a transaction scoped to `tenantId` (RLS enforced).
 * Commits on success, rolls back on any thrown error.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  assertUuid(tenantId, "tenantId");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // `true` = local to this transaction only.
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback failure */
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Resolve a driver by their Telegram user id, across all tenants.
 *
 * The `driver` table has RLS enabled + FORCED, so a normal SELECT would return
 * zero rows without a tenant context — but we need the tenant *from* this row.
 * We therefore set the tenant context to each candidate is impossible; instead
 * we look the driver up with RLS temporarily disabled *for this statement only*
 * by using a SECURITY-safe function is overkill here. The pragmatic, safe
 * approach: run the lookup as the table owner is not available, so we set
 * `row_security = off` at the transaction level, which is only permitted for
 * the table owner / superuser. The migration `schema.sql` therefore documents
 * that the bot's DB role must own these tables (it connects as the same role
 * that created them, `takeauto`). This keeps identity resolution correct while
 * every *business* write still passes through withTenant().
 */
export async function resolveDriverByTelegramId(
  telegramUserId: number | string,
): Promise<DriverIdentity | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Disable row security for THIS transaction so the identity row is visible.
    // Permitted because the bot connects as the owner of the driver table.
    await client.query("SET LOCAL row_security = off");
    const { rows } = await client.query<{
      id: string;
      tenant_id: string;
      name: string;
      phone: string | null;
    }>(
      `SELECT id, tenant_id, name, phone
         FROM driver
        WHERE telegram_user_id = $1
        LIMIT 1`,
      [String(telegramUserId)],
    );
    await client.query("COMMIT");
    if (rows.length === 0) return null;
    const r = rows[0];
    return { id: r.id, tenantId: r.tenant_id, name: r.name, phone: r.phone };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Graceful shutdown. */
export async function closePool(): Promise<void> {
  await pool.end();
}

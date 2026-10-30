import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { log } from "../log";

/** Positive integer from env, else the default. */
function poolInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// Budget the connections explicitly: this pool, the classify-inbox worker pool
// and pg-boss all share ONE Postgres connection cap. pg's default (max 10,
// idleTimeoutMillis 10s, NO connect timeout) means a saturated server makes
// `pool.connect()` hang forever instead of failing fast.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: poolInt("DB_POOL_MAX", 10),
  idleTimeoutMillis: poolInt("DB_POOL_IDLE_MS", 30_000),
  connectionTimeoutMillis: poolInt("DB_POOL_CONNECT_TIMEOUT_MS", 10_000),
});

// CRITICAL: pg emits 'error' on IDLE clients (network blip, failover, server
// closing the connection). An EventEmitter 'error' with no listener is an
// UNCAUGHT EXCEPTION — it would kill the process and every in-flight job.
// pg has already removed the broken client from the pool by the time this
// fires, so logging is the correct response.
pool.on("error", (err) => {
  log.error("postgres idle client error", { pool: "app", err });
});

export const db = drizzle(pool, { schema });
export { pool };

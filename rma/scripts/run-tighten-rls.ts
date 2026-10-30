// ADR-002 ancillary script runner.
// Applies FORCE ROW LEVEL SECURITY to every table that has RLS enabled
// but is not yet FORCEd. Runs after drizzle-kit migrate.
// Uses the app's pg pool so psql is not required.

import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const sqlPath = resolve(dirname(import.meta.filename), "tighten-rls.sql");
  const sql = readFileSync(sqlPath, "utf-8");
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("[tighten-rls] FORCE RLS applied where needed.");
  } finally {
    client.release();
  }
  await pool.end();
}

main().catch((e) => {
  console.error("[tighten-rls] Failed:", e.message);
  process.exit(1);
});

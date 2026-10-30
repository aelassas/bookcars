import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Connected to Neon ✅");

    const extensions = [
      "uuid-ossp",
      "pg_trgm",
      "unaccent",
      "vector",
    ];

    for (const ext of extensions) {
      try {
        await client.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
        console.log(`Extension ${ext} ready ✅`);
      } catch (e) {
        console.error(`Extension ${ext} failed ❌`, e instanceof Error ? e.message : String(e));
      }
    }

    // PostGIS may not be available on Neon free tier — try anyway
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
      console.log("Extension postgis ready ✅");
    } catch (e) {
      console.error("Extension postgis failed ❌", e instanceof Error ? e.message : String(e));
    }

    // pg_cron is usually not available on managed Postgres — we will use pg-boss instead
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS pg_cron`);
      console.log("Extension pg_cron ready ✅");
    } catch {
      console.log("Extension pg_cron not available (expected on managed Postgres) ⚠️");
    }

    const { rows } = await client.query("SELECT version()");
    console.log("Postgres version:", rows[0].version);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

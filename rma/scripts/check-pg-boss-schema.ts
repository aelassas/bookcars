import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const { rows } = await client.query(
    "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'pgboss'"
  );
  console.log("pgboss tables:", rows.map((r) => `${r.schemaname}.${r.tablename}`));
  client.release();
  await pool.end();
}

main().catch(console.error);

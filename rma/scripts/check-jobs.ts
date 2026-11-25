import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const { rows } = await client.query(
    "SELECT name, state, created_on, completed_on FROM pgboss.job WHERE name = 'hello-tenant-job' ORDER BY created_on DESC LIMIT 5"
  );
  console.log(rows);
  client.release();
  await pool.end();
}

main().catch(console.error);

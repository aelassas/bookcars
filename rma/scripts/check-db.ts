import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const { rows: tables } = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log("Tables:", tables.map((r) => r.tablename));

    const { rows: rls } = await client.query(
      "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true"
    );
    console.log("RLS enabled:", rls.map((r) => r.tablename));

    const { rows: policies } = await client.query(
      "SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'"
    );
    console.log("Policies:", policies.map((p) => `${p.tablename}.${p.policyname}`));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

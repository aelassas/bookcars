// TEMP probe — why didn't the instagram threads create cards? Pure functions
// of the relay itself, read-only. Delete after use.
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { sql } from "drizzle-orm";
import {
  buildThreads,
  qualifyThreadBySignals,
} from "@/platform/integrations/twenty/wa-lead-relay";

async function main() {
  const TENANT = "0db0bf76-e078-445d-a8f8-506f5edfd06d"; // take-auto
  const res = await db.execute(sql`
    SELECT id, channel, "from", from_pn, "to", customer_name, body, media_path, external_message_id, created_at
      FROM message
     WHERE tenant_id = ${TENANT}
       AND direction = 'inbound'
       AND channel = 'instagram'
       AND created_at > now() - interval '6 hours'
     ORDER BY created_at ASC`);
  const rows: any[] = (res as any).rows ?? (res as any);
  const mapped = rows.map((r: any) => ({
    id: r.id,
    channel: r.channel,
    from: r.from,
    fromPn: r.from_pn,
    to: r.to,
    customerName: r.customer_name,
    body: r.body,
    mediaPath: r.media_path,
    externalId: r.external_message_id,
    createdAt: new Date(r.created_at),
  }));
  console.log("rows:", mapped.length);
  const { threads, skippedNoKey } = buildThreads(mapped as any);
  console.log("threads:", threads.size, "skippedNoKey:", skippedNoKey);
  for (const [key, t] of threads as Map<string, any>) {
    const sig = qualifyThreadBySignals(t);
    console.log(
      JSON.stringify({
        key,
        channel: t.channel,
        lines: t.lines.map((l: any) => (l.body ?? "").slice(0, 50)),
        sig,
      })
    );
  }
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("PROBE ERROR", e);
    await pool.end();
    process.exit(1);
  });

// Backfill params.recordingUrl on callgear integration_event rows whose
// webhook payload arrived without one (CallGear attaches the recording link
// only when it is ready at notification time — some call.finished payloads
// never carry it). The call transcriber's eligibility gate is exactly
// "done event with a non-empty params.recordingUrl", so one updated row is
// all it takes for the normal pipeline (download → whisper → AI note →
// Twenty) to pick the call up on its next pass.
//
// DRY-RUN BY DEFAULT; --commit to write.
//
// Usage (from platform/):
//   npx tsx scripts/backfill-callgear-recordings.ts                 # dry-run
//   npx tsx scripts/backfill-callgear-recordings.ts --commit        # write
//   npx tsx scripts/backfill-callgear-recordings.ts 207885701 --commit
//
// Env:
//   BACKFILL_DAYS       how far back to look, default 14
//   DATABASE_URL, CALLGEAR_API_KEY, CALLGEAR_BASE_URL as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { db, pool } from "@/platform/db/client";
import { getCallGearClient } from "@/platform/integrations/callgear/client";

const DAYS = Number(process.env.BACKFILL_DAYS ?? 14) || 14;
const COMMIT = process.argv.includes("--commit");
const onlyCallIds = process.argv.slice(2).filter((a) => !a.startsWith("-"));

type Row = { id: string; provider_event_id: string };

async function main() {
  const client = getCallGearClient();
  console.log(
    `[backfill-recordings] mode=${COMMIT ? "COMMIT" : "dry-run"} client=${client.mode} days=${DAYS}` +
      (onlyCallIds.length ? ` calls=${onlyCallIds.join(",")}` : "")
  );
  if (client.mode !== "live") {
    console.warn("[backfill-recordings] CALLGEAR_API_KEY not set — mock client would invent URLs; aborting");
    process.exit(1);
  }

  const rows = await db.execute<Row>(sql`
    SELECT id, provider_event_id
    FROM integration_event
    WHERE provider = 'callgear'
      AND processing_status = 'done'
      AND coalesce(raw_payload #>> '{params,recordingUrl}', '') = ''
      AND received_at >= now() - make_interval(days => ${DAYS})
      ${onlyCallIds.length ? sql`AND provider_event_id = ANY(${onlyCallIds})` : sql``}
    ORDER BY received_at DESC
  `);
  const events: Row[] = Array.isArray(rows) ? rows : (rows as unknown as { rows: Row[] }).rows;
  console.log(`[backfill-recordings] ${events.length} event(s) missing recordingUrl`);

  let filled = 0;
  let noRecording = 0;
  for (const ev of events) {
    const url = await client.fetchRecordingUrl(ev.provider_event_id);
    if (!url) {
      console.log(`  ${ev.provider_event_id}: no recording available from CallGear`);
      noRecording++;
      continue;
    }
    console.log(`  ${ev.provider_event_id}: ${url}`);
    if (COMMIT) {
      await db.execute(sql`
        UPDATE integration_event
        SET raw_payload = jsonb_set(raw_payload, '{params,recordingUrl}', to_jsonb(${url}::text))
        WHERE id = ${ev.id}
      `);
    }
    filled++;
  }
  console.log(
    `[backfill-recordings] filled=${filled} noRecording=${noRecording}${COMMIT ? "" : " (dry-run — nothing written)"}`
  );
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });

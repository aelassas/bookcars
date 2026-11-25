/** Scheduled runner: refresh the Board from recent inbound messages (skips up-to-date threads). */
import { config } from "dotenv";
config({ path: ".env.local" });
import type { Job } from "pg-boss";
(async () => {
  process.env.BOARD_LOOKBACK_HOURS = process.env.BOARD_LOOKBACK_HOURS ?? "720";
  process.env.BOARD_MAX_THREADS = process.env.BOARD_MAX_THREADS ?? "200";
  const { default: classifyInbox } = await import("@/platform/jobs/classify-inbox");
  // The worker only reads job.id — a stub job stands in for a real pg-boss job here.
  await classifyInbox({ id: "scheduled" } as Job<Record<string, unknown>>);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });

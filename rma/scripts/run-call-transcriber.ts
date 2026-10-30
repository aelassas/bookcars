// Call-recording transcriber runner (pm2-friendly CLI, same shape as
// run-callgear-twenty-relay.ts / run-ai-resolver.ts).
//
// Polls integration_event for relayed (done) callgear events with a
// recordingUrl and runs the download → mlx_whisper → local-model analysis →
// Twenty note pipeline (src/platform/integrations/callgear/transcriber.ts)
// against each tenant's OWN Twenty deployment (sales :3001 / rental :3002 —
// routing comes from twentyInstanceForTenantSlug, never a shared client).
// All decision logic lives in the transcriber module; this file is only
// wiring: env, per-tenant routing resolution, the poll loop, signal handling.
//
// DRY-RUN BY DEFAULT — the full read path runs (download, whisper, analysis,
// note planning) but NOTHING is written to the platform DB or to Twenty
// until --commit is passed.
//
// Usage (from platform/):
//   npx tsx scripts/run-call-transcriber.ts                     # poll forever, dry-run
//   npx tsx scripts/run-call-transcriber.ts --once              # single dry-run pass
//   npx tsx scripts/run-call-transcriber.ts --once --commit     # single LIVE pass
//   npx tsx scripts/run-call-transcriber.ts take-auto --commit  # one tenant only
//
// Env:
//   CALL_TRANSCRIBER_POLL_MS         poll interval, default 120000
//   CALL_TRANSCRIBER_BATCH           calls per pass, default 5 (whisper is heavy)
//   CALL_TRANSCRIBER_RECORDINGS_DIR  recording cache root,
//                                    default /Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/recordings
//   CALL_TRANSCRIBER_PYTHON          python with mlx_whisper, default python3
//   CALL_PING_MAP                    "slug:ownerKey[,slug:ownerKey…]" — once a
//                                    call card carries its summary, WhatsApp it
//                                    to that manager via the notify pipeline
//                                    (needs NOTIFY_WA_PHONE_<KEY> + allowlist).
//   DATABASE_URL, TWENTY_BASE_URL, TWENTY_API_KEY, TWENTY_RENTAL_* as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  twentyInstanceForTenantSlug,
  type TwentyInstanceKey,
} from "@/platform/integrations/twenty/instance";
import { buildNoteTitleIndex } from "@/platform/integrations/twenty/mirror";
import { createDeepseekCompleter } from "@/platform/ai/resolver";
import {
  createDrizzleTranscriberStore,
  createFetchDownloader,
  createMlxWhisperRunner,
  createTranscriberCompleter,
  createTwentyTranscriber,
  runTranscriberPass,
  type CardStampedPing,
  type RoutedTenant,
} from "@/platform/integrations/callgear/transcriber";
import { sendNotification } from "@/modules/notify/send";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const POLL_MS = envInt("CALL_TRANSCRIBER_POLL_MS", 120_000);
const BATCH = envInt("CALL_TRANSCRIBER_BATCH", 5);
const RECORDINGS_DIR =
  process.env.CALL_TRANSCRIBER_RECORDINGS_DIR?.trim() ||
  "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/recordings";
const PYTHON_BIN = process.env.CALL_TRANSCRIBER_PYTHON?.trim() || "python3";
const ONCE = process.argv.includes("--once");
const COMMIT = process.argv.includes("--commit");
const requestedSlugs = process.argv.slice(2).filter((a) => !a.startsWith("-"));

// tenant slug → owner key for the post-summary manager ping. Empty = off.
const CALL_PING_MAP = new Map<string, string>(
  (process.env.CALL_PING_MAP ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => pair.split(":").map((x) => x.trim()) as [string, string])
    .filter(([slug, key]) => Boolean(slug) && Boolean(key))
);

function buildCardPing(): ((input: CardStampedPing) => Promise<void>) | undefined {
  if (CALL_PING_MAP.size === 0) return undefined;
  return async ({ tenantId, tenantSlug, callId, params, summary }) => {
    const ownerKey = tenantSlug ? CALL_PING_MAP.get(tenantSlug) : undefined;
    if (!ownerKey) return; // this brand's calls ping nobody
    const who = params?.from?.trim() || "unknown caller";
    const answered = Number(params?.duration) > 0;
    const dur = Number.isFinite(Number(params?.duration)) ? ` · ${Number(params?.duration)}s` : "";
    const res = await sendNotification(tenantId, {
      kind: "call_summary",
      target: { ownerKey },
      text: `📞 ${answered ? "Answered" : "Missed"} call ${who}${dur}\n\n${summary}`,
      dedupeKey: `call-summary:${callId}`,
      entityType: "call",
      entityId: callId,
    });
    if (res.outcome !== "sent") {
      console.log(`[call-transcriber] call ping ${callId} → ${res.outcome}`);
    }
  };
}

async function resolveRoutedTenants(): Promise<RoutedTenant[]> {
  const tenants = await db.select({ id: tenant.id, slug: tenant.slug }).from(tenant);
  const targets = requestedSlugs.length > 0 ? tenants.filter((t) => requestedSlugs.includes(t.slug)) : tenants;

  // Note-title indexes are per Twenty INSTANCE, built once per pass and
  // shared by the tenants routed to it (the metadata crawl is paginated and
  // rate-limited — never per event).
  const noteTitlesByInstance = new Map<TwentyInstanceKey, Set<string>>();
  const routed: RoutedTenant[] = [];

  for (const t of targets) {
    const key = twentyInstanceForTenantSlug(t.slug);
    // An unconfigured instance must SAY so — falling back to the other
    // deployment's key would write one brand's notes into the other's
    // workspace (the leak the two-deployment split exists to prevent).
    if (!resolveTwentyInstance(key).configured) {
      console.warn(`[call-transcriber] ${t.slug}: instance '${key}' has no API key — skipped`);
      continue;
    }
    // No local model configured → no pass. Never a hardcoded endpoint.
    const complete = await createTranscriberCompleter(t.id);
    if (!complete) {
      console.warn(`[call-transcriber] ${t.slug}: no local AI provider configured — skipped`);
      continue;
    }
    let noteTitles = noteTitlesByInstance.get(key);
    if (!noteTitles) {
      noteTitles = await buildNoteTitleIndex(getTwentyClientForInstance(key));
      noteTitlesByInstance.set(key, noteTitles);
    }
    routed.push({
      tenantId: t.id,
      slug: t.slug,
      twenty: createTwentyTranscriber(getTwentyClientForInstance(key)),
      noteTitles,
      complete,
    });
  }
  return routed;
}

async function main() {
  console.log(
    `[call-transcriber] starting mode=${COMMIT ? "COMMIT" : "dry-run"} pollMs=${POLL_MS} batch=${BATCH} once=${ONCE} recordingsDir=${RECORDINGS_DIR}`
  );

  const store = createDrizzleTranscriberStore();
  const downloader = createFetchDownloader();
  const whisper = createMlxWhisperRunner({ pythonBin: PYTHON_BIN });

  let stopping = false;
  const stop = (signal: string) => {
    console.log(`[call-transcriber] ${signal} received — finishing current pass`);
    stopping = true;
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  while (!stopping) {
    try {
      // Routing re-resolved every pass: a new brand (or a newly configured
      // instance/model) must not need a restart.
      const tenants = await resolveRoutedTenants();
      if (tenants.length > 0) {
        const counts = await runTranscriberPass(
          {
            store,
            downloader,
            whisper,
            tenants,
            recordingsDir: RECORDINGS_DIR,
            dryRun: !COMMIT,
            // DeepSeek second opinion for analyses the local 9B mangles;
            // null when DEEPSEEK_API_KEY is absent — behaviour unchanged.
            fallbackComplete: createDeepseekCompleter() ?? undefined,
            onCardStamped: buildCardPing(),
          },
          BATCH
        );
        if (counts.claimed > 0 || ONCE) {
          console.log(`[call-transcriber] pass ${JSON.stringify(counts)}`);
        }
      } else if (ONCE) {
        console.log("[call-transcriber] no eligible tenants (instance/model unconfigured)");
      }
    } catch (err) {
      // A pass-level failure (DB down, Twenty down) must not kill the loop —
      // the next poll retries. Per-call failures are settled inside the pass.
      console.error(
        `[call-transcriber] pass failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (ONCE) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
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

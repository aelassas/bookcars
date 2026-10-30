// CallGear → Twenty lead relay runner (nohup-friendly CLI, same shape as
// run-twenty-mirror.ts).
//
// Polls integration_event for queued callgear call.finished events and
// projects them into Twenty (person + opportunity per inbound call). All
// decision logic lives in src/platform/integrations/callgear/twenty-relay.ts;
// this file is only wiring: env, the poll loop, and signal handling.
//
// Usage (from platform/):
//   npx tsx scripts/run-callgear-twenty-relay.ts            # poll forever
//   npx tsx scripts/run-callgear-twenty-relay.ts --once     # single pass
//
// Env:
//   CALLGEAR_RELAY_POLL_MS   poll interval, default 30000
//   CALLGEAR_RELAY_BATCH     events claimed per pass, default 25
//   DATABASE_URL, TWENTY_BASE_URL, TWENTY_API_KEY as usual (without the
//   Twenty vars the relay runs against the in-memory mock — it never crashes,
//   it just writes nowhere real).
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { createLeadNumberSource } from "@/platform/integrations/twenty/lead-number";
import {
  getTwentyClient,
  getTwentyClientForInstance,
} from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  twentyInstanceForTenantSlug,
  type TwentyInstanceKey,
} from "@/platform/integrations/twenty/instance";
import {
  createDrizzleRelayStore,
  createTwentyRelay,
  discoverOpportunityFields,
  runRelayPass,
  type RelayTwenty,
} from "@/platform/integrations/callgear/twenty-relay";
import { matchMemberForAgent, type MemberRef } from "@/platform/integrations/callgear/agent-name";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const POLL_MS = envInt("CALLGEAR_RELAY_POLL_MS", 30_000);
const BATCH_SIZE = envInt("CALLGEAR_RELAY_BATCH", 25);
const STARTUP_RETRY_MS = envInt("CALLGEAR_RELAY_STARTUP_RETRY_MS", 60_000);
const ONCE = process.argv.includes("--once");

async function main() {
  const client = getTwentyClient();
  console.log(
    `[callgear-relay] starting mode=${client.mode} pollMs=${POLL_MS} batch=${BATCH_SIZE} once=${ONCE}`
  );

  // Per-instance routing: default = sales (take-auto), rental = Cardiwan /
  // EasyRent. Each gets its own client + field discovery at startup; an
  // event whose tenant needs an UNCONFIGURED instance fails transiently and
  // retries — it must never fall back into the other brand's workspace.
  const routed = new Map<
    TwentyInstanceKey,
    {
      twenty: RelayTwenty;
      opportunityFields: ReadonlySet<string>;
      newStage: string;
      ownerIdForAgent?: (agentDisplayName: string) => string | null;
    }
  >();
  // Top-of-funnel stage per workspace: the rental pipeline was renamed
  // (NEW_REQUEST, IN_PROGRESS, …) and rejects the sales `NEW` with a 400.
  const NEW_STAGE: Record<TwentyInstanceKey, string> = { default: "NEW", rental: "NEW_REQUEST" };
  // Field discovery happens ONCE at startup, not per pass: the metadata crawl
  // is paginated and rate-limited, and the workspace schema does not change
  // between polls. If it does (bootstrap adds the call fields), restart.
  //
  // Startup must survive a Twenty deploy/restart overlap: discovery throwing
  // here used to reject main() → exit(1) → a pm2 restart storm (80+ crashes).
  // Retry with backoff instead; a single broken instance degrades to a
  // warning (its tenants' events fail+retry per pass) rather than taking the
  // whole relay down with it.
  let opportunityFields: ReadonlySet<string> = new Set();
  for (;;) {
    try {
      opportunityFields = await discoverOpportunityFields(client);
      const missing = ["recording", "callDurationSeconds", "callDirection", "callStartedAt", "callAgentName"].filter(
        (f) => !opportunityFields.has(f)
      );
      if (missing.length > 0) {
        console.log(
          `[callgear-relay] opportunity fields absent from workspace metadata, will be skipped: ${missing.join(", ")}`
        );
      }
      for (const key of ["default", "rental"] as const) {
        if (!resolveTwentyInstance(key).configured) {
          console.warn(`[callgear-relay] instance '${key}' has no API key — its tenants' events will fail+retry until configured`);
          continue;
        }
        try {
          const instanceClient = getTwentyClientForInstance(key);
          const fields = await discoverOpportunityFields(instanceClient);
          const absent = ["recording", "callDurationSeconds", "callDirection", "callStartedAt", "callAgentName"].filter(
            (f) => !fields.has(f)
          );
          if (absent.length > 0) {
            console.log(
              `[callgear-relay] instance '${key}': opportunity fields absent from workspace metadata, will be skipped: ${absent.join(", ")}`
            );
          }
          // The responsible (owner 2026-08-14): the workspace's member
          // directory, so the answering agent's name resolves to the card's
          // owner and the desk can filter the board per person. Fetched once
          // at startup like the field metadata — a new hire just needs a
          // relay restart. Failure degrades to unowned cards, never a crash.
          let ownerIdForAgent: ((agentDisplayName: string) => string | null) | undefined;
          try {
            const members: MemberRef[] = [];
            for await (const m of instanceClient.listAll<Record<string, unknown>>("workspaceMembers")) {
              const id = typeof m.id === "string" ? m.id : null;
              const name = (m.name ?? {}) as { firstName?: unknown; lastName?: unknown };
              const firstName = typeof name.firstName === "string" ? name.firstName : "";
              const lastName = typeof name.lastName === "string" ? name.lastName : "";
              if (id && firstName) members.push({ id, firstName, lastName });
            }
            ownerIdForAgent = (displayName: string) => matchMemberForAgent(displayName, members);
            console.log(`[callgear-relay] instance '${key}': ${members.length} workspace members for owner resolution`);
          } catch (err) {
            console.warn(
              `[callgear-relay] instance '${key}' member lookup failed — cards will be unowned: ${err instanceof Error ? err.message : String(err)}`
            );
          }
          routed.set(key, { twenty: createTwentyRelay(instanceClient), opportunityFields: fields, newStage: NEW_STAGE[key], ownerIdForAgent });
        } catch (err) {
          console.warn(
            `[callgear-relay] instance '${key}' field discovery failed — its tenants' events will fail+retry until a restart succeeds: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
      break;
    } catch (err) {
      console.error(
        `[callgear-relay] startup field discovery failed, retry in ${STARTUP_RETRY_MS / 1000}s: ${err instanceof Error ? err.message : String(err)}`
      );
      await new Promise((resolve) => setTimeout(resolve, STARTUP_RETRY_MS));
    }
  }

  // One counter per deployment, memoised — the same map the WhatsApp relay
  // keeps, so both series on a board draw from that board's sequence.
  const leadNumberFor = (() => {
    const cache = new Map<TwentyInstanceKey, ReturnType<typeof createLeadNumberSource>>();
    return (key: TwentyInstanceKey) => {
      let src = cache.get(key);
      if (!src) { src = createLeadNumberSource(db, key); cache.set(key, src); }
      return src;
    };
  })();

  const store = createDrizzleRelayStore();
  const deps = {
    store,
    // Fallback only. The real one comes from the ROUTE below, because the
    // counter belongs to the board the card lands on: a rental brand's call is
    // a rental card and must share the rental series. Numbering every call
    // from the default deployment is what put "#13 Inbound call" next to
    // "#13 WhatsApp direct" (Ayham, 2026-09-01).
    nextLeadNumber: createLeadNumberSource(db, "default"),
    twenty: routed.get("default")?.twenty ?? createTwentyRelay(client),
    opportunityFields: routed.get("default")?.opportunityFields ?? opportunityFields,
    routeForTenant: async (tenantId: string) => {
      const slug = await store.tenantSlug(tenantId);
      // rls-tenant-a is the unmapped-call bucket: events whose dialed line
      // has no tenant.callgear_virtual_number mapping land here and must
      // FAIL VISIBLY (and retry) until the line is mapped — never fall
      // through to a real desk's workspace.
      if (slug === "rls-tenant-a" || slug === "rls-tenant-b") {
        return { error: `unmapped CallGear line (bucket tenant '${slug}') — set tenant.callgear_virtual_number for the real brand; the event retries until then` };
      }
      const key = twentyInstanceForTenantSlug(slug);
      const hit = routed.get(key);
      if (!hit) {
        return {
          error: `Twenty instance '${key}' not configured (tenant '${slug ?? tenantId}') — set its API key; the event retries until then`,
        };
      }
      return { ...hit, nextLeadNumber: leadNumberFor(key) };
    },
  };

  let stopping = false;
  const stop = (signal: string) => {
    console.log(`[callgear-relay] ${signal} received — finishing current pass`);
    stopping = true;
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  while (!stopping) {
    try {
      const report = await runRelayPass(deps, BATCH_SIZE);
      if (report.claimed > 0 || ONCE) {
        console.log(`[callgear-relay] pass ${JSON.stringify(report)}`);
      }
    } catch (err) {
      // A pass-level failure (DB down, metadata blip) must not kill the loop —
      // the next poll retries. Per-event failures are settled inside the pass.
      console.error(
        `[callgear-relay] pass failed: ${err instanceof Error ? err.message : String(err)}`
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

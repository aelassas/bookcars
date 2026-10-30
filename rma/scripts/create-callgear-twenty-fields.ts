// Create the CallGear call-metadata fields on the Twenty opportunity object,
// on BOTH Twenty deployments (sales + rental). Idempotent: a field that
// already exists (matched by name) is left untouched, so re-running is safe.
//
// Field specs live in schema-bootstrap.ts (CALL_OPPORTUNITY_FIELDS) so this
// script and the full bootstrap can never drift apart.
//
// Usage (from platform/, on a machine that can reach both instances):
//   npx tsx scripts/create-callgear-twenty-fields.ts
//
// Env:
//   TWENTY_BASE_URL / TWENTY_API_KEY               sales instance (:3001)
//   TWENTY_RENTAL_BASE_URL / TWENTY_RENTAL_API_KEY rental instance (:3002)
//
// Twenty caches field/view metadata: after fields are CREATED on an instance,
// flush that instance's cache on the box (the script prints the exact line
// per instance — nothing here touches docker itself).
import { config } from "dotenv";
config({ path: ".env.local" });
import { createTwentyClient } from "@/platform/integrations/twenty/client";
import { resolveTwentyInstance, type TwentyInstanceKey } from "@/platform/integrations/twenty/instance";
import { ensureCallOpportunityFields } from "@/platform/integrations/twenty/schema-bootstrap";

const INSTANCES: { key: TwentyInstanceKey; label: string; keyEnv: string; container: string }[] = [
  { key: "default", label: "sales", keyEnv: "TWENTY_API_KEY", container: "twenty-server-1" },
  { key: "rental", label: "rental", keyEnv: "TWENTY_RENTAL_API_KEY", container: "twenty-rental-server-1" },
];

async function main() {
  let failed = false;
  for (const { key, label, keyEnv, container } of INSTANCES) {
    const cfg = resolveTwentyInstance(key);
    if (!cfg.configured) {
      // No fallback to the other instance's key — that would create the
      // fields on the WRONG workspace (see instance.ts).
      console.log(`[${label}] SKIPPED — no API key configured (set ${keyEnv})`);
      failed = true;
      continue;
    }
    const client = createTwentyClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, mode: "live" });
    const r = await ensureCallOpportunityFields(client);
    console.log(`[${label}] fields created: ${r.created.join(", ") || "(none)"}`);
    console.log(`[${label}] already present: ${r.alreadyPresent.join(", ") || "(none)"}`);
    if (r.created.length > 0) {
      console.log(`[${label}] cache flush REQUIRED on the box (Twenty caches field metadata):`);
      console.log(`  docker exec ${container} sh -c 'yarn command:prod cache:flush'`);
    }
  }
  if (failed) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

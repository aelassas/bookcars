// Create the Bitrix SEMANTIC mirror fields on the Twenty workspaces, on BOTH
// deployments (sales + rental):
//
//   opportunity.lossReason     SELECT  — options from the portal's userfield.list
//   opportunity.carModels      TEXT
//   person.languageSegment     SELECT  — options from the portal's userfield.list
//   person.socialProfile       LINKS
//   person.returnCustomer      BOOLEAN
//   stageEvent object          + externalId / opportunity relation
//
// Idempotent: a field that already exists (matched by name) is left untouched,
// so re-running is safe.
//
// The SELECT option sets are NOT hardcoded: each portal numbers its UF fields
// differently (sales ≠ cardiwan ≠ easyrent), so the script reads the portals'
// OWN crm.deal.userfield.list (webhook URLs from integration_connection),
// resolves the loss-reason / language fields BY MEANING (the same catalog the
// sync uses), and unions the enumeration values per Twenty instance. A portal
// lacking a field contributes nothing; an instance whose portals all lack it
// gets the field SKIPPED, reported in the output.
//
// Option VALUES are the raw Russian labels (the mirror writes them verbatim —
// the stageDetail precedent); English text goes into the option labels. If the
// instance rejects Cyrillic option values the create call will 400 — that is
// the first-run check (see НЕИЗВЕСНО #7 in schema-bootstrap.ts).
//
// Usage (from platform/, on a machine that can reach both instances AND the
// platform DB — i.e. the box):
//   npx tsx scripts/create-bitrix-mirror-twenty-fields.ts
//
// Env:
//   TWENTY_BASE_URL / TWENTY_API_KEY               sales instance (:3001)
//   TWENTY_RENTAL_BASE_URL / TWENTY_RENTAL_API_KEY rental instance (:3002)
//   DATABASE_URL                                   platform DB (webhook URLs)
//
// Twenty caches field/view metadata: after fields are CREATED on an instance,
// flush that instance's cache on the box (the script prints the exact line
// per instance — nothing here touches docker itself).
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { integrationConnection, tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { createBitrix24Client } from "@/platform/integrations/bitrix24/client";
import {
  createDealUserFieldCatalog,
  mirrorSemanticEnglishLabel,
} from "@/platform/integrations/bitrix24/mappings";
import { createTwentyClient } from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  twentyInstanceForTenantSlug,
  type TwentyInstanceKey,
} from "@/platform/integrations/twenty/instance";
import {
  ensureMirrorSemanticFields,
} from "@/platform/integrations/twenty/schema-bootstrap";
import type { TwentySelectOption } from "@/platform/integrations/twenty/client";

const INSTANCES: { key: TwentyInstanceKey; label: string; keyEnv: string; container: string }[] = [
  { key: "default", label: "sales", keyEnv: "TWENTY_API_KEY", container: "twenty-server-1" },
  { key: "rental", label: "rental", keyEnv: "TWENTY_RENTAL_API_KEY", container: "twenty-rental-server-1" },
];

/** value (raw Russian label) → option, first writer wins, order preserved. */
function collectOptions(into: Map<string, TwentySelectOption>, values: Iterable<string>): void {
  for (const value of values) {
    if (into.has(value)) continue;
    into.set(value, { value, label: mirrorSemanticEnglishLabel(value), position: into.size });
  }
}

async function main() {
  // Every tenant's Bitrix webhook, grouped by the Twenty instance its records
  // live in. Never printed — the URL path is the secret.
  const connections = await db
    .select({ slug: tenant.slug, config: integrationConnection.config })
    .from(integrationConnection)
    .innerJoin(tenant, eq(integrationConnection.tenantId, tenant.id))
    .where(eq(integrationConnection.provider, "bitrix24"));

  const portalsByInstance = new Map<TwentyInstanceKey, { slug: string; webhookUrl: string }[]>();
  for (const row of connections) {
    const webhookUrl = (row.config as { webhookUrl?: string })?.webhookUrl;
    if (!webhookUrl) continue;
    const key = twentyInstanceForTenantSlug(row.slug);
    const list = portalsByInstance.get(key) ?? [];
    list.push({ slug: row.slug, webhookUrl });
    portalsByInstance.set(key, list);
  }

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

    // Enumerate the option sets from this instance's OWN portals, by meaning.
    const lossReason = new Map<string, TwentySelectOption>();
    const language = new Map<string, TwentySelectOption>();
    const portals = portalsByInstance.get(key) ?? [];
    if (portals.length === 0) {
      console.log(`[${label}] WARNING — no bitrix24 connection routes to this instance`);
    }
    for (const portal of portals) {
      try {
        const resolution = await createDealUserFieldCatalog(
          createBitrix24Client(portal.webhookUrl)
        ).resolution();
        if (resolution.lossReason) collectOptions(lossReason, resolution.lossReason.list.values());
        if (resolution.language) collectOptions(language, resolution.language.list.values());
        console.log(
          `[${label}] ${portal.slug}: lossReason=${resolution.lossReason ? "found" : "—"} language=${resolution.language ? "found" : "—"} carModels=${resolution.carModels ? "found" : "—"}`
        );
      } catch (e) {
        // The webhook path is the secret — print the slug and the error, never the URL.
        console.log(`[${label}] ${portal.slug}: userfield.list failed (${(e as Error).message}) — portal skipped`);
        failed = true;
      }
    }

    const client = createTwentyClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, mode: "live" });
    const r = await ensureMirrorSemanticFields(client, {
      lossReasonOptions: lossReason.size > 0 ? [...lossReason.values()] : null,
      languageOptions: language.size > 0 ? [...language.values()] : null,
    });
    console.log(`[${label}] objects created: ${r.objectsCreated.join(", ") || "(none)"}`);
    console.log(`[${label}] fields created: ${r.fieldsCreated.join(", ") || "(none)"}`);
    console.log(`[${label}] already present: ${r.alreadyPresent.join(", ") || "(none)"}`);
    if (r.skipped.length > 0) console.log(`[${label}] skipped: ${r.skipped.join("; ")}`);
    if (r.objectsCreated.length > 0 || r.fieldsCreated.length > 0) {
      console.log(`[${label}] cache flush REQUIRED on the box (Twenty caches field metadata):`);
      console.log(`  docker exec ${container} sh -c 'yarn command:prod cache:flush'`);
    }
  }
  if (failed) process.exit(1);
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

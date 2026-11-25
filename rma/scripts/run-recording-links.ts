// Call-recording links QC can actually open (Mohamd 2026-08-18): the CallGear
// URLs on the cards bounce non-CallGear users to their SSO login. The
// transcriber already downloads every recording to disk — this pass repoints
// each call card's Recording field at OUR /api/media/<token> URL (playable by
// anyone with the link) and keeps the original CallGear URL as the secondary
// link. Idempotent: cards already pointing at our media route are skipped.
//
// Usage (from platform/):
//   npx tsx scripts/run-recording-links.ts --once            # dry-run
//   npx tsx scripts/run-recording-links.ts --once --commit   # live single pass
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { sql } from "drizzle-orm";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  twentyInstanceForTenantSlug,
} from "@/platform/integrations/twenty/instance";
import { mediaUrl, MEDIA_ROOTS } from "@/platform/media/token";

const ONCE = process.argv.includes("--once");
const COMMIT = process.argv.includes("--commit");
const POLL_MS = Number(process.env.RECORDING_LINKS_POLL_MS ?? "") || 600_000;

function rows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

async function main() {
  console.log(`[recording-links] starting mode=${COMMIT ? "COMMIT" : "dry-run"} once=${ONCE}`);
  for (;;) {
    const list = rows<{ tenant_id: string; call_id: string; recording_path: string; slug: string }>(
      await db.execute(sql`
        SELECT ct.tenant_id, ct.call_id, ct.recording_path, t.slug
          FROM call_transcript ct JOIN tenant t ON t.id = ct.tenant_id
         WHERE ct.recording_path IS NOT NULL
      `)
    );
    let patched = 0;
    let skipped = 0;
    for (const r of list) {
      try {
        const key = twentyInstanceForTenantSlug(r.slug);
        if (!resolveTwentyInstance(key).configured) continue;
        const client = getTwentyClientForInstance(key);
        // Relative locator under the recordings root ("rec/<slug>/<file>").
        if (!r.recording_path.startsWith(MEDIA_ROOTS.rec + "/")) continue;
        const rel = "rec/" + r.recording_path.slice(MEDIA_ROOTS.rec.length + 1);
        let found: Record<string, unknown> | null = null;
        for await (const opp of client.listAll<Record<string, unknown>>("opportunities", {
          filter: `externalId[eq]:callgear:${r.call_id}`,
        })) {
          found = opp;
          break;
        }
        if (!found?.id) continue;
        const rec = (found.recording ?? {}) as { primaryLinkUrl?: string; primaryLinkLabel?: string };
        if ((rec.primaryLinkUrl ?? "").includes("/api/media/")) {
          skipped++;
          continue;
        }
        const ours = mediaUrl(rel);
        const secondary = rec.primaryLinkUrl
          ? [{ url: rec.primaryLinkUrl, label: rec.primaryLinkLabel || "CallGear" }]
          : [];
        console.log(`[recording-links] ${COMMIT ? "PATCH" : "DRY  "} ${r.slug} call ${r.call_id} → ${rel}`);
        if (COMMIT) {
          await client.patch(`opportunities/${found.id}`, {
            recording: {
              primaryLinkUrl: ours,
              primaryLinkLabel: "▶️ Call recording",
              secondaryLinks: secondary,
            },
          });
        }
        patched++;
      } catch (e) {
        console.error(`[recording-links] ${r.slug}/${r.call_id} failed: ${(e as Error).message.slice(0, 140)}`);
      }
    }
    console.log(`[recording-links] done: candidates=${list.length} patched=${patched} already-ours=${skipped}`);
    if (ONCE) break;
    await new Promise((res) => setTimeout(res, POLL_MS));
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

// Repair the call cards created before the two-notification fix (2026-08-10).
//
// Until that fix, one call reached us as two webhooks whose shared key
// (call_session_id) we failed to read: it is a NUMBER, and the call-end event
// nests it under call_info. Both events therefore fell back to
// `uis-${Date.now()}` and produced TWO half-cards — one with the talk time,
// one with the recording — neither of which could be transcribed or read.
//
// This script rebuilds those events from the raw payload CallGear sent (kept
// verbatim under raw_payload.uis_raw), retires the half-cards, and requeues
// the events so the fixed relay assembles ONE complete card per call and the
// transcriber writes its summary onto it.
//
// Idempotent and DRY-RUN by default:
//   npx tsx scripts/repair-callgear-cards.ts            # report only
//   npx tsx scripts/repair-callgear-cards.ts --apply    # do it
//
// Safety: Twenty records are SOFT-deleted (deletedAt), so a wrongly retired
// card is restorable; nothing is dropped from the platform DB except
// call_transcript rows, whose work (downloaded audio + whisper text) is
// re-derivable and whose recordings stay cached on disk.
import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { db as platformDb } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { normalizeToCallFinished } from "@/platform/integrations/callgear/webhook";
import { callTimestamp } from "@/platform/integrations/callgear/twenty-relay";
import { createTwentyClient } from "@/platform/integrations/twenty/client";
import { resolveTwentyInstance, type TwentyInstanceKey } from "@/platform/integrations/twenty/instance";

const APPLY = process.argv.includes("--apply");

type EventRow = {
  id: string;
  tenant_id: string;
  provider_event_id: string;
  raw_payload: Record<string, unknown>;
};

function rows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

/** Retire the half-cards: every opportunity whose externalId still carries a
 *  `uis-<timestamp>` fallback key, plus the transcript notes hanging off them. */
async function retireHalfCards(key: TwentyInstanceKey, label: string): Promise<void> {
  const cfg = resolveTwentyInstance(key);
  if (!cfg.configured) {
    console.log(`[${label}] SKIPPED — no API key configured`);
    return;
  }
  const client = createTwentyClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, mode: "live" });
  const page = await client.get<{ data?: Record<string, { id: string; externalId?: string; name?: string }[]> }>(
    "opportunities",
    { filter: "externalId[ilike]:callgear:uis-%", limit: 200 }
  );
  const found = page.data?.opportunities ?? [];
  console.log(`[${label}] half-cards to retire: ${found.length}`);
  for (const opp of found) {
    console.log(`[${label}]   ${APPLY ? "retiring" : "would retire"} ${opp.externalId} — ${opp.name ?? ""}`);
    if (APPLY) await client.delete(`opportunities/${opp.id}`);
  }
}

/**
 * Cards written by earlier versions of the relay: they say "call.finished"
 * where the manager needs "Answered call"/"Missed call", and their titles
 * carry a UTC clock for a phone that rings in Dubai. Both are derivable from
 * what the card already holds — no CallGear round-trip needed.
 */
async function repairLegacyCards(key: TwentyInstanceKey, label: string): Promise<void> {
  const cfg = resolveTwentyInstance(key);
  if (!cfg.configured) return;
  const client = createTwentyClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, mode: "live" });
  const page = await client.get<{
    data?: Record<
      string,
      { id: string; name?: string; stageDetail?: string; callDurationSeconds?: number; callStartedAt?: string }[]
    >;
  }>("opportunities", { filter: "externalSource[eq]:callgear", limit: 200 });

  for (const opp of page.data?.opportunities ?? []) {
    const patch: Record<string, unknown> = {};
    if (opp.stageDetail === "call.finished" || !opp.stageDetail) {
      patch.stageDetail = Number(opp.callDurationSeconds ?? 0) > 0 ? "Answered call" : "Missed call";
    }
    // Retitle from the call's own timestamp so the hour matches the office.
    const m = opp.name?.match(/^(Inbound call \+?\d+) /);
    if (m && opp.callStartedAt) {
      const retitled = `${m[1]} ${callTimestamp(opp.callStartedAt)}`;
      if (retitled !== opp.name) patch.name = retitled;
    }
    if (Object.keys(patch).length === 0) continue;
    console.log(`[${label}] ${APPLY ? "fixing" : "would fix"} ${opp.name} → ${JSON.stringify(patch)}`);
    if (APPLY) await client.patch(`opportunities/${opp.id}`, patch);
  }
}

async function main() {
  const tenants = await platformDb.select({ id: tenant.id, slug: tenant.slug }).from(tenant);
  let rebuilt = 0;

  for (const t of tenants) {
    const events = await withDrizzleTenant(t.id, async (tx) =>
      rows<EventRow>(
        await tx.execute(sql`
          SELECT id, tenant_id, provider_event_id, raw_payload
            FROM integration_event
           WHERE provider = 'callgear'
             AND raw_payload ? 'uis_raw'
        `)
      )
    );
    if (events.length === 0) continue;

    for (const ev of events) {
      const uisRaw = ev.raw_payload.uis_raw;
      // Re-read the payload with the CURRENT normalizer — this is the whole
      // point: the same bytes, parsed by code that can see the join key.
      const fixed = normalizeToCallFinished(uisRaw);
      const oldParams = (ev.raw_payload.params ?? {}) as Record<string, unknown>;
      const changed = oldParams.callId !== fixed.params.callId || oldParams.duration !== fixed.params.duration;
      console.log(
        `[${t.slug}] ${ev.provider_event_id}: callId ${String(oldParams.callId)} → ${fixed.params.callId}` +
          `, duration ${String(oldParams.duration)} → ${fixed.params.duration}` +
          (changed ? "" : " (unchanged)")
      );
      rebuilt++;
      if (!APPLY) continue;

      await withDrizzleTenant(t.id, async (tx) => {
        // The transcript work is re-derived: its note points at a card that
        // is about to be retired, and its summary never reached any card.
        await tx.execute(sql`DELETE FROM call_transcript WHERE integration_event_id = ${ev.id}::uuid`);
        await tx.execute(sql`
          UPDATE integration_event
             SET raw_payload = jsonb_set(raw_payload::jsonb, '{params}', ${JSON.stringify(fixed.params)}::jsonb),
                 processing_status = 'queued',
                 processing_error = NULL,
                 processed_at = NULL
           WHERE id = ${ev.id}::uuid
        `);
      });
    }
  }

  await retireHalfCards("default", "sales");
  await retireHalfCards("rental", "rental");
  await repairLegacyCards("default", "sales");
  await repairLegacyCards("rental", "rental");

  console.log(
    `\n${APPLY ? "REPAIRED" : "DRY RUN"}: ${rebuilt} call events rebuilt from their raw payloads.` +
      (APPLY ? " The relay assembles the cards on its next pass." : " Re-run with --apply to do it.")
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

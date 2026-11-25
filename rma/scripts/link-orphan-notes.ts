/**
 * Attach conversation notes to the cards they belong to.
 *
 * A note is created the first time a customer writes; the CARD is created
 * later, when the thread qualifies. Until 2026-08-31 nothing went back to link
 * the two, so those cards opened on "Notes 0" while the conversation sat one
 * table away (Ayham, card #619: "this lead has no messages").
 *
 * The live pipe now links on every pass. This heals the ones already orphaned.
 *
 * Dry-run by default; pass --commit to write. Idempotent: a card that is
 * already linked is skipped, so it is safe to re-run.
 */
// Env FIRST: the Twenty client reads its API key at import time, and without
// this it silently falls back to the mock client (the guard below catches it,
// but only after a pointless full crawl).
import { config } from "dotenv";
config({ path: ".env.local" });
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import { missingNoteTargets, waNoteTitle, findNoteByTitle } from "@/platform/integrations/twenty/day-note";

type Opp = {
  id: string;
  deletedAt: string | null;
  phoneTail9: string | null;
  leadNumber: string | null;
  name?: string;
  pointOfContactId?: string | null;
};

const COMMIT = process.argv.includes("--commit");

function rowsOf(page: unknown): Record<string, unknown>[] {
  const data = (page as { data?: Record<string, unknown> })?.data ?? {};
  for (const v of Object.values(data)) if (Array.isArray(v)) return v as Record<string, unknown>[];
  return [];
}

async function main() {
  const twenty = getTwentyClientForInstance("rental");
  if (twenty.mode === "mock") throw new Error("rental Twenty is in MOCK mode — refusing to run");

  const opps: Opp[] = [];
  for await (const o of twenty.listAll<Opp>("opportunities")) opps.push(o);
  const live = opps.filter((o) => !o.deletedAt && o.phoneTail9);
  console.log(`${live.length} live cards with a phone`);

  let noNote = 0, alreadyLinked = 0, linked = 0, failed = 0;

  for (const o of live) {
    // The note key is the FULL number, which the card does not carry — but the
    // note title is the only identity this subsystem trusts, so find it by
    // walking the parts of the tail's own title. Cards store tail9; notes store
    // the full digits, so match on the tail via a title search.
    let note: { id: string; markdown: string } | null = null;
    try {
      const page = await twenty.get<unknown>("notes", {
        filter: `title[ilike]:"%${o.phoneTail9}%"`,
        limit: 5,
      });
      const rows = rowsOf(page).filter((r) => String(r.title ?? "").startsWith("WhatsApp · +"));
      const row = rows[0];
      if (row && typeof row.id === "string") {
        const body = row.bodyV2 as { markdown?: unknown } | null;
        note = { id: row.id, markdown: typeof body?.markdown === "string" ? body.markdown : "" };
      }
    } catch (e) {
      failed++;
      console.error(`  lookup failed for #${o.leadNumber ?? o.id}: ${(e as Error).message.slice(0, 120)}`);
      continue;
    }
    if (!note) { noNote++; continue; }

    let existing: { targetOpportunityId?: string | null; targetPersonId?: string | null }[] = [];
    try {
      const page = await twenty.get<unknown>("noteTargets", {
        filter: `noteId[eq]:"${note.id}"`,
        limit: 60,
      });
      existing = rowsOf(page) as typeof existing;
    } catch (e) {
      failed++;
      continue;
    }

    const wanted = missingNoteTargets(note.id, { personId: null, opportunityId: o.id }, existing);
    if (wanted.length === 0) { alreadyLinked++; continue; }

    console.log(`  #${o.leadNumber ?? "?"} …${o.phoneTail9} → note ${note.id} (${note.markdown.length} chars)`);
    if (COMMIT) {
      try {
        await twenty.batchCreate("noteTargets", wanted);
        linked++;
      } catch (e) {
        failed++;
        console.error(`    link failed: ${(e as Error).message.slice(0, 140)}`);
      }
    } else {
      linked++;
    }
  }

  console.log(
    `\n${COMMIT ? "LINKED" : "WOULD LINK"} ${linked} · already linked ${alreadyLinked} · no note found ${noNote} · failed ${failed}`
  );
  if (!COMMIT) console.log("dry run — pass --commit to write");
  process.exit(0);
}

main().catch((e) => {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});

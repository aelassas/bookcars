// WhatsApp media backfill — attach files to notes that ALREADY exist in Twenty.
//
// The projector (push-message.ts) only attaches media for messages it
// projects AFTER the feature shipped; every note written before carries the
// AI text but no file. This pass walks the same message rows, finds the note
// by its deterministic title (noteTitle() — same code that wrote it), and
// uploads the file as an attachment on the same person (+ deal when the
// number matches one). It NEVER re-uploads a file that is already attached
// (existing attachments are checked by name+person).
//
// --create-notes (default OFF): replay the ENTIRE conversation, not just
// media rows — the walk covers every WhatsApp message with a body, replayed
// into the AGGREGATED (person, day) notes the live sync writes (see
// day-note.ts), voice transcripts included. Messages the OLD per-message
// projector already wrote are recognized by their legacy title and left
// alone (their media still attaches, onto the legacy note). Line-level
// dedupe means a re-run over the same range never duplicates the
// conversation; attachments dedupe by name+person.
//
// DRY-RUN BY DEFAULT — nothing is written until --commit is passed.
//
// Usage (from platform/):
//   npx tsx scripts/backfill-wa-media-to-twenty.ts --tenant cardiwan
//   npx tsx scripts/backfill-wa-media-to-twenty.ts --tenant cardiwan --commit
//   npx tsx scripts/backfill-wa-media-to-twenty.ts --tenant cardiwan --commit --create-notes
//   npx tsx scripts/backfill-wa-media-to-twenty.ts --since 2026-08-01 --max 500 --create-notes
//
// Progress checkpoints live in twenty_mirror_state (entity
// "wa_media_backfill", per tenant), so a committed re-run continues where the
// last one stopped. --since only matters for the FIRST run of a tenant.
import { config } from "dotenv";
config({ path: ".env.local" });
import { eq } from "drizzle-orm";
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { backfillWaMediaToTwenty } from "@/platform/integrations/twenty/media-backfill";

const DEFAULT_TENANTS = ["take-auto", "cardiwan", "easyrent"];
const DEFAULT_SINCE_DAYS = 30;

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const tenantRef = argValue("tenant");
  const sinceArg = argValue("since");
  const since = sinceArg
    ? new Date(sinceArg)
    : new Date(Date.now() - DEFAULT_SINCE_DAYS * 86_400_000);
  if (Number.isNaN(since.getTime())) {
    console.error(`invalid --since date: ${sinceArg}`);
    process.exit(1);
  }
  const maxArg = argValue("max");
  const max = maxArg ? Number(maxArg) : 200;
  if (!Number.isFinite(max) || max <= 0) {
    console.error(`invalid --max: ${maxArg}`);
    process.exit(1);
  }
  const commit = hasFlag("commit");
  const createNotes = hasFlag("create-notes");
  if (createNotes && !commit) {
    console.log("[wa-media-backfill] --create-notes in DRY-RUN: notesCreated counts what WOULD be created");
  }

  const slugs = tenantRef ? [tenantRef] : DEFAULT_TENANTS;
  for (const slug of slugs) {
    const [t] = await db
      .select({ id: tenant.id, slug: tenant.slug })
      .from(tenant)
      .where(eq(tenant.slug, slug))
      .limit(1);
    if (!t) {
      console.error(`tenant not found: ${slug}`);
      continue;
    }
    const report = await backfillWaMediaToTwenty(db, t.id, t.slug, { since, max, commit, createNotes });
    console.log(JSON.stringify(report, null, 2));
  }
  if (!commit) {
    console.log("[wa-media-backfill] dry run — re-run with --commit to write");
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

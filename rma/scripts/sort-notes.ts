/**
 * Put existing conversation notes back into the order things were said.
 *
 * The note pipe only appended, so a reply that could not be attributed until
 * wa_identity learned the sender's @lid landed at the END — under the messages
 * that answered it (Ayham, 2026-08-31, card #640: a 15:11 reply below the 15:26
 * question). New appends sort themselves now; this heals what is already there.
 *
 * Dry-run by default; --commit to write. `sortNoteBody` is idempotent and
 * line-preserving, so re-running is a no-op and nothing can be lost — the
 * script additionally refuses to write any note whose line COUNT would change.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import { sortNoteBody } from "@/platform/integrations/twenty/day-note";

type Note = { id: string; title: string | null; deletedAt: string | null; bodyV2?: { markdown?: unknown } | null };

const COMMIT = process.argv.includes("--commit");

async function main() {
  const twenty = getTwentyClientForInstance("rental");
  if (twenty.mode === "mock") throw new Error("rental Twenty in MOCK mode — refusing to run");

  let seen = 0, changed = 0, written = 0, refused = 0, failed = 0;
  for await (const n of twenty.listAll<Note>("notes")) {
    if (n.deletedAt) continue;
    const md = typeof n.bodyV2?.markdown === "string" ? n.bodyV2.markdown : "";
    if (!md || !md.includes("**—")) continue;
    seen++;

    const sorted = sortNoteBody(md);
    if (sorted === md) continue;
    changed++;

    // Belt and braces: a sort must never change how many lines there are.
    if (sorted.split("\n").length !== md.split("\n").length) {
      refused++;
      console.error(`  REFUSED ${n.title ?? n.id}: line count would change`);
      continue;
    }

    if (!COMMIT) {
      if (changed <= 5) console.log(`  would reorder: ${n.title ?? n.id}`);
      continue;
    }
    try {
      await twenty.patch(`notes/${n.id}`, { bodyV2: { markdown: sorted, blocknote: null } });
      written++;
    } catch (e) {
      failed++;
      console.error(`  ${n.title ?? n.id}: ${(e as Error).message.slice(0, 120)}`);
    }
  }

  console.log(
    `\nconversation notes: ${seen} · out of order: ${changed} · ${COMMIT ? `rewritten: ${written}` : "dry run"}` +
      ` · refused: ${refused} · failed: ${failed}`
  );
  if (!COMMIT) console.log("pass --commit to write");
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e instanceof Error ? e.message : e); process.exit(1); });

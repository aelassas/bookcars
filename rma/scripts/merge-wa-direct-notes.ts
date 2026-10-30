// merge-wa-direct-notes.ts — fold the legacy "WhatsApp direct · …<tail9>"
// notes into the ONE continuous day note ("WhatsApp · +<digits>") per customer.
//
// Why: until 2026-08-27 the wa-lead-relay wrote its own note per card next to
// the day-note pipe's note — two notes, same messages, different line formats
// (owner: Ayham's #539 photo — "they are split in many notes when we asked
// only one continuous note"). The producer fix (wa-lead-relay now writes under
// the day-note identity) stops NEW duplicates; this script cleans the ~1.3k
// already filed (364 sales + 986 rental on 2026-08-27).
//
// Per relay note:
//   1. find the day note(s) for the same tail9 (any "· #N" part);
//   2. append the lines the day note does NOT already contain (dedupe on the
//      flattened message text — formats differ, so timestamps are not
//      compared), keeping the legacy `[date · time] text` shape for those so
//      no information is lost;
//   3. make sure the day note is targeted at every opportunity/person the
//      relay note was targeted at;
//   4. soft-delete the relay note (deletedAt — Twenty convention, reversible).
// If no day note exists yet: retitle the newest relay note into the day-note
// identity (full digits recovered from the wa.me link in the body) instead of
// deleting it, then fold the others into it the same way.
//
// DRY-RUN BY DEFAULT. `--commit` to write. Writes are direct SQL (psql via
// docker exec) — Twenty serves notes straight from Postgres, no cache to
// invalidate; verified against v2.25 schema on 2026-08-27.
//
//   npx tsx scripts/merge-wa-direct-notes.ts --instance rental            # dry-run
//   npx tsx scripts/merge-wa-direct-notes.ts --instance both --commit
import { execSync } from "node:child_process";

const INSTANCES: Record<string, { container: string; schema: string }> = {
  sales: { container: "twenty-db-1", schema: "workspace_8fj54z04p0s0zrognxhkd2f0a" },
  rental: { container: "twenty-rental-db-1", schema: "workspace_7tkxm1eeqb4iopvi5ica5vos4" },
};

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const instArg = args[args.indexOf("--instance") + 1] ?? "both";
const targets = instArg === "both" ? Object.keys(INSTANCES) : [instArg];
if (!targets.every((t) => INSTANCES[t])) {
  console.error(`unknown --instance '${instArg}' (sales|rental|both)`);
  process.exit(1);
}

function psql(container: string, sql: string): string {
  return execSync(
    `docker exec -i ${container} psql -U postgres -d default -t -A -v ON_ERROR_STOP=1`,
    { input: sql, maxBuffer: 256 * 1024 * 1024, encoding: "utf8" }
  ).trim();
}

/** psql returning rows as parsed JSON (empty set → []). */
function psqlJson<T>(container: string, sql: string): T[] {
  const out = psql(container, `select coalesce(json_agg(row_to_json(t)), '[]') from (${sql}) t;`);
  return JSON.parse(out || "[]") as T[];
}

function esc(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

interface NoteRow { id: string; title: string; markdown: string }
interface TargetRow { noteId: string; targetPersonId: string | null; targetOpportunityId: string | null }

const RELAY_LINE = /^\[(.+?)\]\s+(.*)$/;
const TAIL9 = /…(\d{9})/;
const WA_LINK = /send\?phone=(\d{9,15})/;

/** Same flattening day-note.ts noteLine() applies, so text comparison is fair. */
function flat(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 1000);
}

/** Message lines of a relay note body: `[26 Aug 2026 · 13:01] text`. */
function relayLines(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => RELAY_LINE.test(l));
}

/** Strip the rollover suffix so "WhatsApp · +971… · #2" still keys on digits. */
function dayNoteDigits(title: string): string | null {
  const m = /^WhatsApp · \+(\d{9,15})(?: · #\d+)?$/.exec(title);
  return m ? m[1] : null;
}

async function mergeInstance(name: string): Promise<void> {
  const { container, schema } = INSTANCES[name];
  console.log(`\n== ${name} (${container}) commit=${COMMIT}`);

  const relayNotes = psqlJson<NoteRow>(
    container,
    `select id, title, coalesce("bodyV2Markdown", '') as markdown
       from ${schema}.note
      where title like 'WhatsApp direct%' and "deletedAt" is null`
  );
  const dayNotes = psqlJson<NoteRow>(
    container,
    `select id, title, coalesce("bodyV2Markdown", '') as markdown
       from ${schema}.note
      where title like 'WhatsApp · +%' and "deletedAt" is null`
  );
  const noteIds = [...relayNotes.map((n) => n.id), ...dayNotes.map((n) => n.id)];
  const targetRows = noteIds.length
    ? psqlJson<TargetRow>(
        container,
        `select "noteId", "targetPersonId", "targetOpportunityId"
           from ${schema}."noteTarget"
          where "deletedAt" is null and "noteId" in (${noteIds.map((t) => esc(t)).join(",")})`
      )
    : [];
  console.log(`relay notes: ${relayNotes.length}, day notes: ${dayNotes.length}`);

  // Group relay notes by tail9.
  const byTail = new Map<string, NoteRow[]>();
  for (const n of relayNotes) {
    const tail = TAIL9.exec(n.title)?.[1];
    if (!tail) {
      console.log(`  SKIP (no tail9 in title): ${n.title}`);
      continue;
    }
    byTail.set(tail, [...(byTail.get(tail) ?? []), n]);
  }

  let merged = 0, retitled = 0, skipped = 0, linesMoved = 0, targetsAdded = 0;
  const statements: string[] = [];

  for (const [tail, notes] of byTail) {
    // Existing day note(s) for this customer: title digits END with tail9.
    const days = dayNotes.filter((d) => dayNoteDigits(d.title)?.endsWith(tail));
    let home = days.sort((a, b) => a.title.length - b.title.length)[0] ?? null;

    if (!home) {
      // No day note yet: retitle the newest relay note into the identity.
      const digits = notes.map((n) => WA_LINK.exec(n.markdown)?.[1]).find(Boolean);
      if (!digits) {
        console.log(`  SKIP (no day note, no wa.me digits): …${tail} (${notes.length} notes)`);
        skipped += notes.length;
        continue;
      }
      home = notes.sort((a, b) => b.markdown.length - a.markdown.length)[0];
      statements.push(
        `update ${schema}.note set title = 'WhatsApp · +${digits}', "updatedAt" = now() where id = ${esc(home.id)};`
      );
      retitled++;
    }

    const homeText = () =>
      dayNotes.filter((d) => dayNoteDigits(d.title)?.endsWith(tail)).map((d) => d.markdown).join("\n") +
      "\n" + (home && !days.includes(home) ? home.markdown : "");

    for (const note of notes) {
      if (note.id === home.id) continue; // the retitled home stays as-is
      const base = homeText();
      const missing = relayLines(note.markdown).filter((l) => {
        const text = flat(RELAY_LINE.exec(l)![2]);
        return text.length > 0 && !base.includes(text);
      });
      if (missing.length > 0) {
        const addition = missing.join("\n");
        statements.push(
          `update ${schema}.note
              set "bodyV2Markdown" = coalesce("bodyV2Markdown", '') || E'\\n' || ${esc(addition)},
                  "updatedAt" = now()
            where id = ${esc(home.id)};`
        );
        linesMoved += missing.length;
        // Keep the in-memory body honest for the next note of the same tail.
        home.markdown += "\n" + addition;
      }
      // Carry the targets over.
      const existingTargets = new Set(
        targetRows.filter((t) => t.noteId === home!.id).map((t) => t.targetOpportunityId ?? t.targetPersonId)
      );
      for (const t of targetRows.filter((t) => t.noteId === note.id)) {
        const targetId = t.targetOpportunityId ?? t.targetPersonId;
        if (!targetId || existingTargets.has(targetId)) continue;
        const cols = t.targetOpportunityId
          ? `"noteId", "targetOpportunityId"`
          : `"noteId", "targetPersonId"`;
        statements.push(
          `insert into ${schema}."noteTarget" (${cols}) values (${esc(home.id)}, ${esc(targetId)});`
        );
        existingTargets.add(targetId);
        targetsAdded++;
      }
      statements.push(`update ${schema}.note set "deletedAt" = now() where id = ${esc(note.id)};`);
      merged++;
    }
  }

  console.log(
    `would ${COMMIT ? "" : "(dry-run) "}merge+delete: ${merged}, retitle: ${retitled}, ` +
      `lines moved: ${linesMoved}, targets added: ${targetsAdded}, skipped: ${skipped}`
  );
  if (COMMIT && statements.length > 0) {
    psql(container, `begin;\n${statements.join("\n")}\ncommit;`);
    console.log(`committed ${statements.length} statements`);
  }
}

async function main(): Promise<void> {
  for (const t of targets) {
    await mergeInstance(t);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

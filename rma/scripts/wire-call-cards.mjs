/**
 * wire-call-cards.mjs — make an opportunity card answer the only two
 * questions a rental manager has when it opens: who is this, and how do I
 * reach them right now.
 *
 * WHAT WAS WRONG (seen on a live card, 2026-08-09): opening "Пропущенный лид
 * по звонку с 971508416899 из Callgear" showed Amount, Stage, Close date,
 * Company, Point of Contact, Owner — every one of them empty — then Creation
 * date, Created by "mycrm-platform-rental", External ID, External Source.
 * The phone, the WhatsApp link, the recording and the duration all exist on
 * the record, but sit BELOW that wall of nothing, so the card reads as "the
 * system knows nothing about this lead". The number was even in the title,
 * unusable, because a title is not a link.
 *
 * TWO FIXES, both reversible, neither deletes anything:
 *
 *   1. BACKFILL — for call cards whose phone lives only in the title, fill
 *      phoneTail9 and the `whatsapp` LINKS field (wa.me/<number>) so the card
 *      gets a one-click jump into the chat. Only ever fills EMPTY fields; a
 *      value someone set by hand is never touched.
 *
 *   2. LAYOUT — reorder the record page so what a human needs is at the top
 *      (stage → phone → WhatsApp → recording → who/when/how long) and the
 *      plumbing (External ID/Source, Created by) is hidden. `isVisible` and
 *      `position` are the only columns written.
 *
 *   node scripts/wire-call-cards.mjs            # dry run
 *   node scripts/wire-call-cards.mjs --commit
 *
 * Env: TWENTY_DB_CONTAINER (default twenty-rental-db-1), WORKSPACE_SCHEMA
 * (auto-detected). Runs on the box; same psql mechanics as
 * fix-brand-view-columns.mjs.
 */
import { execFileSync } from "child_process";

const COMMIT = process.argv.includes("--commit");
const CONTAINER = process.env.TWENTY_DB_CONTAINER || "twenty-rental-db-1";

const psql = (sql) =>
  execFileSync(
    "docker",
    ["exec", CONTAINER, "psql", "-U", "postgres", "-d", "default", "-At", "-F", "|", "-c", sql],
    { encoding: "utf8", maxBuffer: 1 << 26 }
  ).trim();

const SCHEMA =
  process.env.WORKSPACE_SCHEMA ||
  psql(`select table_schema from information_schema.tables where table_name='opportunity' limit 1`);
if (!SCHEMA) throw new Error(`no opportunity table in ${CONTAINER}`);

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ─── 1. Backfill phone + WhatsApp ────────────────────────────────────────────

/**
 * The dialled number as it appears in a call card's title, in either dialect:
 *   "Inbound call +971554917105 2026-08-08 …"
 *   "Пропущенный лид по звонку на 971509982525 из Callgear"
 * Longest digit run wins — a title also carries dates ("2026-08-08"), and a
 * date's runs are all shorter than a phone number's. Anything under 9 digits
 * is not dialable and is left alone rather than guessed at.
 */
function phoneFromTitle(title) {
  // Pure digit runs only. Letting the run swallow spaces or dashes merges the
  // number with the timestamp that follows it — "+971500000777 2026-08-07"
  // becomes a 22-digit nonsense that then fails the length test, which is how
  // this silently found nothing on its first outing.
  const runs = String(title).match(/\d+/g) ?? [];
  const dialable = runs
    // 00 is the international access prefix, not part of the number.
    .map((d) => (d.startsWith("00") ? d.slice(2) : d))
    // Under 9 is not dialable; over 15 breaks E.164 and in this data means a
    // doubled or corrupted title ("971585568909971585568909") — skip, never
    // guess which half is real.
    .filter((d) => d.length >= 9 && d.length <= 15);
  if (dialable.length === 0) return null;
  return dialable.sort((a, b) => b.length - a.length)[0];
}

const candidates = psql(`
  set search_path to ${SCHEMA};
  select id, name from opportunity
   where "deletedAt" is null
     and name ~ '[0-9]{9,}'
     and (coalesce("phoneTail9",'') = '' or coalesce("whatsappPrimaryLinkUrl",'') = '')
`)
  .split("\n")
  .filter((l) => l && !l.startsWith("SET"))
  .map((l) => {
    const i = l.indexOf("|");
    return { id: l.slice(0, i), name: l.slice(i + 1) };
  });

let filled = 0;
let unparsed = 0;
for (const row of candidates) {
  const phone = phoneFromTitle(row.name);
  if (!phone) {
    unparsed++;
    continue;
  }
  const tail9 = phone.slice(-9);
  const waUrl = `https://wa.me/${phone}`;
  if (!COMMIT) {
    if (filled < 5) console.log(`[phone] DRY: ${row.name.slice(0, 46)} → ${tail9} / ${waUrl}`);
    filled++;
    continue;
  }
  // coalesce guards keep this idempotent AND non-destructive: a field that
  // already has a value keeps it, so re-running never overwrites hand edits.
  psql(`
    set search_path to ${SCHEMA};
    update opportunity set
      "phoneTail9" = case when coalesce("phoneTail9",'') = '' then ${q(tail9)} else "phoneTail9" end,
      "whatsappPrimaryLinkUrl" = case when coalesce("whatsappPrimaryLinkUrl",'') = ''
                                      then ${q(waUrl)} else "whatsappPrimaryLinkUrl" end,
      "whatsappPrimaryLinkLabel" = case when coalesce("whatsappPrimaryLinkUrl",'') = ''
                                        then ${q("WhatsApp +" + phone)} else "whatsappPrimaryLinkLabel" end
    where id = ${q(row.id)}
  `);
  filled++;
}
console.log(
  COMMIT
    ? `[phone] filled ${filled} card(s); ${unparsed} title(s) had no dialable number`
    : `[phone] DRY TOTAL: ${filled} card(s) would get phone + WhatsApp; ${unparsed} unparsable`
);

// ─── 2. Record page layout ───────────────────────────────────────────────────

// Reading order for someone who just opened a missed-call card.
const TOP = [
  "stage",
  "stageDetail",
  // What the caller wanted and where they came from — the two answers the
  // manager was previously expected to dig out of a Timeline note (or could
  // not get at all). They belong above the phone: you decide whether to call
  // back by knowing what it is about.
  "callSummary",
  "callSource",
  "carModels",
  "rentalDays",
  "neededFrom",
  "amount",
  "phoneTail9",
  "whatsapp",
  "recording",
  "callStartedAt",
  "callDurationSeconds",
  "callAgentName",
  "whatsappConfirmed",
  "owner",
  "pointOfContact",
  "brandLine",
  "createdAt",
];
// Plumbing. True of every record, useful to nobody reading a lead.
const BURY = ["createdBy", "closeDate", "company", "externalId", "externalSource", "recordingUrl"];

const viewId = psql(`
  select v.id from core.view v
  join core."objectMetadata" om on om.id = v."objectMetadataId"
  where om."nameSingular" = 'opportunity'
    and v.name = 'Opportunity Record Page Fields'
    and v."deletedAt" is null
  limit 1
`);
if (!viewId) throw new Error("no 'Opportunity Record Page Fields' view — wrong instance?");

const fields = psql(`
  select fm.name, f.id, f."isVisible"::text, f.position
  from core."viewField" f
  join core."fieldMetadata" fm on fm.id = f."fieldMetadataId"
  where f."viewId" = ${q(viewId)} and f."deletedAt" is null
`)
  .split("\n")
  .filter(Boolean)
  .map((l) => {
    const [name, id, isVisible, position] = l.split("|");
    // psql renders a ::text-cast boolean as "true"/"false", never "t"/"f".
    return { name, id, isVisible: isVisible === "true", position: Number(position) };
  });
const byName = Object.fromEntries(fields.map((f) => [f.name, f]));

/**
 * A field created after the view existed has no viewField row at all, so it
 * is invisible no matter what position we write — the record page simply
 * never mentions it. Give it a row before ordering. (universalIdentifier and
 * applicationId are NOT NULL; the app id is borrowed from a sibling row.)
 */
function ensureViewFieldRow(name) {
  const fieldId = psql(`
    select fm.id from core."fieldMetadata" fm
    join core."objectMetadata" om on om.id = fm."objectMetadataId"
    where om."nameSingular" = 'opportunity' and fm.name = ${q(name)}
    limit 1
  `);
  if (!fieldId) return null; // workspace does not have the field — not an error
  if (!COMMIT) {
    console.log(`[layout] DRY: "${name}" has no row on the record page — would add one`);
    return null;
  }
  psql(`
    insert into core."viewField"
      ("universalIdentifier", id, "fieldMetadataId", "isVisible", size, position,
       "viewId", "workspaceId", "createdAt", "updatedAt", "applicationId", "isActive", "isSystemSideEffect")
    select gen_random_uuid(), gen_random_uuid(), ${q(fieldId)}, true, 150, 0,
           v.id, v."workspaceId", now(), now(),
           (select x."applicationId" from core."viewField" x
             where x."viewId" = v.id and x."applicationId" is not null limit 1),
           true, false
      from core.view v where v.id = ${q(viewId)}
  `);
  const rowId = psql(`
    select f.id from core."viewField" f
     where f."viewId" = ${q(viewId)} and f."fieldMetadataId" = ${q(fieldId)} and f."deletedAt" is null
     limit 1
  `);
  console.log(`[layout] added "${name}" to the record page`);
  return rowId ? { name, id: rowId, isVisible: true, position: 0 } : null;
}

let moved = 0;
TOP.forEach((name, i) => {
  const f = byName[name] ?? ensureViewFieldRow(name);
  if (!f) return; // field absent in this workspace — not an error
  if (f.isVisible && f.position === i) return;
  if (!COMMIT) {
    console.log(`[layout] DRY: "${name}" → top, position ${i} (now visible=${f.isVisible}, pos=${f.position})`);
  } else {
    psql(`update core."viewField" set "isVisible" = true, position = ${i} where id = ${q(f.id)}`);
  }
  moved++;
});
for (const name of BURY) {
  const f = byName[name];
  if (!f || !f.isVisible) continue;
  if (!COMMIT) {
    console.log(`[layout] DRY: would HIDE "${name}" (plumbing)`);
  } else {
    psql(`update core."viewField" set "isVisible" = false where id = ${q(f.id)}`);
  }
  moved++;
}
console.log(
  COMMIT
    ? `[layout] done — ${moved} field(s) repositioned on the record page`
    : `[layout] DRY TOTAL: ${moved} field(s) would move. Re-run with --commit.`
);

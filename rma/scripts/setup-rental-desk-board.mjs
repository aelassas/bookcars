/**
 * setup-rental-desk-board.mjs — make the rental "By Stage" kanban readable.
 *
 * WHAT WAS WRONG: the kanban card showed Twenty's six DEFAULT fields —
 * name, amount, createdBy, closeDate, company, pointOfContact. On the 1,012
 * live rental deals four of those six are empty on essentially every record
 * (company 0, pointOfContact 7, closeDate 6, amount 9), and `createdBy`
 * renders as the literal string "mycrm-platform" on every single card. So the
 * board showed one useful line (the deal name) and five rows of nothing —
 * which is what the rental team was told to work in.
 *
 * The data they need IS in the record, just not on the card:
 *   whatsapp    740/1012 (73%)  — a wa.me link, one click into the chat
 *   phoneTail9  740/1012 (73%)
 *   stageDetail 1007/1012 (99%) — the real funnel step, not the coarse stage
 *
 * WHAT THIS DOES: on the rental opportunity kanban, hides the four dead
 * fields and shows the three live ones. Nothing is deleted and no record is
 * touched — `isVisible` is flipped and missing viewField rows are inserted.
 * Re-running is a no-op. To undo, flip the same four back to isVisible=true.
 *
 * DELIBERATELY NOT SHOWN YET: carModels (0/1012) and amount (9/1012). An
 * always-empty row on a card is exactly the noise this script removes — they
 * get added the day the AI resolver actually fills them, not before.
 *
 *   node scripts/setup-rental-desk-board.mjs            # dry run
 *   node scripts/setup-rental-desk-board.mjs --commit
 *
 * Env: TWENTY_DB_CONTAINER (default twenty-rental-db-1). Runs on the box.
 * Same psql-on-the-container mechanics as fix-brand-view-columns.mjs.
 */
import { execFileSync } from "child_process";

const COMMIT = process.argv.includes("--commit");
const CONTAINER = process.env.TWENTY_DB_CONTAINER || "twenty-rental-db-1";
const VIEW_NAME = process.env.VIEW_NAME || "By Stage";

const psql = (sql) =>
  execFileSync(
    "docker",
    ["exec", CONTAINER, "psql", "-U", "postgres", "-d", "default", "-At", "-F", "|", "-c", sql],
    { encoding: "utf8", maxBuffer: 1 << 26 }
  ).trim();

// Card layout, in the order a person reads a card: who it is, how to reach
// them, where it actually stands. `position` is rewritten for these so the
// order is deterministic rather than inherited from whatever came first.
const SHOW = ["name", "whatsapp", "phoneTail9", "stageDetail"];
// Empty on ~every live deal, or pure plumbing. Hidden, never deleted.
const HIDE = ["createdBy", "closeDate", "company", "pointOfContact", "amount"];

const view = psql(`
  select v.id from core.view v
  join core."objectMetadata" om on om.id = v."objectMetadataId"
  where om."nameSingular" = 'opportunity'
    and v.name = '${VIEW_NAME.replace(/'/g, "''")}'
    and v."deletedAt" is null
  limit 1
`);
if (!view) throw new Error(`no opportunity view named "${VIEW_NAME}" in ${CONTAINER}`);

// One row per field we care about: its metadata id, and its viewField row on
// this view if it already has one.
const rows = psql(`
  select fm.name, fm.id,
         coalesce(f.id::text, ''), coalesce(f."isVisible"::text, ''), coalesce(f.position::text, '')
  from core."fieldMetadata" fm
  join core."objectMetadata" om on om.id = fm."objectMetadataId"
  left join core."viewField" f
         on f."fieldMetadataId" = fm.id and f."viewId" = '${view}' and f."deletedAt" is null
  where om."nameSingular" = 'opportunity'
    and fm.name in (${[...SHOW, ...HIDE].map((n) => `'${n}'`).join(",")})
`)
  .split("\n")
  .filter(Boolean)
  .map((l) => {
    const [name, fieldId, viewFieldId, isVisible, position] = l.split("|");
    // psql renders a ::text-cast boolean as "true"/"false", NOT the "t"/"f"
    // of an uncast column. Getting this wrong reads every visible field as
    // hidden, and the script then "helpfully" reports no work to do.
    return { name, fieldId, viewFieldId, isVisible: isVisible === "true", position };
  });

const by = Object.fromEntries(rows.map((r) => [r.name, r]));
const missing = [...SHOW, ...HIDE].filter((n) => !by[n]);
if (missing.length) throw new Error(`fields absent from this workspace: ${missing.join(", ")}`);

// workspaceId/applicationId are NOT NULL and have no default — borrow them
// from a viewField that already exists on this very view.
const [wsId, appId] = psql(`
  select "workspaceId", "applicationId" from core."viewField"
  where "viewId" = '${view}' and "deletedAt" is null limit 1
`).split("|");
if (!wsId) throw new Error("this view has no viewField rows to copy workspaceId from");

let changes = 0;

SHOW.forEach((name, i) => {
  const f = by[name];
  if (!f.viewFieldId) {
    if (!COMMIT) {
      console.log(`[card] DRY: would ADD "${name}" at position ${i}`);
    } else {
      psql(`
        insert into core."viewField"
          ("universalIdentifier","fieldMetadataId","isVisible","size","position",
           "viewId","workspaceId","applicationId","isActive","isSystemSideEffect")
        values (uuid_generate_v4(), '${f.fieldId}', true, 0, ${i},
                '${view}', '${wsId}', '${appId}', true, false)
      `);
      console.log(`[card] added "${name}" at position ${i}`);
    }
    changes++;
    return;
  }
  if (f.isVisible && String(f.position) === String(i)) {
    console.log(`[card] "${name}" already shown at position ${i}`);
    return;
  }
  if (!COMMIT) {
    console.log(`[card] DRY: would SHOW "${name}" at position ${i} (now visible=${f.isVisible}, pos=${f.position})`);
  } else {
    psql(`update core."viewField" set "isVisible" = true, position = ${i} where id = '${f.viewFieldId}'`);
    console.log(`[card] shown "${name}" at position ${i}`);
  }
  changes++;
});

for (const name of HIDE) {
  const f = by[name];
  if (!f.viewFieldId || !f.isVisible) {
    console.log(`[card] "${name}" already hidden`);
    continue;
  }
  if (!COMMIT) {
    console.log(`[card] DRY: would HIDE "${name}" (empty on ~every live deal)`);
  } else {
    psql(`update core."viewField" set "isVisible" = false where id = '${f.viewFieldId}'`);
    console.log(`[card] hidden "${name}"`);
  }
  changes++;
}

console.log(
  COMMIT
    ? `[card] done — ${changes} change(s) on "${VIEW_NAME}"`
    : `[card] DRY TOTAL: ${changes} change(s) would be made. Re-run with --commit.`
);

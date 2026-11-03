/**
 * fix-brand-view-columns.mjs — give the per-brand Twenty views their columns.
 *
 * WHAT WAS WRONG: scripts/create-brand-views.mjs creates a view and its
 * "Brand Line = x" filter, but never creates any viewField rows. Twenty then
 * renders the view header with a correct record count and a completely EMPTY
 * table — no columns, no rows. All six rental brand views (Cardiwan /
 * EasyRent (ETM) × company, person, opportunity) were in that state, which is
 * exactly the screen the rental managers were told to work in.
 *
 * A view with a right filter and no columns is worse than no view: the count
 * proves the data is there, so the blank table reads as "the system lost my
 * records".
 *
 * WHAT THIS DOES: copies the column layout (fieldMetadataId, position, size,
 * visibility) from that object's default "All …" view into every brand view
 * that has none. Views that already have columns are left untouched, so a
 * layout someone tuned by hand is never overwritten.
 *
 *   node scripts/fix-brand-view-columns.mjs            # dry run
 *   node scripts/fix-brand-view-columns.mjs --commit
 *
 * Env: TWENTY_DB_CONTAINER (default twenty-rental-db-1). Runs on the box.
 */
import { execFileSync } from "child_process";

const COMMIT = process.argv.includes("--commit");
const CONTAINER = process.env.TWENTY_DB_CONTAINER || "twenty-rental-db-1";

const psql = (sql) =>
  execFileSync("docker", ["exec", CONTAINER, "psql", "-U", "postgres", "-d", "default", "-At", "-F", "|", "-c", sql], {
    encoding: "utf8", maxBuffer: 1 << 26,
  }).trim();

// Brand views = every view on company/person/opportunity that is NOT the
// object's own default "All …" view and NOT a record-page field layout.
const rows = psql(`
  select v.id, v.name, om."nameSingular",
         (select count(*) from core."viewField" f where f."viewId" = v.id and f."deletedAt" is null)
  from core.view v
  join core."objectMetadata" om on om.id = v."objectMetadataId"
  where om."nameSingular" in ('company','person','opportunity')
    and v.name not like 'All {%'
    and v.name not like '%Record Page Fields'
    and v."deletedAt" is null
  order by om."nameSingular", v.name
`).split("\n").filter(Boolean).map((l) => {
  const [id, name, object, fields] = l.split("|");
  return { id, name, object, fields: Number(fields) };
});

let fixed = 0;
for (const v of rows) {
  if (v.fields > 0) {
    console.log(`[views] ${v.object}/${v.name}: ${v.fields} column(s) already — left alone`);
    continue;
  }
  const src = psql(`
    select v.id from core.view v
    join core."objectMetadata" om on om.id = v."objectMetadataId"
    where om."nameSingular" = '${v.object}' and v.name like 'All {%' and v."deletedAt" is null
    limit 1
  `);
  if (!src) { console.warn(`[views] ${v.object}/${v.name}: no default "All …" view to copy from — SKIPPED`); continue; }

  if (!COMMIT) {
    const n = psql(`select count(*) from core."viewField" where "viewId"='${src}' and "deletedAt" is null`);
    console.log(`[views] DRY: ${v.object}/${v.name} would get ${n} column(s)`);
    fixed++;
    continue;
  }
  // universalIdentifier is NOT NULL with no default — generate one per row, or
  // the insert fails for every view at once.
  psql(`
    insert into core."viewField"
      ("universalIdentifier","fieldMetadataId","isVisible","size","position","viewId","workspaceId","applicationId","isActive","isSystemSideEffect")
    select uuid_generate_v4(), f."fieldMetadataId", f."isVisible", f.size, f.position,
           '${v.id}', f."workspaceId", f."applicationId", true, false
    from core."viewField" f
    where f."viewId" = '${src}' and f."deletedAt" is null
  `);
  const now = psql(`select count(*) from core."viewField" where "viewId"='${v.id}' and "deletedAt" is null`);
  console.log(`[views] ${v.object}/${v.name}: ${now} column(s) copied from the default view`);
  fixed++;
}
console.log(COMMIT ? `[views] done — ${fixed} view(s) repaired` : `[views] DRY TOTAL: ${fixed} view(s) would be repaired`);

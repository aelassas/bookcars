/**
 * make-pipeline-kanban.mjs — give a Twenty instance a usable pipeline board.
 *
 *   node scripts/make-pipeline-kanban.mjs                      # dry run
 *   node scripts/make-pipeline-kanban.mjs --commit
 *   TWENTY_DB_CONTAINER=twenty-rental-db-1 node ... --commit    # the rental side
 *
 * WHY: Azat's first complaint after logging in was "they are just one long
 * list — I need to see which is new, which I already answered, which needs a
 * push". Twenty already ships a KANBAN view called "By Stage"; nobody had
 * shown it to him, and it carries no filter, so it renders every deal ever
 * imported. On the sales instance that is 58,400 Lost and 19,624 Customer
 * against 869 that are actually alive — a board that big is not a board.
 *
 * This adds an IS_NOT filter on stage so the columns hold only live work, and
 * leaves the view's own name and columns alone. Idempotent: an existing filter
 * on the same field is left in place rather than duplicated.
 */
import { execFileSync } from "child_process";

const COMMIT = process.argv.includes("--commit");
const CONTAINER = process.env.TWENTY_DB_CONTAINER || "twenty-db-1";
/** Stages that mean "finished" — kept out of the board, not deleted. */
const CLOSED = (process.env.KANBAN_HIDE_STAGES || "LOST,CUSTOMER").split(",").map((s) => s.trim()).filter(Boolean);

const psql = (sql) =>
  execFileSync("docker", ["exec", CONTAINER, "psql", "-U", "postgres", "-d", "default", "-At", "-F", "|", "-c", sql],
    { encoding: "utf8" }).trim();

const view = psql(`
  select v.id, v.name, v.type, v."workspaceId", v."applicationId"
  from core.view v
  join core."objectMetadata" om on om.id = v."objectMetadataId"
  where om."nameSingular" = 'opportunity' and v.type = 'KANBAN' and v."deletedAt" is null
  limit 1`);
if (!view) { console.error("no KANBAN view on opportunity — create one in the UI first"); process.exit(1); }
const [viewId, viewName, viewType, workspaceId, applicationId] = view.split("|");

const stageField = psql(`
  select fm.id from core."fieldMetadata" fm
  join core."objectMetadata" om on om.id = fm."objectMetadataId"
  where om."nameSingular" = 'opportunity' and fm.name = 'stage' limit 1`);
if (!stageField) { console.error("no stage field on opportunity"); process.exit(1); }

console.log(`[kanban] view "${viewName}" (${viewType}) on ${CONTAINER}`);

// What the board would hold, so the effect is visible before writing anything.
const schema = psql(`select nspname from pg_namespace where nspname like 'workspace%' order by 1 limit 1`);
const live = psql(`
  select coalesce(sum(case when stage::text = any(string_to_array('${CLOSED.join(",")}', ',')) then 0 else 1 end), 0),
         count(*)
  from "${schema}".opportunity`);
const [liveCount, totalCount] = live.split("|");
console.log(`[kanban] board would show ${liveCount} live deal(s) out of ${totalCount} — hiding ${CLOSED.join(", ")}`);

const existing = psql(`
  select count(*) from core."viewFilter"
  where "viewId" = '${viewId}' and "fieldMetadataId" = '${stageField}' and "deletedAt" is null`);
if (Number(existing) > 0) {
  console.log(`[kanban] a stage filter is already on this view — left alone (${existing})`);
  process.exit(0);
}

if (!COMMIT) {
  console.log(`[kanban] DRY: would add ${CLOSED.length} IS_NOT filter(s) on stage. Re-run with --commit.`);
  process.exit(0);
}

// ONE row holding a JSON ARRAY of option values. A SELECT filter must be
// shaped this way: writing one row per stage with a bare JSON string
// ('"LOST"') made Twenty render "Sorry, something went wrong" instead of the
// board. Learned by breaking it on the live sales instance and reverting.
psql(`
  insert into core."viewFilter"
    ("universalIdentifier","fieldMetadataId","operand","value","viewId","workspaceId","applicationId")
  values (uuid_generate_v4(), '${stageField}', 'IS_NOT',
          '${JSON.stringify(CLOSED)}'::jsonb, '${viewId}', '${workspaceId}', '${applicationId}')`);
console.log(`[kanban] hidden: ${CLOSED.join(", ")}`);
console.log(`[kanban] done — flush the cache and restart the server, or Twenty keeps serving the old view definition`);

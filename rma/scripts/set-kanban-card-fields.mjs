// set-kanban-card-fields.mjs — put the USEFUL fields on the face of a Twenty
// Kanban card, and hide the empty defaults.
//
// The board card shows a view's visible viewFields. New Twenty opportunities
// default to name + amount + closeDate + company + pointOfContact + owner —
// which for our mirrored/call leads are almost all EMPTY, so the card reads as
// blank and staff have to open each one. This makes the fields that actually
// carry data (what they wanted, which car, phone, stage) visible on the front,
// and hides the empties. Idempotent: re-running is a no-op.
//
//   node scripts/set-kanban-card-fields.mjs --container twenty-db-1 \
//       --view <kanbanViewId> --fields name,carModels,stageDetail,phoneTail9,brandLine
//   ...add --commit to write. Dry run prints the plan.
//
// Runs on the box (needs docker access to the Twenty DB container).
import { execFileSync } from "child_process";

const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const COMMIT = process.argv.includes("--commit");
const CONTAINER = arg("container");
const VIEW = arg("view");
const FIELDS = (arg("fields") || "").split(",").map((s) => s.trim()).filter(Boolean);
if (!CONTAINER || !VIEW || FIELDS.length === 0) {
  console.error("usage: --container <c> --view <viewId> --fields a,b,c [--commit]");
  process.exit(2);
}

const q = (sql) =>
  execFileSync(
    "docker",
    ["exec", CONTAINER, "psql", "-U", "postgres", "-d", "default", "-At", "-F", "|", "-c", sql],
    { encoding: "utf8", maxBuffer: 1 << 26 },
  ).trim();

// The view's object + its workspace/application ids (copied onto inserts).
const [meta] = q(
  `select v."objectMetadataId", v."workspaceId",
          (select f."applicationId" from core."viewField" f where f."viewId" = v.id limit 1)
   from core.view v where v.id = '${VIEW}'`,
).split("\n").filter(Boolean).map((l) => l.split("|"));
if (!meta) throw new Error(`view ${VIEW} not found`);
const [objectMetadataId, workspaceId, applicationId] = meta;

// Field name -> fieldMetadataId for this object.
const fieldIds = Object.fromEntries(
  q(
    `select name, id from core."fieldMetadata"
     where "objectMetadataId" = '${objectMetadataId}' and name in (${FIELDS.map((f) => `'${f}'`).join(",")})`,
  ).split("\n").filter(Boolean).map((l) => l.split("|")),
);
const missing = FIELDS.filter((f) => !fieldIds[f]);
if (missing.length) throw new Error(`fields not found on object: ${missing.join(", ")}`);

// Existing viewFields for this view: fieldMetadataId -> {id, isVisible}.
const existing = Object.fromEntries(
  q(
    `select "fieldMetadataId", id, "isVisible" from core."viewField"
     where "viewId" = '${VIEW}' and "deletedAt" is null`,
  ).split("\n").filter(Boolean).map((l) => {
    const [fmId, id, vis] = l.split("|");
    return [fmId, { id, visible: vis === "t" }];
  }),
);

const wanted = new Set(FIELDS.map((f) => fieldIds[f]));
const stmts = [];

// 1) Desired fields: make visible at the chosen order (insert if missing).
FIELDS.forEach((name, pos) => {
  const fmId = fieldIds[name];
  const ex = existing[fmId];
  if (ex) {
    stmts.push(
      `update core."viewField" set "isVisible"=true, position=${pos}, "updatedAt"=now() where id='${ex.id}';`,
    );
  } else {
    stmts.push(
      `insert into core."viewField" ("universalIdentifier","fieldMetadataId","viewId","workspaceId","applicationId","position","isVisible","size") ` +
        `values (uuid_generate_v4(),'${fmId}','${VIEW}','${workspaceId}','${applicationId}',${pos},true,150);`,
    );
  }
});
// 2) Everything else currently visible -> hide.
for (const [fmId, ex] of Object.entries(existing)) {
  if (!wanted.has(fmId) && ex.visible) {
    stmts.push(`update core."viewField" set "isVisible"=false, "updatedAt"=now() where id='${ex.id}';`);
  }
}

console.log(`View ${VIEW} on ${CONTAINER}: ${FIELDS.length} fields to front, ${stmts.length} statements.`);
console.log(`  front: ${FIELDS.join(" · ")}`);
if (!COMMIT) {
  console.log("Dry run — pass --commit to apply.");
  process.exit(0);
}
q(`begin; ${stmts.join(" ")} commit;`);
console.log("Applied.");

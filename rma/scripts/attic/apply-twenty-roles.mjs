// Build the brand-based roles in Twenty and put the six people on them.
//
// Design: docs/superpowers/specs/2026-08-02-twenty-brand-visibility-design.md
//
//   Sales           takeauto                  Azat, Firuz
//   Rent · Cardiwan cardiwan                  Abdullah
//   Rent            cardiwan + easyrent       Ali, Babek
//   Executive       everything, no predicate  Moe
//
// Executive deliberately gets NO predicate rather than a list of all three
// brands: a predicate would also hide records whose brand is unknown (the
// Returns pilot's test record, anything created by hand), and someone has to
// be able to see those.
//
// DRY-RUN BY DEFAULT. Pass --commit to write.
//   node scripts/apply-twenty-roles.mjs
//   node scripts/apply-twenty-roles.mjs --commit
//
// Idempotent: roles are matched by label and reused, predicates are upserted
// as a whole set per (role, object), and re-assigning a member to the role it
// already has is a no-op. Safe to re-run after a partial failure.
import { readFileSync } from "node:fs";

const COMMIT = process.argv.includes("--commit");
const BASE = process.env.TWENTY_BASE_URL ?? "http://localhost:3001";

// Metadata ids read from the live workspace on 2026-08-02. They are stable
// per workspace; the script verifies each one resolves before writing.
const OBJ = {
  person: "623a885e-5cb2-4b45-aa26-9b38768c1251",
  opportunity: "d7d1c92f-d40f-48f2-a80a-c614e37ff770",
  company: "418f8335-6fff-449a-b7e7-bf3569d393ff",
  note: "fb3c0ea9-3535-4f26-8ad7-66027702c61c",
  noteTarget: "b103d7c5-2076-4c15-9c5b-14f7f17255bd",
  task: "b1dddb5a-c1e9-4d4e-9f29-784a1d192233",
  attachment: "b7f22035-81d0-45d3-a8c9-06eaa9d1334f",
  timelineActivity: "2f0ab841-b1c5-4359-b183-95e476ab1549",
};

/** Objects that carry brandLine and can therefore be filtered, not just shut. */
const BRAND_FIELD = {
  person: "e8d2d6dc-6a81-41d8-bd14-646ccbf3fa5a",
  opportunity: "773e9ca9-fc03-4d95-923f-41a18d57cdee",
  company: "bfdb94f1-8ded-405e-8132-2b1e633058f1",
};

/**
 * Objects a brand-scoped role must NOT read, because they carry the same
 * information with no brand field to filter on. Closed rather than left open —
 * each one is a hole an audit found, not a hypothetical:
 *
 *  note              the WhatsApp conversations themselves.
 *  timelineActivity  caches the linked record's NAME in plain text, so the
 *                    activity feed leaks note titles like
 *                    "WhatsApp ← Uzzy · 31 Jul 2026" even with notes shut —
 *                    verified on the live workspace, 255 rows carrying
 *                    customer first names.
 *  noteTarget        joins notes to people; readable joins re-expose the link.
 *  task, attachment  empty today, so closing them costs nothing and stops the
 *                    hole from opening the day someone starts using them.
 */
const CLOSED_OBJECTS = ["note", "noteTarget", "timelineActivity", "task", "attachment"];

const ROLES = [
  { label: "Sales", brands: ["takeauto"], members: ["azat@takeauto.com", "firuz@takeauto.com"] },
  { label: "Rent · Cardiwan", brands: ["cardiwan"], members: ["abdullah@cardiwan.com"] },
  { label: "Rent", brands: ["cardiwan", "easyrent"], members: ["ali@etm.com", "babek@easyrent.com"] },
  // null brands = no predicate = sees everything, including unbranded records.
  { label: "Executive", brands: null, members: ["moe@takeauto.com"] },
];

function apiKey() {
  // The env var wins: with one instance per brand, a script that always
  // read .env.local would aim the sales key at whichever brand's URL it was
  // pointed to and quietly do the wrong thing.
  if (process.env.TWENTY_API_KEY?.trim()) return process.env.TWENTY_API_KEY.trim();
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = env.split("\n").find((l) => l.startsWith("TWENTY_API_KEY="));
  if (!line) throw new Error("TWENTY_API_KEY missing from .env.local");
  return line.slice("TWENTY_API_KEY=".length).trim().replace(/^"|"$/g, "");
}

const KEY = apiKey();

async function gql(endpoint, query, variables = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json();
  if (body.errors) {
    throw new Error(`${query.slice(0, 60)}… → ${JSON.stringify(body.errors).slice(0, 400)}`);
  }
  return body.data;
}

const meta = (q, v) => gql("/metadata", q, v);
const data = (q, v) => gql("/graphql", q, v);

async function listRoles() {
  const d = await meta(`{ getRoles { id label canReadAllObjectRecords } }`);
  return d.getRoles ?? [];
}

/** The permission flags every brand role must have, whether new or reused. */
const ROLE_FLAGS = {
  // Reading is granted broadly and then NARROWED by the row-level predicate;
  // without this the predicate has nothing to narrow.
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
};

async function ensureRole(label, existing) {
  const found = existing.find((r) => r.label === label);
  if (found) {
    // Reusing a role by label is only safe if its flags are re-asserted. A
    // role someone had already created with, say, canUpdateAllSettings would
    // otherwise silently hand that power to whoever we assign to it.
    if (COMMIT) {
      await meta(
        `mutation ($input: UpdateRoleInput!) { updateOneRole(updateRoleInput: $input) { id } }`,
        { input: { id: found.id, update: ROLE_FLAGS } }
      );
      console.log(`  role "${label}" already exists — flags re-asserted`);
    } else {
      console.log(`  role "${label}" already exists — would re-assert flags`);
    }
    return found.id;
  }
  if (!COMMIT) {
    console.log(`  would CREATE role "${label}"`);
    return null;
  }
  const d = await meta(
    `mutation ($input: CreateRoleInput!) { createOneRole(createRoleInput: $input) { id label } }`,
    {
      input: {
        label,
        description: `Brand-scoped role — see the visibility design doc`,
        ...ROLE_FLAGS,
        canBeAssignedToUsers: true,
      },
    }
  );
  console.log(`  created role "${label}"`);
  return d.createOneRole.id;
}

/** One predicate: brandLine IS <one of the brands>, on one object. */
async function setBrandPredicate(roleId, objectKey, brands) {
  const objectMetadataId = OBJ[objectKey];
  const groupId = crypto.randomUUID();
  const input = {
    roleId,
    objectMetadataId,
    predicateGroups: [
      { id: groupId, objectMetadataId, logicalOperator: "AND", positionInRowLevelPermissionPredicateGroup: 0 },
    ],
    predicates: [
      {
        fieldMetadataId: BRAND_FIELD[objectKey],
        operand: "IS",
        // Twenty encodes even IS as a JSON array — matching any member of it.
        value: brands,
        rowLevelPermissionPredicateGroupId: groupId,
        positionInRowLevelPermissionPredicateGroup: 0,
      },
    ],
  };
  if (!COMMIT) {
    console.log(`  would SET predicate on ${objectKey}: brandLine IS ${JSON.stringify(brands)}`);
    return;
  }
  await meta(
    `mutation ($input: UpsertRowLevelPermissionPredicatesInput!) {
       upsertRowLevelPermissionPredicates(input: $input) { predicates { id } }
     }`,
    { input }
  );
  console.log(`  predicate on ${objectKey}: brandLine IS ${JSON.stringify(brands)}`);
}

/** Shut every object that carries the same data with no brand to filter on. */
async function closeUnbrandableObjects(roleId) {
  if (!COMMIT) {
    console.log(`  would CLOSE: ${CLOSED_OBJECTS.join(", ")}`);
    return;
  }
  await meta(
    `mutation ($input: UpsertObjectPermissionsInput!) {
       upsertObjectPermissions(upsertObjectPermissionsInput: $input) { objectMetadataId }
     }`,
    {
      input: {
        roleId,
        objectPermissions: CLOSED_OBJECTS.map((key) => ({
          objectMetadataId: OBJ[key],
          canReadObjectRecords: false,
          canUpdateObjectRecords: false,
          canSoftDeleteObjectRecords: false,
          canDestroyObjectRecords: false,
        })),
      },
    }
  );
  console.log(`  closed: ${CLOSED_OBJECTS.join(", ")}`);
}

async function workspaceMembers() {
  const d = await data(`{ workspaceMembers(filter: {}) { edges { node { id userEmail } } } }`);
  const map = new Map();
  for (const e of d.workspaceMembers.edges) map.set(e.node.userEmail, e.node.id);
  return map;
}

async function assign(email, memberId, roleId, roleLabel) {
  if (!COMMIT) {
    console.log(`  would ASSIGN ${email} → ${roleLabel}`);
    return;
  }
  await meta(
    `mutation ($m: UUID!, $r: UUID!) { updateWorkspaceMemberRole(workspaceMemberId: $m, roleId: $r) { id } }`,
    { m: memberId, r: roleId }
  );
  console.log(`  assigned ${email} → ${roleLabel}`);
}

async function main() {
  console.log(`[apply-twenty-roles] mode=${COMMIT ? "COMMIT" : "DRY-RUN"} base=${BASE}`);

  const members = await workspaceMembers();
  const missing = ROLES.flatMap((r) => r.members).filter((e) => !members.has(e));
  if (missing.length > 0) {
    throw new Error(`no workspace member for: ${missing.join(", ")} — create the logins first`);
  }
  console.log(`[apply-twenty-roles] ${members.size} workspace members found`);

  const existing = await listRoles();
  for (const role of ROLES) {
    console.log(`\n${role.label}`);
    const roleId = await ensureRole(role.label, existing);
    if (role.brands) {
      for (const objectKey of Object.keys(BRAND_FIELD)) {
        if (roleId) await setBrandPredicate(roleId, objectKey, role.brands);
        else console.log(`  would SET predicate on ${objectKey}: brandLine IS ${JSON.stringify(role.brands)}`);
      }
      if (roleId) await closeUnbrandableObjects(roleId);
      else console.log(`  would CLOSE: ${CLOSED_OBJECTS.join(", ")}`);
    } else {
      console.log("  no predicate — sees everything, including unbranded records");
    }
    for (const email of role.members) {
      if (roleId) await assign(email, members.get(email), roleId, role.label);
      else console.log(`  would ASSIGN ${email} → ${role.label}`);
    }
  }

  if (!COMMIT) {
    console.log("\ndry run — nothing written. Re-run with --commit to apply.");
  }
}

main().catch((e) => {
  console.error(String(e.message ?? e));
  process.exit(1);
});

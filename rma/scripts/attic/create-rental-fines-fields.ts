// Create the fines/Salik fields on the Twenty RENTAL workspace (:3002):
//
//   vehicle.salikAed        NUMBER    "Salik AED (current rental)"
//   vehicle.rtaFinesAed     NUMBER    "RTA fines AED (outstanding)"
//   vehicle.finesCheckedAt  DATE_TIME "Fines checked at"
//   rental.salikAed         NUMBER    "Salik AED"
//   rental.rtaFinesAed      NUMBER    "RTA fines AED"
//   rental.finesCheckedAt   DATE_TIME "Fines checked at"
//   rental.finesBreakdown   TEXT      "Fines breakdown"
//   rental.externalId       TEXT      — upsert key (`cal3:<plate>:<fromISO>`);
//                          the rental object shipped without one and
//                          rental-fines-sync.ts cannot upsert without it.
//
// Idempotent: a field that already exists (matched by object+name) is left
// untouched, so re-running is safe. Only CREATES fields — never edits SELECT
// options (the id-stripping incident).
//
// Usage (from platform/, on the box):
//   node --require ./node_modules/tsx/dist/preflight.cjs \
//        --import file://$PWD/node_modules/tsx/dist/loader.mjs \
//        scripts/create-rental-fines-fields.ts
//
// Env: TWENTY_RENTAL_BASE_URL / TWENTY_RENTAL_API_KEY (from .env.local).
//
// Twenty caches field metadata: if anything was created, flush on the box:
//   docker restart twenty-rental-server-1 twenty-rental-worker-1
import { config } from "dotenv";
config({ path: ".env.local" });
import { createTwentyClient, type TwentyCreateFieldInput } from "@/platform/integrations/twenty/client";
import { resolveTwentyInstance } from "@/platform/integrations/twenty/instance";

const VEHICLE_OBJECT_ID = "6a9d4eec-376c-41bc-afbd-8b72bd971a1c";
const RENTAL_OBJECT_ID = "66ffa2d5-8ce8-4567-b1de-4057e4a84595";

const FIELDS: TwentyCreateFieldInput[] = [
  // vehicle
  { objectMetadataId: VEHICLE_OBJECT_ID, name: "salikAed", label: "Salik AED (current rental)", type: "NUMBER", icon: "IconRoad", isNullable: true },
  { objectMetadataId: VEHICLE_OBJECT_ID, name: "rtaFinesAed", label: "RTA fines AED (outstanding)", type: "NUMBER", icon: "IconGavel", isNullable: true },
  { objectMetadataId: VEHICLE_OBJECT_ID, name: "finesCheckedAt", label: "Fines checked at", type: "DATE_TIME", icon: "IconRefresh", isNullable: true },
  // rental
  { objectMetadataId: RENTAL_OBJECT_ID, name: "salikAed", label: "Salik AED", type: "NUMBER", icon: "IconRoad", isNullable: true },
  { objectMetadataId: RENTAL_OBJECT_ID, name: "rtaFinesAed", label: "RTA fines AED", type: "NUMBER", icon: "IconGavel", isNullable: true },
  { objectMetadataId: RENTAL_OBJECT_ID, name: "finesCheckedAt", label: "Fines checked at", type: "DATE_TIME", icon: "IconRefresh", isNullable: true },
  { objectMetadataId: RENTAL_OBJECT_ID, name: "finesBreakdown", label: "Fines breakdown", type: "TEXT", icon: "IconList", isNullable: true },
  { objectMetadataId: RENTAL_OBJECT_ID, name: "externalId", label: "External ID", type: "TEXT", icon: "IconKey", isNullable: true },
];

async function main() {
  const cfg = resolveTwentyInstance("rental");
  if (!cfg.configured) throw new Error("TWENTY_RENTAL_API_KEY not configured");
  const client = createTwentyClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, mode: "live" });

  const existing = await client.metadata.listFields();
  const have = new Set(existing.map((f) => `${f.objectMetadataId}:${f.name}`));

  const created: string[] = [];
  const present: string[] = [];
  for (const input of FIELDS) {
    const key = `${input.objectMetadataId}:${input.name}`;
    if (have.has(key)) {
      present.push(input.name);
      continue;
    }
    const f = await client.metadata.createField(input);
    created.push(`${input.name} (${f.id})`);
    console.log(`created ${input.name}: ${f.id}`);
  }

  console.log(`fields created: ${created.join(", ") || "(none)"}`);
  console.log(`already present: ${present.join(", ") || "(none)"}`);
  if (created.length > 0) {
    console.log("cache flush REQUIRED on the box (Twenty caches field metadata):");
    console.log("  docker restart twenty-rental-server-1 twenty-rental-worker-1");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Add motion-tracking fields to the Twenty RENTAL vehicle object (:3002):
//   vehicle.motion       TEXT      "Motion"      — "Moving · 42 km/h" / "Idling" / "Parked"
//   vehicle.lastMovedAt  DATE_TIME "Last moved"  — last fix with speed > 3 km/h
// Written by scripts/pilot-live-location.ts every 5 min. Idempotent (create-only).
import { config } from "dotenv";
config({ path: ".env.local" });
import { createTwentyClient, type TwentyCreateFieldInput } from "@/platform/integrations/twenty/client";
import { resolveTwentyInstance } from "@/platform/integrations/twenty/instance";

const VEHICLE_OBJECT_ID = "6a9d4eec-376c-41bc-afbd-8b72bd971a1c";

const FIELDS: TwentyCreateFieldInput[] = [
  { objectMetadataId: VEHICLE_OBJECT_ID, name: "motion", label: "Motion", type: "TEXT", icon: "IconSteeringWheel", isNullable: true },
  { objectMetadataId: VEHICLE_OBJECT_ID, name: "lastMovedAt", label: "Last moved", type: "DATE_TIME", icon: "IconClockPlay", isNullable: true },
];

async function main() {
  const cfg = resolveTwentyInstance("rental");
  if (!cfg.configured) throw new Error("TWENTY_RENTAL_API_KEY not configured");
  const client = createTwentyClient({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, mode: "live" });
  const existing = await client.metadata.listFields();
  const have = new Set(existing.map((f) => `${f.objectMetadataId}:${f.name}`));
  for (const input of FIELDS) {
    if (have.has(`${input.objectMetadataId}:${input.name}`)) {
      console.log(`present: ${input.name}`);
      continue;
    }
    const f = await client.metadata.createField(input);
    console.log(`created ${input.name}: ${f.id}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

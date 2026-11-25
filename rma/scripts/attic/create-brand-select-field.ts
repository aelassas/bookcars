// One-off: add the `brand` SELECT field to the RENTAL workspace opportunity —
// a colored chip on the kanban card so Ayham's desk sees Cardiwan / EasyRent /
// ETM by color (owner 2026-09-02: "each brand one color, keep everything
// together in one view"). Twenty cannot color a whole card; a colored select
// chip is the mechanism Twenty offers.
//
// The data already exists: `brandLine` (TEXT) is stamped on every card by the
// relay (mirror.ts brandLineForLine) and drives role row-level predicates.
// This SELECT is a DISPLAY mirror of it — backfilled here, kept fresh by the
// relay (wa-lead-relay sets both) and by scripts/backfill-brand-select.ts for
// anything older.
//
// Usage (from platform/): npx tsx scripts/create-brand-select-field.ts
import { config } from "dotenv";
config({ path: ".env.local" });
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";

const OPTIONS = [
  { label: "Cardiwan", value: "CARDIWAN", color: "red", position: 0 },
  { label: "EasyRent", value: "EASYRENT", color: "blue", position: 1 },
  { label: "ETM", value: "ETM", color: "green", position: 2 },
  { label: "Take Auto", value: "TAKEAUTO", color: "gray", position: 3 },
];

async function main() {
  const client = getTwentyClientForInstance("rental");
  const objects = await client.metadata.listObjects();
  const opp = objects.find((o) => o.nameSingular === "opportunity");
  if (!opp?.id) throw new Error("no opportunity object metadata found");
  const fields = await client.metadata.listFields();
  const existing = fields.find((f) => f.objectMetadataId === opp.id && f.name === "brand");
  if (existing) {
    console.log("[brand] field already exists — nothing to do");
    return;
  }
  await client.metadata.createField({
    objectMetadataId: opp.id,
    name: "brand",
    label: "Brand",
    type: "SELECT",
    options: OPTIONS,
    description: "Business brand of the lead — colored chip on the kanban card (Ayham 2026-09-02). Mirrors brandLine, which stays the source of truth.",
    icon: "IconTag",
  });
  console.log("[brand] SELECT field created with colored options:", OPTIONS.map((o) => o.value).join(", "));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

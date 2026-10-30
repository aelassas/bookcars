// One-off: add the `lossReason` TEXT field to the opportunity object of each
// configured Twenty instance (Ayham 2026-08-17: "see the reason in case the
// deal was unsuccessful"). Idempotent — an instance that already has the field
// is skipped. stage-progression.ts blank-fills it; managers read and edit it.
//
// Usage (from platform/): npx tsx scripts/add-loss-reason-field.ts
import { config } from "dotenv";
config({ path: ".env.local" });
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import { resolveTwentyInstance, type TwentyInstanceKey } from "@/platform/integrations/twenty/instance";

const KEYS: TwentyInstanceKey[] = ["default", "rental"];

async function main() {
  for (const key of KEYS) {
    if (!resolveTwentyInstance(key).configured) {
      console.log(`[loss-reason] '${key}': not configured — skipped`);
      continue;
    }
    const client = getTwentyClientForInstance(key);
    const objects = await client.metadata.listObjects();
    const opp = objects.find((o) => o.nameSingular === "opportunity");
    if (!opp?.id) {
      console.error(`[loss-reason] '${key}': no opportunity object metadata found — skipped`);
      continue;
    }
    const fields = await client.metadata.listFields();
    const exists = fields.some((f) => f.objectMetadataId === opp.id && f.name === "lossReason");
    if (exists) {
      console.log(`[loss-reason] '${key}': lossReason already exists — nothing to do`);
      continue;
    }
    await client.metadata.createField({
      objectMetadataId: opp.id,
      name: "lossReason",
      label: "Loss Reason",
      type: "TEXT",
      description: "Why the deal was unsuccessful — AI-suggested, human-editable.",
      icon: "IconThumbDown",
    });
    console.log(`[loss-reason] '${key}': lossReason field created`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

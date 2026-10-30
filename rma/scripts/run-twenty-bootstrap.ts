import { config } from "dotenv";
config({ path: ".env.local" });
import { getTwentyClient } from "@/platform/integrations/twenty/client";
import { bootstrapTwentySchema } from "@/platform/integrations/twenty/schema-bootstrap";

// One-shot: bring the live Twenty workspace schema to the desired state.
// Idempotent — a second run must report zero creations (that is the check).
async function main() {
  const client = getTwentyClient();
  const r = await bootstrapTwentySchema(client);
  console.log("objectsCreated:", r.objectsCreated.join(", ") || "(none)");
  console.log("fieldsCreated:", r.fieldsCreated.length, r.fieldsCreated.join(", "));
  console.log("alreadyPresent:", r.alreadyPresent.length);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

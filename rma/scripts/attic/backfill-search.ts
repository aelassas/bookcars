import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { reindexTenant } from "@/modules/search/ingest";

async function main() {
  const [t] = await db.select().from(tenant).where(eq(tenant.slug, "take-auto")).limit(1);
  if (!t) throw new Error("tenant take-auto not found");
  console.log("Reindexing search for tenant", t.slug, "…");
  const n = await reindexTenant(t.id);
  console.log(`✓ indexed ${n} documents into search_doc`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

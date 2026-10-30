import { config } from "dotenv";
config({ path: ".env.local" });
import { createBitrix24Client } from "../src/platform/integrations/bitrix24/client";
import { createStageCatalog } from "../src/platform/integrations/bitrix24/mappings";
import { db } from "../src/platform/db/client";
import { deal } from "../src/platform/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const client = createBitrix24Client(process.env.BITRIX24_WEBHOOK_URL!);
  const catalog = createStageCatalog(client);
  type BxDeal = { ID: string | number; STAGE_ID?: string; CATEGORY_ID?: string | number };
  let lastId = 0, updated = 0, pages = 0;
  for (;;) {
    let res: { result?: BxDeal[]; next?: number } | undefined;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        res = await client.call<BxDeal[]>("crm.deal.list", {
          order: { ID: "ASC" },
          filter: { ">ID": lastId },
          select: ["ID", "STAGE_ID", "CATEGORY_ID"],
        });
        break;
      } catch (e) {
        if (attempt === 3) throw e;
        console.log(`page retry ${attempt + 1} at lastId ${lastId}: ${e instanceof Error ? e.message : String(e)}`);
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      }
    }
    // The retry loop either assigned res or threw on the 4th failure.
    const rows = res!.result ?? [];
    if (!rows.length) break;
    for (const r of rows) {
      lastId = Math.max(lastId, Number(r.ID));
      const name = await catalog.nameFor(r.CATEGORY_ID, r.STAGE_ID);
      if (name) {
        await db.update(deal).set({ stageDetail: name })
          .where(eq(deal.externalId, String(r.ID)));
        updated++;
      }
    }
    if (++pages % 20 === 0) console.log(`page ${pages}, lastId ${lastId}, updated ${updated}`);
    if (!res!.next) break;
  }
  console.log(`DONE pages=${pages} updated=${updated}`);
  process.exit(0);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); });

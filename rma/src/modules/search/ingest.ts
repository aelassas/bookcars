// Index maintenance, called from scripts (scripts/backfill-search.ts) — NOT a
// server action. It deliberately has no "use server": these functions take
// tenantId as a plain argument and have no caller to authorize, so exposing
// them as actions would let any logged-in user poison or read any tenant's
// index. A client component that needs indexing must go through a guarded
// action instead; importing this from one is meant to fail loudly at build.

import { sql, eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { embed, toVectorLiteral } from "@/platform/ai/embed";
import { customer, lead, deal, rental, lease, message } from "@/platform/db/schema";

export type IndexDoc = {
  companyId?: string | null;
  sourceType: string;
  sourceId: string;
  title?: string | null;
  body: string;
};

// Upsert one text source into the search index (embeds with the local model).
export async function indexDoc(tenantId: string, doc: IndexDoc) {
  if (!doc.body || !doc.body.trim()) return;
  const vec = toVectorLiteral(await embed(`${doc.title ?? ""}\n${doc.body}`));
  const tsvText = `${doc.title ?? ""} ${doc.body}`;
  await withDrizzleTenant(tenantId, async (tx) => {
    await tx.execute(sql`
      insert into search_doc (tenant_id, company_id, source_type, source_id, title, body, embedding, tsv)
      values (${tenantId}, ${doc.companyId ?? null}, ${doc.sourceType}, ${doc.sourceId},
              ${doc.title ?? null}, ${doc.body}, ${vec}::vector, to_tsvector('simple', ${tsvText}))
      on conflict (tenant_id, source_type, source_id) do update set
        company_id = excluded.company_id, title = excluded.title, body = excluded.body,
        embedding = excluded.embedding, tsv = excluded.tsv, updated_at = now()
    `);
  });
}

// Backfill / reindex all text sources for a tenant ("organise the dumpster").
export async function reindexTenant(tenantId: string): Promise<number> {
  let n = 0;
  const idx = async (d: IndexDoc) => { try { await indexDoc(tenantId, d); n++; } catch { /* skip */ } };

  const customers = await db.select().from(customer).where(eq(customer.tenantId, tenantId));
  for (const c of customers) {
    const body = [c.phone, c.email, c.source, c.notes].filter(Boolean).join(" · ");
    await idx({ companyId: c.companyId, sourceType: "customer", sourceId: c.id, title: c.name, body: body || c.name });
  }
  const leads = await db.select().from(lead).where(eq(lead.tenantId, tenantId));
  for (const l of leads) await idx({ sourceType: "lead", sourceId: l.id, title: l.customerName, body: [l.status, l.source, l.notes].filter(Boolean).join(" · ") || l.customerName || "lead" });
  const deals = await db.select().from(deal).where(eq(deal.tenantId, tenantId));
  for (const dl of deals) await idx({ sourceType: "deal", sourceId: dl.id, title: dl.ref, body: [dl.type, dl.stage, dl.notes].filter(Boolean).join(" · ") || dl.ref });
  const rentals = await db.select().from(rental).where(eq(rental.tenantId, tenantId));
  for (const r of rentals) if (r.notes) await idx({ companyId: r.companyId, sourceType: "rental", sourceId: r.id, title: `Rental ${r.id.slice(0, 8)}`, body: r.notes });
  const leases = await db.select().from(lease).where(eq(lease.tenantId, tenantId));
  for (const ls of leases) await idx({ companyId: ls.companyId, sourceType: "lease", sourceId: ls.id, title: ls.contractRef, body: ls.notes || ls.contractRef });
  const msgs = await db.select().from(message).where(eq(message.tenantId, tenantId));
  for (const m of msgs) if (m.body) await idx({ sourceType: "message", sourceId: m.id, title: m.customerName ?? m.from ?? "Message", body: m.body });

  return n;
}

"use server";

import { sql } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { embed, toVectorLiteral } from "@/platform/ai/embed";
import { getUserScope } from "@/platform/auth/scope";
import { requireAuth, getTenantRoles } from "@/platform/auth/authorization";

export type SearchHit = {
  source_type: string;
  source_id: string;
  title: string | null;
  snippet: string;
  company_id: string | null;
  score: number;
};

export type SearchResult = {
  hits: SearchHit[];
  // true when the local embedding model (Ollama) was unreachable and we
  // fell back to keyword-only (FTS/ILIKE) matching — no semantic ranking.
  degraded: boolean;
};

// Hybrid semantic + FTS search, tenant- AND company-scoped (ADR-001 §15).
// Degrades to keyword-only search (no throw) if the local embedding model
// is unavailable, so a down Ollama never 500s the search page.
export async function searchDocs(tenantId: string, query: string): Promise<SearchResult> {
  const q = (query || "").trim();
  if (!q) return { hits: [], degraded: false };
  // AUTHZ: tenantId is caller-supplied ("use server" exports are directly
  // POSTable), so require a membership in THAT tenant before RLS scopes to it.
  // Search rides the always-on dashboard module, so membership is the bar.
  const userId = await requireAuth();
  const memberRoles = await getTenantRoles(userId, tenantId);
  if (memberRoles.length === 0) throw new Error("Forbidden: not a member of this tenant");
  const scope = await getUserScope(tenantId);
  const ids = scope.companyIds;
  const companyCond = !scope.crossBranch && ids.length
    ? sql`and (company_id in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)}) or company_id is null)`
    : sql``;

  let qvec: string | null = null;
  try {
    qvec = toVectorLiteral(await embed(q));
  } catch (e) {
    console.error("[search] embed failed, keyword-only:", (e as Error).message);
  }

  // ONE query. Match ALWAYS on keyword (FTS + ILIKE) so docs that were indexed
  // without an embedding still surface; ADD semantic distance as a bonus score
  // when the query embedded AND the doc has an embedding. This fixes the old
  // split where the semantic branch required `embedding is not null` and so
  // returned nothing for a keyword-only index.
  const like = `%${q}%`;
  const semScore = qvec
    ? sql`case when embedding is not null then 1 - (embedding <=> ${qvec}::vector) else 0 end`
    : sql`0`;
  const hits = await withDrizzleTenant(tenantId, async (tx) => {
    const res = await tx.execute(sql`
      select source_type, source_id, title, company_id,
             left(body, 240) as snippet,
             greatest(
               ${semScore},
               case when tsv @@ plainto_tsquery('simple', ${q}) then 0.6 else 0 end,
               case when title ilike ${like} or body ilike ${like} then 0.4 else 0 end
             )::float8 as score
      from search_doc
      where tenant_id = ${tenantId}::uuid
        and (
          tsv @@ plainto_tsquery('simple', ${q})
          or title ilike ${like}
          or body ilike ${like}
          ${qvec ? sql`or embedding is not null` : sql``}
        )
        ${companyCond}
      order by score desc, title asc
      limit 12
    `);
    return (res.rows ?? res) as unknown as SearchHit[];
  });
  return { hits, degraded: !qvec };
}

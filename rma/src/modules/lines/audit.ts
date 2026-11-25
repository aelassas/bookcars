/**
 * audit.ts — audit_event writes for /lines page mutations.
 *
 * Same shape as the relink route's auditRelink: the insert runs inside a
 * transaction with the tenant GUC set; audit_event.entityId is uuid NOT NULL,
 * so the line's TENANT id stands in as the entity and the slug rides in
 * intent. A missing tenant row (broken seed) logs loudly and proceeds — an
 * unlogged but completed add/retire beats a blocked one.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { auditEvent, tenant } from "@/platform/db/schema";
import type { LinesAccess } from "@/modules/lines/access";

export async function auditLineAction(
  access: LinesAccess,
  action: "wa_line_add" | "wa_line_edit" | "wa_line_retire",
  tenantSlug: string,
  intent: string
) {
  const [t] = await db.select({ id: tenant.id }).from(tenant).where(eq(tenant.slug, tenantSlug)).limit(1);
  if (!t) {
    console.error(`[lines] ${action} audit skipped — no tenant row for slug "${tenantSlug}"`);
    return;
  }
  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${t.id}'`));
    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId: access.userId,
      action,
      entityType: "wa_line",
      entityId: t.id,
      intent: `[lines page] ${access.name ?? access.userId}: ${intent}`,
    });
  });
}

import { and, eq, sql } from "drizzle-orm";
import type { db } from "@/platform/db/client";
import { auditEvent, deal, lead } from "@/platform/db/schema";

export function stageAfterWhatsappReply(stage: string): string {
  return stage === "inquiry" ? "quote" : stage;
}

export async function markWhatsappContacted(
  tx: typeof db,
  args: { tenantId: string; leadId: string; actorId?: string | null; at?: Date }
): Promise<{ contacted: boolean; moved: number }> {
  const { tenantId, leadId, actorId = null, at = new Date() } = args;
  const [l] = await tx.select({ status: lead.status }).from(lead)
    .where(and(eq(lead.id, leadId), eq(lead.tenantId, tenantId))).limit(1);
  if (!l || l.status === "lost") return { contacted: false, moved: 0 };

  const contacted = l.status === "new";
  if (contacted) {
    await tx.update(lead).set({ status: "contacted", updatedAt: at })
      .where(and(eq(lead.id, leadId), eq(lead.tenantId, tenantId)));
  }

  const deals = await tx
    .select({ id: deal.id, ref: deal.ref, stage: deal.stage })
    .from(deal)
    .where(and(eq(deal.tenantId, tenantId), eq(deal.leadId, leadId), eq(deal.status, "open"), eq(deal.stage, "inquiry")));
  if (!contacted && deals.length === 0) return { contacted: false, moved: 0 };

  let moved = 0;
  for (const d of deals) {
    const nextStage = stageAfterWhatsappReply(d.stage);
    await tx.update(deal).set({ stage: nextStage, lastActivityAt: at, updatedAt: at }).where(eq(deal.id, d.id));
    moved++;
    await tx.execute(sql`
      INSERT INTO deal_stage_history (tenant_id, deal_ref, from_stage, to_stage, manager, changed_at)
      VALUES (${tenantId}, ${d.ref}, ${d.stage}, ${nextStage}, ${actorId ?? "whatsapp"}, ${at})
    `);
  }

  if (contacted || moved > 0) {
    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action: "lead.whatsapp_contacted",
      entityType: "lead",
      entityId: leadId,
      intent: `WhatsApp reply marked the lead contacted; ${moved} deal(s) moved to in progress`,
    });
  }
  return { contacted, moved };
}

import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { boardItem } from "@/platform/db/board-schema";
import { getTableColumns, inArray, asc, desc, eq, and, sql } from "drizzle-orm";

/**
 * Effective WhatsApp line for a card: the persisted source_line when set
 * (backfilled by migration 0005 / persisted by the escalation job), otherwise
 * derived live from the newest inbound message of the thread —
 * external_message_id is formatted `waobs:<line>:<iso-ts>:<jid>`.
 * classify-inbox does not populate source_line on new cards, so the live
 * fallback keeps routing correct for fresh cards.
 */
export const boardSourceLineExpr = sql<string | null>`coalesce(
  ${boardItem.sourceLine},
  (
    select split_part(m.external_message_id, ':', 2)
    from message m
    where m.tenant_id = ${boardItem.tenantId}
      and m."from" = ${boardItem.customerRef}
      and m.direction = 'inbound'
      and m.external_message_id like ${"waobs:%"}
    order by m.created_at desc
    limit 1
  )
)`;

const boardSelection = {
  ...getTableColumns(boardItem),
  sourceLine: boardSourceLineExpr,
};

export type BoardCard = Awaited<ReturnType<typeof getBoardItems>>[number];

export async function getBoardItems(tenantId: string) {
  return withDrizzleTenant(tenantId, async (tx) =>
    tx
      .select(boardSelection)
      .from(boardItem)
      .where(inArray(boardItem.status, ["open", "approved"]))
      .orderBy(
        desc(boardItem.createdAt),
        desc(boardItem.awaitingReply),
      ),
  );
}

/**
 * Breached = open + still awaiting a reply + past sla_due_at (DB clock).
 * Worst breach first. Used by the Board UI counters and the escalation job.
 */
export async function getBreachedCards(tenantId: string) {
  return withDrizzleTenant(tenantId, async (tx) =>
    tx
      .select(boardSelection)
      .from(boardItem)
      .where(
        and(
          eq(boardItem.status, "open"),
          eq(boardItem.awaitingReply, true),
          sql`${boardItem.slaDueAt} < now()`,
        ),
      )
      .orderBy(asc(boardItem.slaDueAt)),
  );
}

// Not wired up yet — nothing imports this module. It deliberately has no
// "use server": every export takes tenantId as a plain argument and none of
// them authorize the caller, so as actions they would let any logged-in user
// read another tenant's member roster or reassign another tenant's deals
// (with a null actorId in the audit trail). Add the tenant-bound guards from
// messaging/policies.ts before making this reachable from the UI.

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { deal, lead, tenantMember, user, auditEvent } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import {
  routeMessage,
  type BusinessLine,
  type RoutingDecision,
  type RoutingMember,
} from "./routing";

// ─── DB glue for the deterministic routing engine ──────────────────────────
// Resolves the two facts the pure `routeMessage` needs from the database — the
// live sales pool and the customer's existing owner — then (optionally) writes
// the auto-assignment + an audit_event. The decision itself stays in
// routing.ts, so this file is only the I/O seam.

/** Derive a member's desk from their display name / roles (best-effort). */
function lineFor(name: string, roles: string[]): BusinessLine | null {
  const n = name.toLowerCase();
  if (/lease|лизинг/.test(n)) return "lease";
  if (/rent|рент|аренд/.test(n)) return "rent";
  if (roles.includes("lease") || roles.includes("leasing")) return "lease";
  return null;
}

/** The active sales pool as routing members (demo accounts excluded). */
export async function getRoutingMembers(tenantId: string): Promise<RoutingMember[]> {
  const rows = await db
    .select({ userId: tenantMember.userId, roles: tenantMember.roles, name: user.name })
    .from(tenantMember)
    .innerJoin(user, eq(user.id, tenantMember.userId))
    .where(eq(tenantMember.tenantId, tenantId));
  return rows
    .filter((m) => {
      const rs = m.roles ?? [];
      return (rs.includes("sales") || rs.includes("sales_manager")) && !(m.name ?? "").toLowerCase().includes("demo");
    })
    .map((m) => ({
      userId: m.userId,
      name: m.name ?? "—",
      roles: m.roles ?? [],
      line: lineFor(m.name ?? "", m.roles ?? []),
    }));
}

/**
 * The owner of this customer's existing open thread, resolved by phone: the
 * most recent open deal (via its lead) or, failing that, the lead's assignee.
 * Returns null when the customer is new/unowned.
 */
export async function findExistingOwner(
  tenantId: string,
  phone: string | null | undefined
): Promise<{ userId: string; name: string } | null> {
  if (!phone) return null;
  return withDrizzleTenant(tenantId, async (tx) => {
    // Open deal owned by someone, joined via the lead that carries this phone.
    const [byDeal] = await tx
      .select({ userId: user.id, name: user.name })
      .from(deal)
      .innerJoin(lead, eq(lead.id, deal.leadId))
      .innerJoin(user, eq(user.id, deal.ownerId))
      .where(and(eq(deal.status, "open"), eq(lead.phone, phone)))
      .orderBy(desc(deal.lastActivityAt))
      .limit(1);
    if (byDeal?.userId) return { userId: byDeal.userId, name: byDeal.name ?? "—" };

    const [byLead] = await tx
      .select({ userId: user.id, name: user.name })
      .from(lead)
      .innerJoin(user, eq(user.id, lead.assignedTo))
      .where(eq(lead.phone, phone))
      .orderBy(desc(lead.updatedAt))
      .limit(1);
    if (byLead?.userId) return { userId: byLead.userId, name: byLead.name ?? "—" };
    return null;
  });
}

export interface InboundForRouting {
  body: string;
  customerPhone?: string | null;
}

/** Resolve the two DB facts and return the deterministic decision. No writes. */
export async function routeInbound(
  tenantId: string,
  msg: InboundForRouting
): Promise<RoutingDecision> {
  const [members, existingOwner] = await Promise.all([
    getRoutingMembers(tenantId),
    findExistingOwner(tenantId, msg.customerPhone),
  ]);
  return routeMessage({ body: msg.body, members, existingOwner });
}

/**
 * Apply a routing decision to a specific deal. Only `action === "apply"`
 * decisions write owner_id; every call — apply or propose — records an
 * audit_event so the routing trail is inspectable. Returns whether an owner was
 * written. Never writes for a `propose` (those need human confirmation).
 */
export async function applyRoutingToDeal(
  tenantId: string,
  dealId: string,
  decision: RoutingDecision
): Promise<{ assigned: boolean }> {
  const assigned = decision.action === "apply" && !!decision.ownerId;
  await withDrizzleTenant(tenantId, async (tx) => {
    if (assigned) {
      await tx
        .update(deal)
        .set({ ownerId: decision.ownerId!, updatedAt: new Date(), lastActivityAt: new Date() })
        .where(eq(deal.id, dealId));
      // Keep the linked lead's assignee in step (mirrors assignDeal).
      const [d] = await tx.select({ leadId: deal.leadId }).from(deal).where(eq(deal.id, dealId)).limit(1);
      if (d?.leadId) {
        await tx.update(lead).set({ assignedTo: decision.ownerId!, updatedAt: new Date() }).where(eq(lead.id, d.leadId));
      }
    }
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: assigned ? "messaging.route.autoAssign" : "messaging.route.propose",
      entityType: "deal",
      entityId: dealId,
      intent: assigned
        ? `Auto-routed to ${decision.ownerName} [${decision.rule}]: ${decision.reason}`
        : `Routing proposed (${decision.rule}), not auto-assigned: ${decision.reason}`,
    });
  });
  return { assigned };
}

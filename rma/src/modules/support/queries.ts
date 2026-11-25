// SPEC §3.4, §3.5, §5 — support ticket + access-grant reads.
// Tenant-scoped reads go through withDrizzleTenant; cross-tenant (admin)
// reads iterate tenants, same pattern as the rest of the admin console.

import { and, asc, desc, eq, isNull, inArray } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import {
  tenant,
  user,
  platformAdmin,
  supportTicket,
  supportTicketReply,
  supportAccessGrant,
} from "@/platform/db/schema";

export type Ticket = typeof supportTicket.$inferSelect;
export type Grant = typeof supportAccessGrant.$inferSelect;

async function emailMap(ids: (string | null)[]): Promise<Map<string, string>> {
  const clean = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (clean.length === 0) return new Map();
  const rows = await db.select({ id: user.id, email: user.email }).from(user).where(inArray(user.id, clean));
  return new Map(rows.map((r) => [r.id, r.email]));
}

export interface SupportEngineer {
  userId: string;
  email: string;
  name: string | null;
}

/**
 * Every platform admin, oldest first — the people a tenant can hand support
 * access to. Grants used to be hardcoded to the earliest admin, so a second
 * engineer could never be granted access no matter what the tenant clicked.
 */
export async function listPlatformAdmins(): Promise<SupportEngineer[]> {
  return db
    .select({ userId: platformAdmin.userId, email: user.email, name: user.name })
    .from(platformAdmin)
    .innerJoin(user, eq(platformAdmin.userId, user.id))
    .orderBy(asc(platformAdmin.promotedAt));
}

export async function listTenantTickets(tenantId: string): Promise<Ticket[]> {
  return withDrizzleTenant(tenantId, async (tx) =>
    tx.select().from(supportTicket).orderBy(desc(supportTicket.createdAt))
  );
}

export interface ActiveGrantView {
  id: string;
  scope: string;
  reason: string;
  expiresAt: Date;
  createdAt: Date;
  grantedByEmail: string | null;
  grantedToEmail: string | null;
}

export async function listActiveGrants(tenantId: string): Promise<ActiveGrantView[]> {
  const grants = await withDrizzleTenant(tenantId, async (tx) =>
    tx
      .select()
      .from(supportAccessGrant)
      .where(and(eq(supportAccessGrant.tenantId, tenantId), isNull(supportAccessGrant.revokedAt)))
      .orderBy(desc(supportAccessGrant.createdAt))
  );
  const active = grants.filter((g) => g.expiresAt.getTime() > Date.now());
  const emails = await emailMap(active.flatMap((g) => [g.grantedBy, g.grantedTo]));
  return active.map((g) => ({
    id: g.id,
    scope: g.scope,
    reason: g.reason,
    expiresAt: g.expiresAt,
    createdAt: g.createdAt,
    grantedByEmail: emails.get(g.grantedBy) ?? null,
    grantedToEmail: emails.get(g.grantedTo) ?? null,
  }));
}

export interface TenantTicketThread {
  ticket: Ticket;
  openedByEmail: string | null;
  replies: Array<{ id: string; authorKind: string; authorEmail: string | null; body: string; createdAt: Date }>;
}

/**
 * One ticket + its thread, scoped to a single tenant. The tenant-side twin of
 * findTicketAnyTenant(): the caller has already proven tenant_admin for this
 * tenantId, so we never scan other tenants. Returns null when the id doesn't
 * belong to this tenant, which the page turns into a 404.
 */
export async function getTenantTicket(
  tenantId: string,
  ticketId: string
): Promise<TenantTicketThread | null> {
  const found = await withDrizzleTenant(tenantId, async (tx) => {
    const [tk] = await tx
      .select()
      .from(supportTicket)
      .where(and(eq(supportTicket.id, ticketId), eq(supportTicket.tenantId, tenantId)))
      .limit(1);
    if (!tk) return null;
    const replies = await tx
      .select()
      .from(supportTicketReply)
      .where(eq(supportTicketReply.ticketId, ticketId))
      .orderBy(supportTicketReply.createdAt);
    return { tk, replies };
  });
  if (!found) return null;

  const emails = await emailMap([found.tk.openedBy, ...found.replies.map((r) => r.authorId)]);
  return {
    ticket: found.tk,
    openedByEmail: emails.get(found.tk.openedBy) ?? null,
    replies: found.replies.map((r) => ({
      id: r.id,
      authorKind: r.authorKind,
      authorEmail: emails.get(r.authorId) ?? null,
      body: r.body,
      createdAt: r.createdAt,
    })),
  };
}

export interface TicketWithReplies {
  ticket: Ticket;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  openedByEmail: string | null;
  replies: Array<{ id: string; authorKind: string; authorEmail: string | null; body: string; createdAt: Date }>;
}

/** Find a ticket across all tenants (admin) and load its thread. */
export async function findTicketAnyTenant(ticketId: string): Promise<TicketWithReplies | null> {
  const tenants = await db.select().from(tenant);
  for (const t of tenants) {
    const found = await withDrizzleTenant(t.id, async (tx) => {
      const [tk] = await tx.select().from(supportTicket).where(eq(supportTicket.id, ticketId)).limit(1);
      if (!tk) return null;
      const replies = await tx
        .select()
        .from(supportTicketReply)
        .where(eq(supportTicketReply.ticketId, ticketId))
        .orderBy(supportTicketReply.createdAt);
      return { tk, replies };
    });
    if (found) {
      const emails = await emailMap([
        found.tk.openedBy,
        ...found.replies.map((r) => r.authorId),
      ]);
      return {
        ticket: found.tk,
        tenantId: t.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        openedByEmail: emails.get(found.tk.openedBy) ?? null,
        replies: found.replies.map((r) => ({
          id: r.id,
          authorKind: r.authorKind,
          authorEmail: emails.get(r.authorId) ?? null,
          body: r.body,
          createdAt: r.createdAt,
        })),
      };
    }
  }
  return null;
}

export interface AdminTicketRow {
  id: string;
  tenantName: string;
  tenantSlug: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
}

// Queue order: urgent first, then newest. Sorting by createdAt alone sank an
// urgent ticket below every newer "low" one. The merge across tenants happens
// in JS, so this rank — not the per-tenant SQL ORDER BY — is what the operator
// actually sees.
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
const priorityRank = (p: string) => PRIORITY_RANK[p] ?? PRIORITY_RANK.normal;

/** All tickets across all tenants (admin), urgent-first then newest. */
export async function listAllTickets(statusFilter?: string): Promise<AdminTicketRow[]> {
  const tenants = await db.select().from(tenant);
  const out: AdminTicketRow[] = [];
  for (const t of tenants) {
    const rows = await withDrizzleTenant(t.id, async (tx) =>
      tx.select().from(supportTicket).orderBy(desc(supportTicket.createdAt))
    );
    for (const tk of rows) {
      if (statusFilter && tk.status !== statusFilter) continue;
      out.push({
        id: tk.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        subject: tk.subject,
        status: tk.status,
        priority: tk.priority,
        createdAt: tk.createdAt,
      });
    }
  }
  out.sort(
    (a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      b.createdAt.getTime() - a.createdAt.getTime()
  );
  return out;
}

/** Active grant (if any) for a specific platform admin on a tenant. */
export async function activeGrantForAdmin(
  tenantId: string,
  adminUserId: string
): Promise<Grant | null> {
  const [g] = await withDrizzleTenant(tenantId, async (tx) =>
    tx
      .select()
      .from(supportAccessGrant)
      .where(
        and(
          eq(supportAccessGrant.tenantId, tenantId),
          eq(supportAccessGrant.grantedTo, adminUserId),
          isNull(supportAccessGrant.revokedAt)
        )
      )
      .orderBy(desc(supportAccessGrant.createdAt))
      .limit(1)
  );
  if (!g || g.expiresAt.getTime() <= Date.now()) return null;
  return g;
}

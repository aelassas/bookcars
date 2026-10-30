"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { randomInt, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/platform/db/client";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { user, tenantMember, auditEvent, company } from "@/platform/db/schema";
import { requireTenantAdmin, requireAuth } from "@/platform/auth/authorization";
import { sendEmail, appBaseUrl } from "@/platform/email/send";
import { inviteEmail } from "@/platform/email/templates";
import { ru } from "@/lib/i18n/ru";
import { ASSIGNABLE_ROLES } from "./roles";

// SPEC §6.1 — tenant team management. Every action re-checks tenant_admin
// for the exact slug and writes an audit_event. tenant_member writes go
// through withDrizzleTenant so they're correct under enforced RLS.

function parseRoles(fd: FormData): string[] {
  return fd
    .getAll("roles")
    .map(String)
    .filter((r) => (ASSIGNABLE_ROLES as readonly string[]).includes(r));
}

export async function inviteMember(slug: string, formData: FormData): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const roles = parseRoles(formData);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("A valid email is required");
  }

  // Find or create the global user record.
  let [u] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (!u) {
    const ins = await db.insert(user).values({ email, name }).returning();
    u = Array.isArray(ins) ? ins[0] : ins;
  }
  const userId = u.id;

  await withDrizzleTenant(t.id, async (tx) => {
    const [existing] = await tx
      .select()
      .from(tenantMember)
      .where(and(eq(tenantMember.tenantId, t.id), eq(tenantMember.userId, userId)))
      .limit(1);
    if (existing) {
      await tx
        .update(tenantMember)
        .set({ roles, updatedAt: new Date() })
        .where(eq(tenantMember.id, existing.id));
    } else {
      await tx.insert(tenantMember).values({ tenantId: t.id, userId, roles });
    }
    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: existing ? "member_roles_updated" : "member_invited",
      entityType: "tenant_member",
      entityId: userId,
      intent: `${existing ? "Updated" : "Invited"} ${email} → [${roles.join(", ") || "no roles"}]`,
    });
  });

  // Best-effort invite email — never fail the invite if mail is down.
  try {
    const loginUrl = `${appBaseUrl()}/login?email=${encodeURIComponent(email)}`;
    await sendEmail(inviteEmail(email, t.name, loginUrl));
  } catch (e) {
    console.error("[invite] email send failed:", (e as Error).message);
  }
  revalidatePath(`/${slug}/settings/team`);
}

export async function updateMemberRoles(slug: string, formData: FormData): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();
  const memberId = String(formData.get("memberId") ?? "");
  const roles = parseRoles(formData);
  if (!memberId) throw new Error("memberId required");

  await withDrizzleTenant(t.id, async (tx) => {
    const [m] = await tx
      .select()
      .from(tenantMember)
      .where(and(eq(tenantMember.id, memberId), eq(tenantMember.tenantId, t.id)))
      .limit(1);
    if (!m) throw new Error("Member not found");

    // Don't let the last tenant_admin lose the admin role.
    if (m.roles?.includes("tenant_admin") && !roles.includes("tenant_admin")) {
      const admins = await tx.select().from(tenantMember).where(eq(tenantMember.tenantId, t.id));
      const adminCount = admins.filter((a) => a.roles?.includes("tenant_admin")).length;
      if (adminCount <= 1) throw new Error("Cannot remove the last tenant_admin");
    }

    await tx
      .update(tenantMember)
      .set({ roles, updatedAt: new Date() })
      .where(eq(tenantMember.id, memberId));
    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "member_roles_updated",
      entityType: "tenant_member",
      entityId: m.userId,
      intent: `Roles → [${roles.join(", ") || "no roles"}]`,
    });
  });

  revalidatePath(`/${slug}/settings/team`);
}

/**
 * Assign a member to companies, or give them the whole holding.
 *
 * This is what actually decides what a person sees: companyScope() filters
 * fleet, rentals, revenue, leases and customers by tenant_member.company_ids,
 * and getActiveCompany() drives the branding. Roles say what someone may DO;
 * this says whose data they do it to — until now there was no way to set it
 * outside the seed script, so 21 of 29 members had no company and silently saw
 * every brand's data.
 *
 * An empty selection deliberately means "everything", matching companyScope():
 * it is how tenant_admins and system accounts keep full visibility. The UI
 * spells that out rather than leaving it as a trap.
 */
export async function updateMemberCompanies(slug: string, formData: FormData): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) throw new Error("memberId required");
  const crossBranch = formData.get("crossBranch") === "on";

  await withDrizzleTenant(t.id, async (tx) => {
    const [m] = await tx
      .select()
      .from(tenantMember)
      .where(and(eq(tenantMember.id, memberId), eq(tenantMember.tenantId, t.id)))
      .limit(1);
    if (!m) throw new Error("Member not found");

    // Only accept ids that belong to this tenant — a company id is submitted by
    // the browser, so it cannot be trusted to be one of ours.
    const own = await tx.select({ id: company.id, name: company.name }).from(company);
    const ownIds = new Set(own.map((c) => c.id));
    const companyIds = formData
      .getAll("companyIds")
      .map(String)
      .filter((id) => ownIds.has(id));

    await tx
      .update(tenantMember)
      .set({ companyIds, crossBranch, updatedAt: new Date() })
      .where(eq(tenantMember.id, memberId));

    const names = companyIds.map((id) => own.find((c) => c.id === id)?.name ?? id);
    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "member_companies_updated",
      entityType: "tenant_member",
      entityId: m.userId,
      intent: `Companies → [${names.join(", ") || "all (no restriction)"}]${crossBranch ? " · cross-branch" : ""}`,
    });
  });

  revalidatePath(`/${slug}/settings/team`);
}

export async function removeMember(slug: string, formData: FormData): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) throw new Error("memberId required");

  await withDrizzleTenant(t.id, async (tx) => {
    const [m] = await tx
      .select()
      .from(tenantMember)
      .where(and(eq(tenantMember.id, memberId), eq(tenantMember.tenantId, t.id)))
      .limit(1);
    if (!m) throw new Error("Member not found");

    if (m.roles?.includes("tenant_admin")) {
      const admins = await tx.select().from(tenantMember).where(eq(tenantMember.tenantId, t.id));
      const adminCount = admins.filter((a) => a.roles?.includes("tenant_admin")).length;
      if (adminCount <= 1) throw new Error("Cannot remove the last tenant_admin");
    }

    await tx.delete(tenantMember).where(eq(tenantMember.id, memberId));
    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "member_removed",
      entityType: "tenant_member",
      entityId: m.userId,
      intent: "Removed from tenant",
    });
  });

  revalidatePath(`/${slug}/settings/team`);
}

// ─── Admin password reset — Auth Wave 1 (P0-3) ─────────────────────────────

// Small, boring wordlist for a "readable half" of the temp password —
// entropy comes from the random index (CSPRNG) plus the base64url suffix
// below, not from the words being secret.
const TEMP_PASSWORD_WORDS = [
  "amber", "cedar", "delta", "ember", "falcon", "garnet", "harbor", "indigo",
  "jasper", "kepler", "lumen", "mango", "nectar", "onyx", "piston", "quartz",
  "raven", "sable", "tundra", "umber", "violet", "willow", "xenon", "yonder",
  "zephyr", "biscuit", "compass", "driftwood", "flint", "granite",
] as const;

/** CSPRNG temp password: two readable words + ~64 bits of base64url entropy. */
function generateTempPassword(): string {
  const w1 = TEMP_PASSWORD_WORDS[randomInt(TEMP_PASSWORD_WORDS.length)];
  const w2 = TEMP_PASSWORD_WORDS[randomInt(TEMP_PASSWORD_WORDS.length)];
  const entropy = randomBytes(8).toString("base64url"); // 8 bytes = 64 bits
  return `${w1}-${w2}-${entropy}`;
}

export type ResetPasswordState = {
  error?: string;
  tempPassword?: string;
  email?: string;
};

/**
 * Admin-initiated password reset (P0-3). Generates a CSPRNG temp password,
 * hashes it exactly like every other password write in this app
 * (bcryptjs, 10 rounds — see platform/auth/index.ts authorize() /
 * account/password/actions.ts), sets mustChangePassword so the member is
 * forced to pick their own on next sign-in, and returns the temp password
 * ONCE so the caller can show it in a copy-once UI. Never Math.random().
 */
export async function resetMemberPassword(
  slug: string,
  _prev: ResetPasswordState | null,
  formData: FormData
): Promise<ResetPasswordState> {
  try {
    const t = await requireTenantAdmin(slug);
    const actorId = await requireAuth();
    const memberId = String(formData.get("memberId") ?? "");
    if (!memberId) return { error: ru.adminReset.error };

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);
    let email = "";

    await withDrizzleTenant(t.id, async (tx) => {
      // Same membership check as updateMemberRoles/removeMember — confirm
      // the target is actually a member of THIS tenant before touching
      // their (global, cross-tenant) user row.
      const [m] = await tx
        .select()
        .from(tenantMember)
        .where(and(eq(tenantMember.id, memberId), eq(tenantMember.tenantId, t.id)))
        .limit(1);
      if (!m) throw new Error("Member not found");

      const [u] = await tx.select({ email: user.email }).from(user).where(eq(user.id, m.userId)).limit(1);
      email = u?.email ?? "";

      await tx
        .update(user)
        .set({ password: hash, mustChangePassword: true, updatedAt: new Date() })
        .where(eq(user.id, m.userId));

      await tx.insert(auditEvent).values({
        tenantId: t.id,
        actorId,
        action: "password_reset_by_admin",
        entityType: "tenant_member",
        entityId: m.userId,
        intent: `Reset password for ${email || m.userId}`,
      });
    });

    revalidatePath(`/${slug}/settings/team`);
    return { tempPassword, email };
  } catch (e) {
    return { error: e instanceof Error ? e.message : ru.adminReset.error };
  }
}

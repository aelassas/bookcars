"use server";

import { randomBytes, randomInt } from "crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import {
  tenant,
  user,
  tenantMember,
  aiProviderConfig,
  integrationConnection,
  auditEvent,
  serviceHoursEntry,
  telegramLink,
  onboardingApplication,
} from "@/platform/db/schema";
import { requirePlatformAdmin } from "@/platform/auth/authorization";
import { log } from "@/platform/log";
import { sendEmail, appBaseUrl } from "@/platform/email/send";
import { inviteEmail } from "@/platform/email/templates";
import { ASSIGNABLE_ROLES } from "@/app/(tenant)/[tenantSlug]/settings/team/roles";
import { revalidatePath } from "next/cache";

// SPEC §5.1 — tenant provisioning. Creates tenant + primary admin user +
// tenant_admin membership + AI config (+ optional integrations) atomically.
// Magic-link delivery is not wired yet (email provider pending), so the
// admin user is created without a password; surface that to the operator.

function token(): string {
  return randomBytes(32).toString("hex");
}

type ProvisionInput = {
  name: string;
  slug: string;
  locale?: string | null;
  tier?: string;
  billingEmail?: string | null;
  adminEmail: string;
  adminName?: string | null;
  aiProvider?: string;
  localEndpoint?: string | null;
  localModel?: string | null;
  bitrixWebhook?: string | null;
  pilotEnabled?: boolean;
};

/**
 * Core provisioning transaction, extracted so both the console form
 * (provisionTenant) and the onboarding-approval path (approveAndProvision)
 * reuse the exact same tenant+admin+config+audit atomic write instead of
 * duplicating it.
 *
 * PRIVATE ON PURPOSE — not exported, so it never becomes an unguarded server
 * action RPC endpoint (it takes a raw actorId). Every caller must
 * requirePlatformAdmin() first and pass that id in. Returns the new tenant id
 * and the primary admin user id (the latter is what approveAndProvision needs
 * to attach the Telegram link).
 */
async function provisionTenantCore(
  input: ProvisionInput,
  actorId: string
): Promise<{ tenantId: string; adminUserId: string }> {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const locale = input.locale ?? null;
  const tier = (input.tier ?? "starter").trim();
  const billingEmail = input.billingEmail ?? null;
  const adminEmail = input.adminEmail.trim().toLowerCase();
  const adminName = input.adminName ?? null;
  const aiProvider = (input.aiProvider ?? "claude").trim();
  const localEndpoint = input.localEndpoint ?? null;
  const localModel = input.localModel ?? null;
  const bitrixWebhook = input.bitrixWebhook ?? null;
  const pilotEnabled = input.pilotEnabled ?? false;

  if (!name || !/^[a-z0-9-]{2,}$/.test(slug)) {
    throw new Error("Invalid tenant name or slug (slug: lowercase, digits, hyphens)");
  }
  if (!adminEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) {
    throw new Error("A valid primary admin email is required");
  }
  if (!["starter", "growth", "pro", "enterprise"].includes(tier)) {
    throw new Error("Invalid tier");
  }
  if (!["claude", "local", "auto"].includes(aiProvider)) {
    throw new Error("Invalid AI provider");
  }
  if ((aiProvider === "local" || aiProvider === "auto") && !localEndpoint) {
    throw new Error("Local endpoint is required for local/auto AI providers");
  }

  const [taken] = await db.select({ id: tenant.id }).from(tenant).where(eq(tenant.slug, slug)).limit(1);
  if (taken) throw new Error(`Slug "${slug}" is already taken`);

  return db.transaction(async (tx) => {
    const insertedTenant = await tx
      .insert(tenant)
      .values({
        slug,
        name,
        locale,
        tier,
        status: "active",
        billingEmail,
        createdBy: actorId,
        callgearWebhookToken: token(),
        whatsappWebhookToken: token(),
      })
      .returning();
    const t = Array.isArray(insertedTenant) ? insertedTenant[0] : insertedTenant;

    // Primary admin user — global table. Reuse if the email already exists.
    let [u] = await tx.select().from(user).where(eq(user.email, adminEmail)).limit(1);
    if (!u) {
      const insertedUser = await tx
        .insert(user)
        .values({ email: adminEmail, name: adminName })
        .returning();
      u = Array.isArray(insertedUser) ? insertedUser[0] : insertedUser;
    }

    // Set tenant context for the RLS-scoped inserts below, so this is
    // correct under enforced RLS (not just the bypass dev role).
    await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${t.id}'`));

    await tx.insert(tenantMember).values({
      tenantId: t.id,
      userId: u.id,
      roles: ["tenant_admin"],
    });

    await tx.insert(aiProviderConfig).values({
      tenantId: t.id,
      provider: aiProvider,
      localEndpoint,
      localModel,
      fallbackProvider: aiProvider === "auto" ? "claude" : null,
    });

    if (bitrixWebhook) {
      await tx.insert(integrationConnection).values({
        tenantId: t.id,
        provider: "bitrix24",
        config: { webhook: bitrixWebhook },
        status: "active",
      });
    }
    if (pilotEnabled) {
      await tx.insert(integrationConnection).values({
        tenantId: t.id,
        provider: "pilot",
        config: {},
        status: "active",
      });
    }

    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "tenant_provisioned",
      entityType: "tenant",
      entityId: t.id,
      intent: `Provisioned via admin console (tier ${tier}, admin ${adminEmail})`,
    });

    return { tenantId: t.id, adminUserId: u.id };
  });
}

export async function provisionTenant(formData: FormData): Promise<void> {
  const adminUserId = await requirePlatformAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();

  const { tenantId } = await provisionTenantCore(
    {
      name,
      slug: String(formData.get("slug") ?? ""),
      locale: String(formData.get("locale") ?? "").trim() || null,
      tier: String(formData.get("tier") ?? "starter"),
      billingEmail: String(formData.get("billingEmail") ?? "").trim().toLowerCase() || null,
      adminEmail,
      adminName: String(formData.get("adminName") ?? "").trim() || null,
      aiProvider: String(formData.get("aiProvider") ?? "claude"),
      localEndpoint: String(formData.get("localEndpoint") ?? "").trim() || null,
      localModel: String(formData.get("localModel") ?? "").trim() || null,
      bitrixWebhook: String(formData.get("bitrixWebhook") ?? "").trim() || null,
      pilotEnabled: formData.get("pilotEnabled") === "on",
    },
    adminUserId
  );

  // Best-effort welcome/invite email to the primary admin.
  try {
    const loginUrl = `${appBaseUrl()}/login?email=${encodeURIComponent(adminEmail)}`;
    await sendEmail(inviteEmail(adminEmail, name, loginUrl));
  } catch (e) {
    console.error("[provision] invite email failed:", (e as Error).message);
  }

  redirect(`/admin/tenants/${tenantId}`);
}

// ─── Tenant management (SPEC §5 — admin lifecycle controls) ─────────────────

const TIERS = ["starter", "growth", "pro", "enterprise"];
const STATUSES = ["active", "trial", "suspended", "churned"];

/**
 * Mutate the root `tenant` row and write its audit event in ONE transaction.
 *
 * This used to be a fire-and-forget `adminAudit()` that swallowed its own
 * failures — a suspension whose audit write failed still took effect, silently
 * and unlogged, on the one table that exists to be the accountability record.
 * Now the audit insert is part of the transaction: if it fails, the mutation
 * rolls back with it and the operator sees why (there is an /admin error
 * boundary to show them).
 *
 * `tenant` is a plain pgTable with no tenant_id and no RLS policy, so it is
 * updated directly; the audit insert needs the GUC, hence the SET LOCAL —
 * the same shape provisionTenant() already uses.
 */
async function updateTenantAudited(
  tenantId: string,
  actorId: string,
  patch: Record<string, unknown>,
  action: string,
  intent: string
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(tenant).set(patch).where(eq(tenant.id, tenantId));
    await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantId}'`));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action,
      entityType: "tenant",
      entityId: tenantId,
      intent,
    });
  });
}

/** Suspend / resume / churn / activate a tenant. Suspend = instant kill via
 *  the allow-list (status != active/trial). */
export async function setTenantStatus(tenantId: string, formData: FormData): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!STATUSES.includes(status)) throw new Error("Invalid status");

  const patch: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === "suspended") {
    patch.suspendedAt = new Date();
    patch.suspendedReason = reason;
  } else {
    patch.suspendedAt = null;
    patch.suspendedReason = null;
  }
  await updateTenantAudited(
    tenantId,
    adminId,
    patch,
    `tenant_status_${status}`,
    reason ?? `status → ${status}`
  );
  revalidatePath(`/admin/tenants/${tenantId}`);
}

/** Edit tier, custom price (AED), paid-until date, included service hours. */
export async function updateTenantPlan(tenantId: string, formData: FormData): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const tier = String(formData.get("tier") ?? "");
  if (!TIERS.includes(tier)) throw new Error("Invalid tier");

  const priceRaw = String(formData.get("customMonthlyPrice") ?? "").trim();
  const customMonthlyPrice = priceRaw === "" ? null : Math.max(0, parseInt(priceRaw, 10) || 0);
  const serviceHoursPerMonth = Math.max(
    0,
    parseInt(String(formData.get("serviceHoursPerMonth") ?? "0"), 10) || 0
  );
  const paidUntilRaw = String(formData.get("paidUntil") ?? "").trim();
  const paidUntil = paidUntilRaw ? new Date(paidUntilRaw) : null;

  await updateTenantAudited(
    tenantId,
    adminId,
    { tier, customMonthlyPrice, serviceHoursPerMonth, paidUntil, updatedAt: new Date() },
    "tenant_plan_updated",
    `tier=${tier} price=${customMonthlyPrice ?? "tier"} hours/mo=${serviceHoursPerMonth} paidUntil=${paidUntilRaw || "—"}`
  );
  revalidatePath(`/admin/tenants/${tenantId}`);
}

// ─── Member management from the console (SPEC §5) ───────────────────────────
//
// Same capabilities as the tenant's own /settings/team, but entered through
// requirePlatformAdmin() instead of requireTenantAdmin(slug). Until now a
// platform admin could read a tenant's members and nothing else: during a
// "the client is locked out and calling you" incident there was no path,
// because resetting a password required already being a tenant_admin of that
// tenant or holding a support grant the locked-out tenant had to issue first.
//
// The rules that protect a tenant from its own admins protect it from us too:
// the last tenant_admin cannot be removed, and every write is audited inside
// the same transaction.

function parseAdminRoles(fd: FormData): string[] {
  return fd
    .getAll("roles")
    .map(String)
    .filter((r) => (ASSIGNABLE_ROLES as readonly string[]).includes(r));
}

/** Invite (or re-role) a member of a tenant, from the console. */
export async function adminInviteMember(tenantId: string, formData: FormData): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const roles = parseAdminRoles(formData);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("A valid email is required");
  }

  const [t] = await db.select().from(tenant).where(eq(tenant.id, tenantId)).limit(1);
  if (!t) throw new Error("Tenant not found");

  // Find or create the global user record (same as inviteMember).
  let [u] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (!u) {
    const ins = await db.insert(user).values({ email, name }).returning();
    u = Array.isArray(ins) ? ins[0] : ins;
  }
  const userId = u.id;

  await withDrizzleTenant(tenantId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(tenantMember)
      .where(and(eq(tenantMember.tenantId, tenantId), eq(tenantMember.userId, userId)))
      .limit(1);
    if (existing) {
      await tx
        .update(tenantMember)
        .set({ roles, updatedAt: new Date() })
        .where(eq(tenantMember.id, existing.id));
    } else {
      await tx.insert(tenantMember).values({ tenantId, userId, roles });
    }
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: adminId,
      action: existing ? "member_roles_updated" : "member_invited",
      entityType: "tenant_member",
      entityId: userId,
      intent: `[platform admin] ${existing ? "Updated" : "Invited"} ${email} → [${roles.join(", ") || "no roles"}]`,
    });
  });

  // Best-effort invite email — never fail the invite if mail is down.
  try {
    const loginUrl = `${appBaseUrl()}/login?email=${encodeURIComponent(email)}`;
    await sendEmail(inviteEmail(email, t.name, loginUrl));
  } catch (e) {
    console.error("[admin-invite] email send failed:", (e as Error).message);
  }
  revalidatePath(`/admin/tenants/${tenantId}`);
}

/** Remove a member from ONE tenant. Last tenant_admin is protected. */
export async function adminRemoveMember(tenantId: string, formData: FormData): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("userId required");

  await withDrizzleTenant(tenantId, async (tx) => {
    const [m] = await tx
      .select()
      .from(tenantMember)
      .where(and(eq(tenantMember.tenantId, tenantId), eq(tenantMember.userId, userId)))
      .limit(1);
    if (!m) throw new Error("Member not found");

    if (m.roles?.includes("tenant_admin")) {
      const admins = await tx.select().from(tenantMember).where(eq(tenantMember.tenantId, tenantId));
      const adminCount = admins.filter((a) => a.roles?.includes("tenant_admin")).length;
      if (adminCount <= 1) throw new Error("Cannot remove the last tenant_admin");
    }

    const [u] = await tx.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);

    await tx.delete(tenantMember).where(eq(tenantMember.id, m.id));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: adminId,
      action: "member_removed",
      entityType: "tenant_member",
      entityId: userId,
      intent: `[platform admin] Removed ${u?.email ?? userId} from tenant`,
    });
  });
  revalidatePath(`/admin/tenants/${tenantId}`);
}

// Wordlist + generator mirror settings/team/actions.ts: entropy comes from the
// CSPRNG index and the base64url suffix, not from the words being secret. The
// readable half exists so the password can be dictated over the phone.
const TEMP_PASSWORD_WORDS = [
  "amber", "cedar", "delta", "ember", "falcon", "garnet", "harbor", "indigo",
  "jasper", "kepler", "lumen", "mango", "nectar", "onyx", "piston", "quartz",
  "raven", "sable", "tundra", "umber", "violet", "willow", "xenon", "yonder",
  "zephyr", "biscuit", "compass", "driftwood", "flint", "granite",
] as const;

function generateTempPassword(): string {
  const w1 = TEMP_PASSWORD_WORDS[randomInt(TEMP_PASSWORD_WORDS.length)];
  const w2 = TEMP_PASSWORD_WORDS[randomInt(TEMP_PASSWORD_WORDS.length)];
  const entropy = randomBytes(8).toString("base64url"); // 8 bytes = 64 bits
  return `${w1}-${w2}-${entropy}`;
}

export type AdminResetPasswordState = {
  error?: string;
  tempPassword?: string;
  email?: string;
};

/**
 * Console-side password reset. Identical mechanics to the tenant's own
 * resetMemberPassword(): CSPRNG temp password, bcrypt at 10 rounds like every
 * other password write in this app, mustChangePassword so the member is forced
 * to pick their own on next sign-in, and the plaintext returned exactly ONCE
 * for a copy-once UI. Never Math.random().
 */
export async function adminResetMemberPassword(
  tenantId: string,
  _prev: AdminResetPasswordState | null,
  formData: FormData
): Promise<AdminResetPasswordState> {
  try {
    const adminId = await requirePlatformAdmin();
    const userId = String(formData.get("userId") ?? "");
    if (!userId) return { error: "userId required" };

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);
    let email = "";

    await withDrizzleTenant(tenantId, async (tx) => {
      // Confirm the target really is a member of THIS tenant before touching
      // their global user row — same check the tenant-side action makes.
      const [m] = await tx
        .select()
        .from(tenantMember)
        .where(and(eq(tenantMember.tenantId, tenantId), eq(tenantMember.userId, userId)))
        .limit(1);
      if (!m) throw new Error("Member not found");

      const [u] = await tx.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
      email = u?.email ?? "";

      await tx
        .update(user)
        .set({ password: hash, mustChangePassword: true, updatedAt: new Date() })
        .where(eq(user.id, userId));

      await tx.insert(auditEvent).values({
        tenantId,
        actorId: adminId,
        action: "password_reset_by_admin",
        entityType: "tenant_member",
        entityId: userId,
        intent: `[platform admin] Reset password for ${email || userId}`,
      });
    });

    revalidatePath(`/admin/tenants/${tenantId}`);
    return { tempPassword, email };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Password reset failed" };
  }
}

/** Log service time spent for a tenant (counts against the monthly quota). */
export async function logServiceHours(tenantId: string, formData: FormData): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const hours = parseFloat(String(formData.get("hours") ?? "0"));
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!(hours > 0)) throw new Error("Enter hours greater than 0");
  const minutes = Math.round(hours * 60);

  await withDrizzleTenant(tenantId, async (tx) => {
    await tx.insert(serviceHoursEntry).values({ tenantId, minutes, note, loggedBy: adminId });
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: adminId,
      action: "service_hours_logged",
      entityType: "service_hours_entry",
      entityId: tenantId,
      intent: `${hours}h${note ? ` — ${note}` : ""}`,
    });
  });
  revalidatePath(`/admin/tenants/${tenantId}`);
}

// ─── Telegram onboarding approvals ──────────────────────────────────────────
//
// Applicants come from the login bot's /start interview, which writes an
// onboarding_application row when their phone matches no existing user (see
// otp-bot/bot.js#finishInterview and platform/src/platform/db/
// onboarding-schema.ts). The /tma mini app was the original writer and was
// deleted 2026-08-10; nothing else changed here. A platform admin reviews the
// queue at /admin/onboarding and either attaches the applicant to an existing
// tenant, provisions a brand-new tenant for them, or rejects. Every decision
// is atomic (mutation + audit in one transaction) and, on success, best-effort
// DMs the applicant on Telegram. A Telegram failure NEVER rolls back or fails
// the decision — it is logged only.

// undici (Node's fetch) has no total-response timeout. This DM is best-effort
// and fires AFTER the approval has already committed, but it is still awaited
// inside the admin's server action — without a bound, a wedged
// api.telegram.org would leave the admin's approval spinning forever on a
// notification that no longer affects the outcome. 10s: Telegram answers
// sendMessage in well under a second; past that the remote is hung.
const TG_NOTIFY_TIMEOUT_MS = 10_000;

const TG_MINIAPP_APPROVED = "Your request is approved — open the mini app to sign in";
const TG_MINIAPP_REJECTED = "Sorry, your request was rejected";

/**
 * Best-effort Telegram DM to an applicant's chat, on the shared login bot's
 * token. Never throws. Returns whether the send succeeded (for logging only)
 * so callers can note an undelivered notification without failing the
 * approval/rejection that already committed.
 */
async function notifyTelegramChat(chatId: string | null, text: string): Promise<boolean> {
  const botToken =
    process.env.TELEGRAM_BOT_TOKEN?.trim() ||
    process.env.OTP_BOT_TOKEN?.trim() ||
    process.env.TELEGRAM_OTP_BOT_TOKEN?.trim();
  if (!chatId) {
    console.warn("[onboarding] application has no telegram chat id — notify skipped");
    return false;
  }
  if (!botToken) {
    console.warn("[onboarding] TELEGRAM_BOT_TOKEN/OTP_BOT_TOKEN not set — notify skipped");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(TG_NOTIFY_TIMEOUT_MS),
    });
    if (!res.ok) console.error(`[onboarding] telegram notify HTTP ${res.status}`);
    return res.ok;
  } catch (e) {
    // AbortSignal.timeout() rejects with a DOMException named "TimeoutError".
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      log.error("onboarding: Telegram notify timed out", { timeoutMs: TG_NOTIFY_TIMEOUT_MS, err: e });
      return false;
    }
    console.error("[onboarding] telegram notify failed:", (e as Error).message);
    return false;
  }
}

function slugifyCompany(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base.length >= 2 ? base : `co-${Date.now().toString(36)}`.slice(0, 40);
}

// A Telegram-only applicant has no email, but the global `user` row needs one
// (NOT NULL + unique). Synthesize a stable placeholder keyed by the Telegram
// identity — the real identity binding is telegram_link (chat_id), not this.
function placeholderEmail(app: {
  id: string;
  telegramUserId: string | null;
  telegramChatId: string | null;
}): string {
  const key = app.telegramUserId || app.telegramChatId || app.id;
  return `tg-${key}@telegram.local`;
}

/**
 * Approve an application onto an EXISTING tenant with a chosen role. In ONE
 * transaction: reuse-or-create the applicant's user (by their linked Telegram
 * chat, else a synthesized placeholder), upsert their tenant_member with the
 * role, link the Telegram chat so they can log in one-tap immediately, mark the
 * application approved, and audit. Then DM them on Telegram (best effort).
 *
 * Form-invoked via approveApplication.bind(null, id); tenantSlug + role come
 * from the submitted FormData (mirrors approveTelegramLink's bind+FormData
 * shape).
 */
export async function approveApplication(id: string, formData: FormData): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "").trim();
  if (!tenantSlug) throw new Error("Pick a tenant to attach this applicant to");
  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(role)) throw new Error("Invalid role");

  const [t] = await db.select().from(tenant).where(eq(tenant.slug, tenantSlug)).limit(1);
  if (!t) throw new Error(`Tenant "${tenantSlug}" not found`);

  const [app] = await db
    .select()
    .from(onboardingApplication)
    .where(eq(onboardingApplication.id, id))
    .limit(1);
  if (!app) throw new Error("Application not found");
  if (app.status !== "pending") throw new Error(`Application already ${app.status}`);

  const chatId = app.telegramChatId;

  await db.transaction(async (tx) => {
    // Reuse the user if this Telegram chat is already linked; else find-or-create.
    let userId: string | null = null;
    if (chatId) {
      const [link] = await tx
        .select({ userId: telegramLink.userId })
        .from(telegramLink)
        .where(eq(telegramLink.chatId, chatId))
        .limit(1);
      userId = link?.userId ?? null;
    }
    if (!userId) {
      const email = placeholderEmail(app);
      let [u] = await tx.select().from(user).where(eq(user.email, email)).limit(1);
      if (!u) {
        const ins = await tx
          .insert(user)
          .values({ email, name: app.fullName, phone: app.phone })
          .returning();
        u = Array.isArray(ins) ? ins[0] : ins;
      }
      userId = u.id;
    }

    // tenant_member is RLS-scoped — set the GUC before touching it / audit.
    await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${t.id}'`));
    const [existing] = await tx
      .select()
      .from(tenantMember)
      .where(and(eq(tenantMember.tenantId, t.id), eq(tenantMember.userId, userId)))
      .limit(1);
    if (existing) {
      await tx
        .update(tenantMember)
        .set({ roles: [role], updatedAt: new Date() })
        .where(eq(tenantMember.id, existing.id));
    } else {
      await tx.insert(tenantMember).values({ tenantId: t.id, userId, roles: [role] });
    }

    // Link the Telegram chat so the next /start login_<token> authenticates
    // instantly (global table — GUC is irrelevant to it).
    if (chatId) {
      await tx
        .insert(telegramLink)
        .values({ userId, chatId, username: app.telegramUsername, phone: app.phone })
        .onConflictDoUpdate({
          target: telegramLink.userId,
          set: {
            chatId,
            username: app.telegramUsername,
            phone: app.phone,
            linkedAt: new Date(),
          },
        });
    }

    await tx
      .update(onboardingApplication)
      .set({ status: "approved", decidedAt: new Date(), decidedBy: adminId })
      .where(eq(onboardingApplication.id, id));

    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId: adminId,
      action: "onboarding_application_approved",
      entityType: "onboarding_application",
      entityId: id,
      intent: `[platform admin] Approved ${app.fullName ?? app.telegramUsername ?? id} → ${tenantSlug} as ${role}`,
    });
  });

  const sent = await notifyTelegramChat(chatId, TG_MINIAPP_APPROVED);
  if (!sent) {
    console.warn(`[onboarding] approval committed but Telegram notify not delivered for application ${id}`);
  }
  revalidatePath("/admin/onboarding");
}

/**
 * Reject an application: mark it rejected (decided_at/decided_by is the audit
 * trail — audit_event.tenant_id is NOT NULL with an FK to tenant, and a
 * rejection creates no tenant), then DM the applicant (best effort).
 * Form-invoked via rejectApplication.bind(null, id).
 */
export async function rejectApplication(id: string): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const [app] = await db
    .select()
    .from(onboardingApplication)
    .where(eq(onboardingApplication.id, id))
    .limit(1);
  if (!app) throw new Error("Application not found");
  if (app.status !== "pending") throw new Error(`Application already ${app.status}`);

  await db
    .update(onboardingApplication)
    .set({ status: "rejected", decidedAt: new Date(), decidedBy: adminId })
    .where(eq(onboardingApplication.id, id));
  console.log(`[onboarding] application ${id} rejected by admin ${adminId}`);

  const sent = await notifyTelegramChat(app.telegramChatId, TG_MINIAPP_REJECTED);
  if (!sent) {
    console.warn(`[onboarding] rejection committed but Telegram notify not delivered for application ${id}`);
  }
  revalidatePath("/admin/onboarding");
}

/**
 * Approve an application for which no tenant exists yet: reuse the EXISTING
 * provisioning transaction (provisionTenantCore — tenant + admin user +
 * tenant_admin membership + AI config + audit) keyed off the application's
 * company name, then attach the Telegram link and mark the application
 * approved. Then DM the applicant (best effort). Form-invoked via
 * approveAndProvision.bind(null, id).
 *
 * Two-phase by design: provisioning owns its own atomic transaction (reused,
 * not duplicated); the link + approval + audit follow in a second transaction.
 * If the second fails the tenant already exists and the admin can finish via
 * approveApplication on that tenant.
 */
export async function approveAndProvision(id: string): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const [app] = await db
    .select()
    .from(onboardingApplication)
    .where(eq(onboardingApplication.id, id))
    .limit(1);
  if (!app) throw new Error("Application not found");
  if (app.status !== "pending") throw new Error(`Application already ${app.status}`);

  const company = (app.companyName ?? "").trim();
  if (!company) throw new Error("Application has no company name to provision a tenant from");

  const chatId = app.telegramChatId;
  const adminEmail = placeholderEmail(app);

  const { tenantId, adminUserId } = await provisionTenantCore(
    {
      name: company,
      slug: slugifyCompany(company),
      adminEmail,
      adminName: app.fullName,
      tier: "starter",
      aiProvider: "claude",
    },
    adminId
  );

  await db.transaction(async (tx) => {
    if (chatId) {
      await tx
        .insert(telegramLink)
        .values({ userId: adminUserId, chatId, username: app.telegramUsername, phone: app.phone })
        .onConflictDoUpdate({
          target: telegramLink.userId,
          set: {
            chatId,
            username: app.telegramUsername,
            phone: app.phone,
            linkedAt: new Date(),
          },
        });
    }
    await tx
      .update(onboardingApplication)
      .set({ status: "approved", decidedAt: new Date(), decidedBy: adminId })
      .where(eq(onboardingApplication.id, id));

    await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantId}'`));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: adminId,
      action: "onboarding_application_provisioned",
      entityType: "onboarding_application",
      entityId: id,
      intent: `[platform admin] Provisioned tenant "${company}" from application and attached ${app.fullName ?? adminEmail} as tenant_admin`,
    });
  });

  const sent = await notifyTelegramChat(chatId, TG_MINIAPP_APPROVED);
  if (!sent) {
    console.warn(`[onboarding] provision approval committed but Telegram notify not delivered for application ${id}`);
  }
  revalidatePath("/admin/onboarding");
}

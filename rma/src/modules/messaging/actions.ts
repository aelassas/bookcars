"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { message, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { classifyMessage, draftReply } from "./ai-engine";
import { sendAiReplyForInboundMessage } from "./send-message";
import { canManageMessagingForTenant } from "./policies";

const AUTO_DRAFT_CONFIDENCE = 0.7;

/**
 * Resolve the active tenant for a given URL slug and verify the signed-in
 * user is a member. Throws "Forbidden" otherwise — never trusts a tenant
 * identifier supplied by the client.
 */
async function tenantForSlug(slug: string) {
  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden");
  return t;
}

export async function createMessage(
  tenantSlug: string,
  data: {
    channel: string;
    from: string;
    body: string;
    customerId?: string;
    customerName?: string;
  }
) {
  const t = await tenantForSlug(tenantSlug);
  await canManageMessagingForTenant(t.id);
  return withDrizzleTenant(t.id, async (tx) => {
    const rows = await tx
      .insert(message)
      .values({
        tenantId: t.id,
        channel: data.channel,
        from: data.from,
        body: data.body,
        customerId: data.customerId ?? null,
        customerName: data.customerName ?? null,
        status: "new",
      })
      .returning();
    const row = Array.isArray(rows) ? rows[0] : rows;
    revalidatePath(`/${tenantSlug}/messages`);
    return row;
  });
}

async function getAvailableVehiclesForReply(tenantId: string) {
  return withDrizzleTenant(tenantId, async (tx) => {
    return tx
      .select({
        make: vehicle.make,
        model: vehicle.model,
        plate: vehicle.plate,
        dailyRate: vehicle.dailyRate,
      })
      .from(vehicle)
      .where(and(eq(vehicle.status, "available")))
      .limit(8);
  });
}

export async function classifyAndUpdateMessage(tenantSlug: string, id: string) {
  const t = await tenantForSlug(tenantSlug);
  await canManageMessagingForTenant(t.id);
  await assertNotPreviewMode(t.id);
  const existing = await withDrizzleTenant(t.id, async (tx) => {
    const rows = await tx.select().from(message).where(eq(message.id, id));
    return rows[0];
  });
  if (!existing) throw new Error("Message not found");

  const classification = await classifyMessage(existing.body, t.id);

  let aiReply: string | null = null;
  if (classification.confidence >= AUTO_DRAFT_CONFIDENCE) {
    const vehicles = await getAvailableVehiclesForReply(t.id);
    const { reply } = await draftReply(
      existing.body,
      {
        customerName: existing.customerName,
        channel: existing.channel,
        classification,
        availableVehicles: vehicles,
      },
      t.id
    );
    aiReply = reply;
  }

  const updated = await withDrizzleTenant(t.id, async (tx) => {
    const rows = await tx
      .update(message)
      .set({
        status: aiReply ? "ai_drafted" : "classified",
        classification: classification as unknown as Record<string, unknown>,
        aiReply,
      })
      .where(eq(message.id, id))
      .returning();
    return Array.isArray(rows) ? rows[0] : rows;
  });

  revalidatePath(`/${tenantSlug}/messages`);
  return { message: updated, classification, aiReply };
}

export async function draftAiReplyForMessage(tenantSlug: string, id: string) {
  const t = await tenantForSlug(tenantSlug);
  await canManageMessagingForTenant(t.id);
  await assertNotPreviewMode(t.id);
  const existing = await withDrizzleTenant(t.id, async (tx) => {
    const rows = await tx.select().from(message).where(eq(message.id, id));
    return rows[0];
  });
  if (!existing) throw new Error("Message not found");

  const classification =
    (existing.classification as unknown as Awaited<
      ReturnType<typeof classifyMessage>
    >) ?? (await classifyMessage(existing.body, t.id));
  const vehicles = await getAvailableVehiclesForReply(t.id);
  const { reply, engine } = await draftReply(
    existing.body,
    {
      customerName: existing.customerName,
      channel: existing.channel,
      classification,
      availableVehicles: vehicles,
    },
    t.id
  );

  const updated = await withDrizzleTenant(t.id, async (tx) => {
    const rows = await tx
      .update(message)
      .set({ aiReply: reply, status: "ai_drafted" })
      .where(eq(message.id, id))
      .returning();
    return Array.isArray(rows) ? rows[0] : rows;
  });

  revalidatePath(`/${tenantSlug}/messages`);
  return { message: updated, reply, engine };
}

export async function updateAiReply(
  tenantSlug: string,
  id: string,
  reply: string
) {
  const t = await tenantForSlug(tenantSlug);
  await canManageMessagingForTenant(t.id);
  await assertNotPreviewMode(t.id);
  return withDrizzleTenant(t.id, async (tx) => {
    const rows = await tx
      .update(message)
      .set({ aiReply: reply })
      .where(eq(message.id, id))
      .returning();
    revalidatePath(`/${tenantSlug}/messages`);
    return Array.isArray(rows) ? rows[0] : rows;
  });
}

export async function sendAiReply(tenantSlug: string, id: string) {
  const t = await tenantForSlug(tenantSlug);
  await canManageMessagingForTenant(t.id);
  await assertNotPreviewMode(t.id);

  const result = await sendAiReplyForInboundMessage(id, t.id);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to send AI reply");
  }

  // Mock sends never actually deliver, so don't claim a delivery timestamp.
  const now = new Date();
  return withDrizzleTenant(t.id, async (tx) => {
    const rows = await tx
      .update(message)
      .set({
        status: "ai_replied",
        aiReplyApprovedAt: now,
        ...(result.mock ? {} : { aiReplySentAt: now }),
      })
      .where(eq(message.id, id))
      .returning();
    revalidatePath(`/${tenantSlug}/messages`);
    return Array.isArray(rows) ? rows[0] : rows;
  });
}

export async function sendHumanReply(
  tenantSlug: string,
  id: string
) {
  const t = await tenantForSlug(tenantSlug);
  await canManageMessagingForTenant(t.id);
  await assertNotPreviewMode(t.id);
  return withDrizzleTenant(t.id, async (tx) => {
    const rows = await tx
      .update(message)
      .set({ status: "human_replied" })
      .where(eq(message.id, id))
      .returning();
    revalidatePath(`/${tenantSlug}/messages`);
    return Array.isArray(rows) ? rows[0] : rows;
  });
}

export async function archiveMessage(tenantSlug: string, id: string) {
  const t = await tenantForSlug(tenantSlug);
  await canManageMessagingForTenant(t.id);
  await assertNotPreviewMode(t.id);
  return withDrizzleTenant(t.id, async (tx) => {
    const rows = await tx
      .update(message)
      .set({ status: "archived" })
      .where(eq(message.id, id))
      .returning();
    revalidatePath(`/${tenantSlug}/messages`);
    return Array.isArray(rows) ? rows[0] : rows;
  });
}

"use server";

import { lead, deal, vehicle, auditEvent, integrationConnection, cardDismissal } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { requireAuth } from "@/platform/auth/authorization";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canManageCRMForTenant, canCloseDealForTenant } from "./policies";
import { pickLeadOwner, notifyLeadOwner } from "./lead-routing";
import { createBitrix24Client } from "@/platform/integrations/bitrix24/client";
import { createStageCatalog, FUNNEL_C6_COLUMNS, type FunnelColumn } from "@/platform/integrations/bitrix24/mappings";
import { assertSafeBitrixWebhookUrl } from "@/platform/integrations/bitrix24/url-guard";
import { INTENT_LABELS, isIntent, type Intent } from "./intent";

// ─── «Мой день» card dismissal ───────────────────────────────────────────────

export type DismissCardKind = "waiting" | "hot";

/**
 * Close a «Ждут ответа»/«Горячее» card. «Мой день» is a SHARED team queue, so
 * a card someone already handled keeps nagging everyone — closing it drops the
 * (line, contact) conversation from the /my waiting+hot reads for 14 days
 * (see my-queries.ts) and records WHY, so we learn what the team is closing.
 *
 * Same guard cascade as reply-actions.ts#queueLeadReply (tenant membership →
 * not preview → can-manage-CRM → authed actor). `reason` is optional (a quick
 * chip or free text); the column is nullable.
 */
export async function dismissCard(
  slug: string,
  kind: DismissCardKind,
  line: string,
  contact: string,
  reason?: string | null
): Promise<void> {
  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden: not a member of this tenant");
  await assertNotPreviewMode(t.id);
  await canManageCRMForTenant(t.id);
  const actorId = await requireAuth();

  const cleanReason = reason?.trim() || null;

  await withDrizzleTenant(t.id, async (tx) => {
    const rows = await tx
      .insert(cardDismissal)
      .values({
        tenantId: t.id,
        kind,
        line,
        contact,
        dismissedBy: actorId,
        reason: cleanReason,
      })
      .returning({ id: cardDismissal.id });
    const dismissalId = (Array.isArray(rows) ? rows[0] : rows)?.id;

    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "crm.my_day_card_dismissed",
      entityType: "card_dismissal",
      entityId: dismissalId,
      intent: `Dismissed ${kind} card ${line}/${contact}${cleanReason ? ` — ${cleanReason}` : ""}`,
    });
  });

  revalidatePath(`/${slug}/my`);
}

// ─── Lead Actions ──────────────────────────────────────────────────────────

export async function createLead(
  tenantId: string,
  data: {
    customerName: string;
    phone?: string;
    email?: string;
    source?: string;
    notes?: string;
  }
) {
  await assertNotPreviewMode(tenantId);
  await canManageCRMForTenant(tenantId);
  const row = await withDrizzleTenant(tenantId, async (tx) => {
    // HOT LANE — every manually-created lead has no assignedTo field on
    // this form, so it always starts unowned. Auto-route it to the
    // least-loaded sales owner right away instead of letting it sit
    // unassigned until someone notices.
    const assignedTo = await pickLeadOwner(tx, tenantId);
    const rows = await tx
      .insert(lead)
      .values({
        tenantId,
        customerName: data.customerName,
        phone: data.phone ?? null,
        email: data.email ?? null,
        source: data.source ?? null,
        notes: data.notes ?? null,
        assignedTo,
      })
      .returning();
    const r = Array.isArray(rows) ? rows[0] : rows;
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "lead.create",
      entityType: "lead",
      entityId: r.id,
      intent: assignedTo
        ? `Created lead: ${data.customerName} (auto-routed)`
        : `Created lead: ${data.customerName}`,
    });
    return r;
  });
  if (row?.assignedTo) {
    // Best-effort — never let a notification failure surface to the caller.
    notifyLeadOwner(row.assignedTo, row).catch(() => {});
  }
  revalidatePath("/");
  return row;
}

export async function updateLeadStatus(
  tenantId: string,
  leadId: string,
  status: "new" | "contacted" | "qualified" | "lost"
) {
  await assertNotPreviewMode(tenantId);
  await canManageCRMForTenant(tenantId);
  const row = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .update(lead)
      .set({ status })
      .where(eq(lead.id, leadId))
      .returning();
    const r = Array.isArray(rows) ? rows[0] : rows;
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "lead.updateStatus",
      entityType: "lead",
      entityId: leadId,
      intent: `Updated lead status to ${status}`,
    });
    return r;
  });
  revalidatePath("/");
  return row ?? null;
}

/** Alias used by the lead-detail stage chevron (mirrors moveDealStage below). */
export async function setLeadStatus(
  tenantId: string,
  leadId: string,
  status: "new" | "contacted" | "qualified" | "lost"
) {
  return updateLeadStatus(tenantId, leadId, status);
}

// ─── Deal Actions ──────────────────────────────────────────────────────────

export async function createDeal(
  tenantId: string,
  data: {
    ref: string;
    type: "rent" | "lease" | "purchase";
    leadId?: string;
    status?: "open" | "won" | "lost";
    stage?: "inquiry" | "quote" | "contract" | "handover" | "closed";
    value?: number;
    notes?: string;
  }
) {
  await assertNotPreviewMode(tenantId);
  await canManageCRMForTenant(tenantId);
  const row = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .insert(deal)
      .values({
        tenantId,
        ref: data.ref,
        type: data.type,
        leadId: data.leadId || null,
        status: data.status ?? "open",
        stage: data.stage ?? "inquiry",
        value: data.value ?? null,
        notes: data.notes ?? null,
        // Touched now → shows on the live kanban (which filters by activity).
        lastActivityAt: new Date(),
      })
      .returning();
    const r = Array.isArray(rows) ? rows[0] : rows;
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "deal.create",
      entityType: "deal",
      entityId: r.id,
      intent: `Created deal ${data.ref}`,
    });
    return r;
  });
  revalidatePath("/");
  return row;
}

export async function updateDeal(
  tenantId: string,
  dealId: string,
  data: {
    ref?: string;
    type?: "rent" | "lease" | "purchase";
    status?: "open" | "won" | "lost";
    stage?: "inquiry" | "quote" | "contract" | "handover" | "closed";
    value?: number | null;
    balanceDue?: number;
    notes?: string | null;
    ownerId?: string | null;
    leadId?: string | null;
  }
) {
  await assertNotPreviewMode(tenantId);
  await canManageCRMForTenant(tenantId);
  const row = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .update(deal)
      .set({
        ...(data.ref !== undefined ? { ref: data.ref } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.stage !== undefined ? { stage: data.stage } : {}),
        ...(data.value !== undefined ? { value: data.value } : {}),
        ...(data.balanceDue !== undefined ? { balanceDue: data.balanceDue } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.ownerId !== undefined ? { ownerId: data.ownerId || null } : {}),
        ...(data.leadId !== undefined ? { leadId: data.leadId || null } : {}),
        updatedAt: new Date(),
        // Any edit is real activity — keep the deal in the live kanban.
        lastActivityAt: new Date(),
      })
      .where(eq(deal.id, dealId))
      .returning();
    const r = Array.isArray(rows) ? rows[0] : rows;
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "deal.update",
      entityType: "deal",
      entityId: dealId,
      intent: `Updated deal ${data.ref ?? dealId}`,
    });
    return r;
  });
  revalidatePath("/");
  return row ?? null;
}

export async function deleteDeal(tenantId: string, dealId: string) {
  await assertNotPreviewMode(tenantId);
  await canManageCRMForTenant(tenantId);
  await withDrizzleTenant(tenantId, async (tx) => {
    await tx.delete(deal).where(eq(deal.id, dealId));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "deal.delete",
      entityType: "deal",
      entityId: dealId,
      intent: `Deleted deal ${dealId}`,
    });
  });
  revalidatePath("/");
}

export async function updateDealStage(
  tenantId: string,
  dealId: string,
  stage: "inquiry" | "quote" | "contract" | "handover" | "closed"
) {
  await assertNotPreviewMode(tenantId);
  await canManageCRMForTenant(tenantId);
  const row = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .update(deal)
      // Moving a card is activity — restamp so it stays/returns to the live board.
      .set({ stage, updatedAt: new Date(), lastActivityAt: new Date() })
      .where(eq(deal.id, dealId))
      .returning();
    const r = Array.isArray(rows) ? rows[0] : rows;
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "deal.updateStage",
      entityType: "deal",
      entityId: dealId,
      intent: `Updated deal stage to ${stage}`,
    });
    return r;
  });
  revalidatePath("/");
  return row ?? null;
}

export async function moveDealStage(
  tenantId: string,
  dealId: string,
  stage: "inquiry" | "quote" | "contract" | "handover" | "closed"
) {
  return updateDealStage(tenantId, dealId, stage);
}

// ─── Customer intent tag (Watchers board) ──────────────────────────────────
// A manager tags what the customer actually wants (rent | lease_6m | lease_12m
// | lease_to_own | sale). Writes the SHARED deal.intent column — the same field
// the messaging extraction layer populates from AI tags — so the two never
// diverge. Passing null clears the explicit tag and lets the board fall back to
// the derived provisional intent. This is a classification, not customer
// activity, so it deliberately does NOT restamp last_activity_at (the deal
// keeps its true "days since touch" on the board).
export async function setDealIntent(tenantId: string, dealId: string, intent: Intent | null) {
  await assertNotPreviewMode(tenantId);
  await canManageCRMForTenant(tenantId);
  if (intent !== null && !isIntent(intent)) {
    throw new Error(`Unknown intent: ${String(intent)}`);
  }
  const row = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .update(deal)
      .set({ intent, updatedAt: new Date() })
      .where(eq(deal.id, dealId))
      .returning();
    const r = Array.isArray(rows) ? rows[0] : rows;
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "deal.setIntent",
      entityType: "deal",
      entityId: dealId,
      intent: intent
        ? `Tagged intent → ${INTENT_LABELS[intent].short}`
        : `Cleared intent tag`,
    });
    return r;
  });
  revalidatePath("/");
  return row ?? null;
}

// ─── Two-way funnel-detail move (Azat's Bitrix category-6 board) ─────────────
// Dragging a card between the DETAIL columns (exact Bitrix stage names). Does
// two things: (a) writes the new stage_detail + coarse stage locally, and
// (b) — when write-back is enabled — POSTs crm.deal.update back to Bitrix so
// the two boards stay in lockstep. A Bitrix failure ROLLS BACK the local move
// and throws, so the client can surface an error toast and re-fetch truth.
//
// Write-back is OFF by default and gated on BITRIX_STAGE_WRITEBACK=true. The
// portal-wide SOURCE_READ_ONLY guard blocks every OTHER Bitrix write; this is
// the single sanctioned exception (via client.callWrite), so it stays behind
// its own explicit switch. With the flag off, the local move still succeeds —
// the board is usable one-way until the coordinator enables the round-trip.
function bitrixStageWritebackEnabled(): boolean {
  return process.env.BITRIX_STAGE_WRITEBACK === "true";
}

async function getBitrixWebhookUrl(tenantId: string): Promise<string | null> {
  // integration_connection is FORCE-RLS'd — the raw `db` handle under
  // DB_APP_ROLE=app_runtime reads zero rows (no app.tenant_id set), so the
  // per-tenant webhook was never found and Bitrix write-back silently fell back
  // to the env URL or failed. Must run inside withDrizzleTenant (rule #1).
  const [conn] = await withDrizzleTenant(tenantId, (tx) =>
    tx
      .select()
      .from(integrationConnection)
      .where(and(eq(integrationConnection.tenantId, tenantId), eq(integrationConnection.provider, "bitrix24")))
      .limit(1),
  );
  const url = (conn?.config as { webhookUrl?: string } | undefined)?.webhookUrl;
  return url || process.env.BITRIX24_WEBHOOK_URL || null;
}

// Resolve the correct Bitrix STATUS_ID for this deal's LIVE category and POST
// the stage change. Reads the deal's category first (crm.deal.get) so a deal
// in a non-category-6 funnel gets a stage id from ITS OWN funnel, never a
// cross-funnel C6 id that Bitrix would reject or misfile.
async function pushBitrixDealStage(tenantId: string, externalId: string, col: FunnelColumn): Promise<void> {
  const webhookUrl = await getBitrixWebhookUrl(tenantId);
  if (!webhookUrl) throw new Error("Bitrix24 webhook not configured for this tenant.");
  assertSafeBitrixWebhookUrl(webhookUrl);
  const client = createBitrix24Client(webhookUrl);
  const catalog = createStageCatalog(client);

  const got = await client.call<{ CATEGORY_ID?: string | number; STAGE_ID?: string }>("crm.deal.get", {
    id: Number(externalId),
  });
  if (got.error) throw new Error(`${got.error}: ${got.error_description ?? ""}`);
  const categoryId = got.result?.CATEGORY_ID ?? "6";

  let statusId = await catalog.stageIdFor(categoryId, col.name);
  // Fall back to the canonical category-6 STATUS_ID when the deal is in
  // category 6 but the live stage list couldn't be read.
  if (!statusId && String(categoryId) === "6") statusId = col.stageId;
  if (!statusId) {
    throw new Error(`Stage "${col.name}" does not exist in this deal's Bitrix funnel (category ${categoryId}).`);
  }

  const upd = await client.callWrite<boolean>("crm.deal.update", {
    id: Number(externalId),
    fields: { STAGE_ID: statusId },
  });
  if (upd.error) throw new Error(`${upd.error}: ${upd.error_description ?? ""}`);
  if (upd.result === false) throw new Error("Bitrix rejected the stage update.");
}

export async function moveDealStageDetail(tenantId: string, dealId: string, columnKey: string) {
  await assertNotPreviewMode(tenantId);
  await canManageCRMForTenant(tenantId);

  const col = FUNNEL_C6_COLUMNS.find((c) => c.name === columnKey);
  if (!col) throw new Error(`Unknown funnel stage: ${columnKey}`);

  // Optimistic local move — capture the prior values so a Bitrix failure can
  // restore them exactly.
  const before = await withDrizzleTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        stage: deal.stage,
        stageDetail: deal.stageDetail,
        externalId: deal.externalId,
        externalSource: deal.externalSource,
        ref: deal.ref,
        lastActivityAt: deal.lastActivityAt,
      })
      .from(deal)
      .where(eq(deal.id, dealId))
      .limit(1);
    if (!row) throw new Error("Deal not found");
    await tx
      .update(deal)
      .set({ stageDetail: col.name, stage: col.coarse, updatedAt: new Date(), lastActivityAt: new Date() })
      .where(eq(deal.id, dealId));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "deal.moveStageDetail",
      entityType: "deal",
      entityId: dealId,
      intent: `Moved deal ${row.ref} → ${col.name}`,
    });
    return row;
  });

  if (bitrixStageWritebackEnabled() && before.externalSource === "bitrix24" && before.externalId) {
    try {
      await pushBitrixDealStage(tenantId, before.externalId, col);
    } catch (e) {
      // Roll the local move back to exactly what it was, then re-throw so the
      // client shows an error toast and reloads the board from the server.
      await withDrizzleTenant(tenantId, async (tx) => {
        await tx
          .update(deal)
          .set({
            stageDetail: before.stageDetail,
            stage: before.stage,
            updatedAt: new Date(),
            lastActivityAt: before.lastActivityAt,
          })
          .where(eq(deal.id, dealId));
        await tx.insert(auditEvent).values({
          tenantId,
          actorId: null,
          action: "deal.moveStageDetail.rollback",
          entityType: "deal",
          entityId: dealId,
          intent: `Rolled back stage move for ${before.ref}: ${e instanceof Error ? e.message : String(e)}`,
        });
      });
      throw new Error(
        `Bitrix update failed — move rolled back: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  revalidatePath("/");
  return { ok: true };
}

// ─── Coordinator assignment ────────────────────────────────────────────────
// The "girls" hand an unassigned deal to a salesperson. Setting owner_id moves
// it out of the coordinator inbox and into that person's "My" funnel; the
// linked lead's assignee is kept in step so the two never diverge.
export async function assignDeal(tenantId: string, dealId: string, ownerId: string) {
  await assertNotPreviewMode(tenantId);
  await canManageCRMForTenant(tenantId);
  const row = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .update(deal)
      // Assignment is fresh activity — restamp so the card is "live".
      .set({ ownerId, updatedAt: new Date(), lastActivityAt: new Date() })
      .where(eq(deal.id, dealId))
      .returning();
    const r = Array.isArray(rows) ? rows[0] : rows;
    if (r?.leadId) {
      await tx.update(lead).set({ assignedTo: ownerId, updatedAt: new Date() }).where(eq(lead.id, r.leadId));
    }
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "deal.assign",
      entityType: "deal",
      entityId: dealId,
      intent: `Assigned deal ${r?.ref ?? dealId} to a salesperson`,
    });
    return r;
  });
  revalidatePath("/");
  return row ?? null;
}

// ─── Car finder: attach / detach a fleet vehicle ────────────────────────────
// The salesperson picked an actual car to offer against this deal (from the
// "Подобрать авто" finder). Set deal.vehicle_id so the car shows on the deal
// and the booking step can pre-fill it. Restamps activity so the card stays
// live on the kanban.
export async function attachVehicleToDeal(tenantId: string, dealId: string, vehicleId: string) {
  await assertNotPreviewMode(tenantId);
  await canManageCRMForTenant(tenantId);
  const row = await withDrizzleTenant(tenantId, async (tx) => {
    // Confirm the car belongs to this tenant (RLS already scopes, but this
    // gives a clean error instead of a foreign-key violation) and grab a label
    // for the audit trail.
    const [v] = await tx
      .select({ id: vehicle.id, make: vehicle.make, model: vehicle.model, plate: vehicle.plate })
      .from(vehicle)
      .where(eq(vehicle.id, vehicleId))
      .limit(1);
    if (!v) throw new Error("Vehicle not found in this fleet.");

    const rows = await tx
      .update(deal)
      .set({ vehicleId, updatedAt: new Date(), lastActivityAt: new Date() })
      .where(eq(deal.id, dealId))
      .returning();
    const r = Array.isArray(rows) ? rows[0] : rows;
    const label = `${v.make} ${v.model}`.trim() + (v.plate ? ` (${v.plate})` : "");
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "deal.attachVehicle",
      entityType: "deal",
      entityId: dealId,
      intent: `Attached vehicle ${label} to deal ${r?.ref ?? dealId}`,
    });
    return r;
  });
  revalidatePath("/");
  return row ?? null;
}

export async function detachVehicleFromDeal(tenantId: string, dealId: string) {
  await assertNotPreviewMode(tenantId);
  await canManageCRMForTenant(tenantId);
  const row = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .update(deal)
      .set({ vehicleId: null, updatedAt: new Date(), lastActivityAt: new Date() })
      .where(eq(deal.id, dealId))
      .returning();
    const r = Array.isArray(rows) ? rows[0] : rows;
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "deal.detachVehicle",
      entityType: "deal",
      entityId: dealId,
      intent: `Removed the attached vehicle from deal ${r?.ref ?? dealId}`,
    });
    return r;
  });
  revalidatePath("/");
  return row ?? null;
}

export async function closeDeal(
  tenantId: string,
  dealId: string,
  outcome: "won" | "lost"
) {
  await assertNotPreviewMode(tenantId);
  await canCloseDealForTenant(tenantId);
  const row = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .update(deal)
      .set({ status: outcome, stage: "closed", updatedAt: new Date(), lastActivityAt: new Date() })
      .where(eq(deal.id, dealId))
      .returning();
    const r = Array.isArray(rows) ? rows[0] : rows;
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "deal.close",
      entityType: "deal",
      entityId: dealId,
      intent: `Closed deal as ${outcome}`,
    });
    return r;
  });
  revalidatePath("/");
  return row ?? null;
}

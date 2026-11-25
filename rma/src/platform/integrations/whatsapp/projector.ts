// Projector: turn a WhatsApp inbound event into a platform message,
// auto-classify, and draft an AI reply.
//
// This runs inside the webhook handler (no signed-in user), so it uses
// tenantId directly instead of tenantSlug + auth checks.

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/platform/db/client";
import { message, customer, tenant, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { classifyMessage, draftReply } from "@/modules/messaging/ai-engine";
import type { Classification } from "@/modules/messaging/classify";
import { extractSignals } from "@/modules/messaging/extract";
import { rollUpVouched } from "@/modules/messaging/vouch";
import { isBroadcast, parseCompetitorPost } from "@/modules/messaging/competitor";
import { competitorOffer } from "@/platform/db/schema";
import { log } from "@/platform/log";

const AUTO_DRAFT_CONFIDENCE = 0.7;

/**
 * Best-effort error report. Sentry is optional (no DSN in dev, and the SDK may
 * not be initialised at all), so it is imported lazily and every failure is
 * swallowed — telemetry must never break the webhook path.
 */
async function report(err: unknown, ctx: { tenantId: string; stage: string }): Promise<void> {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(err, {
      tags: { tenantId: ctx.tenantId, integration: "whatsapp", stage: ctx.stage },
    });
  } catch {
    // Sentry unavailable / not initialised — the log line above is the record.
  }
}

async function getTenantSlug(tenantId: string): Promise<string | null> {
  const rows = await db.select({ slug: tenant.slug }).from(tenant).where(eq(tenant.id, tenantId)).limit(1);
  return rows[0]?.slug ?? null;
}

async function findOrCreateCustomer(args: {
  tenantId: string;
  phone: string;
  name: string;
}) {
  const { tenantId, phone, name } = args;
  const normalizedPhone = phone.replace(/\D/g, "");

  return withDrizzleTenant(tenantId, async (tx) => {
    // Try to find existing customer by normalized phone
    const existing = await tx
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.tenantId, tenantId),
          eq(customer.phone, normalizedPhone)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { customer: existing[0], created: false };
    }

    // Create new customer
    const rows = await tx
      .insert(customer)
      .values({
        tenantId,
        name,
        phone: normalizedPhone,
        source: "whatsapp",
        division: "rent",
      })
      .returning();
    return { customer: Array.isArray(rows) ? rows[0] : rows, created: true };
  });
}

async function createInboundMessage(args: {
  tenantId: string;
  channel: string;
  from: string;
  body: string;
  customerId?: string;
  customerName?: string;
}) {
  const { tenantId, channel, from, body, customerId, customerName } = args;
  return withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .insert(message)
      .values({
        tenantId,
        channel,
        from,
        body,
        direction: "inbound",
        customerId: customerId ?? null,
        customerName: customerName ?? null,
        status: "new",
      })
      .returning();
    return Array.isArray(rows) ? rows[0] : rows;
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
      .where(eq(vehicle.status, "available"))
      .limit(8);
  });
}

async function classifyAndDraft(args: {
  tenantId: string;
  messageId: string;
  body: string;
  from?: string | null;
  customerName?: string | null;
  channel: string;
}) {
  const { tenantId, messageId, body, from, customerName, channel } = args;

  const classification = await classifyMessage(body, tenantId);

  // INTELLIGENCE LAYER — mine the deal-driving facts from this line and persist
  // them on the message (deterministic, always runs). Failures here must never
  // block classification/draft, so the whole block is defensive.
  const signals = extractSignals(body);

  let aiReply: string | null = null;
  if (classification.confidence >= AUTO_DRAFT_CONFIDENCE) {
    const vehicles = await getAvailableVehiclesForReply(tenantId);
    const { reply } = await draftReply(
      body,
      {
        customerName,
        channel,
        classification,
        availableVehicles: vehicles,
      },
      tenantId
    );
    aiReply = reply;
  }

  const updated = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .update(message)
      .set({
        status: aiReply ? "ai_drafted" : "classified",
        classification: classification as unknown as Record<string, unknown>,
        aiReply,
        // Extracted deal-driving facts (0050).
        extractedCarText: signals.carText,
        extractedPriceAed: signals.priceAed,
        extractedDateFrom: signals.dateFrom,
        extractedDateTo: signals.dateTo,
        extractedTermMonths: signals.termMonths,
        extractedIntent: signals.intent,
        extractedLanguage: signals.language,
        extractedManagerMention: signals.managerMention,
        extractedAt: new Date(),
      })
      .where(eq(message.id, messageId))
      .returning();
    return Array.isArray(rows) ? rows[0] : rows;
  });

  // Roll the freshest vouched facts up onto the customer's lead + open deals.
  try {
    await withDrizzleTenant(tenantId, (tx) =>
      rollUpVouched(tx, { tenantId, phone: from, signals })
    );
  } catch (err) {
    log.error("whatsapp projector: vouch rollup failed (non-fatal)", {
      tenantId,
      messageId,
      err,
    });
    await report(err, { tenantId, stage: "vouch-rollup" });
  }

  // Competitor broadcast? Shred it into competitor_offer for the market view.
  if (isBroadcast(body)) {
    try {
      const post = parseCompetitorPost(body);
      if (post.rows.length > 0) {
        await withDrizzleTenant(tenantId, async (tx) => {
          await tx.insert(competitorOffer).values(
            post.rows.map((r) => ({
              tenantId,
              sourceMessageId: messageId,
              competitor: post.source,
              sourceLine: r.sourceLine,
              carText: r.carText,
              year: r.year,
              priceAed: r.priceAed,
              postedAt: new Date(),
            }))
          );
        });
      }
    } catch (err) {
      log.error("whatsapp projector: competitor parse failed (non-fatal)", {
        tenantId,
        messageId,
        err,
      });
      await report(err, { tenantId, stage: "competitor-parse" });
    }
  }

  return { message: updated, classification, aiReply };
}

export interface ProjectResult {
  ok: boolean;
  messageId?: string;
  customerId?: string;
  customerCreated?: boolean;
  classification?: Classification;
  aiReply?: string | null;
  reason?: string;
}

/**
 * Main entry point: project a WhatsApp inbound text message into the platform.
 * 1. Find or create customer by phone
 * 2. Create message row
 * 3. Auto-classify + draft AI reply
 * 4. Revalidate messages page
 */
export async function projectWhatsAppInbound(args: {
  tenantId: string;
  from: string;
  name: string;
  body: string;
}): Promise<ProjectResult> {
  const { tenantId, from, name, body } = args;

  try {
    // 1. Customer
    const { customer: cust, created: customerCreated } = await findOrCreateCustomer({
      tenantId,
      phone: from,
      name,
    });

    // 2. Message
    const msg = await createInboundMessage({
      tenantId,
      channel: "whatsapp",
      from,
      body,
      customerId: cust.id,
      customerName: cust.name,
    });

    // 3. Classify + draft
    const { classification, aiReply } = await classifyAndDraft({
      tenantId,
      messageId: msg.id,
      body,
      from,
      customerName: cust.name,
      channel: "whatsapp",
    });

    // 4. Revalidate UI
    const slug = await getTenantSlug(tenantId);
    if (slug) {
      revalidatePath(`/${slug}/messages`);
    }

    return {
      ok: true,
      messageId: msg.id,
      customerId: cust.id,
      customerCreated,
      classification,
      aiReply,
    };
  } catch (err) {
    // This swallows a real inbound customer message: without a log line + an
    // error report the loss is completely silent to us.
    log.error("whatsapp projector: inbound projection failed", {
      tenantId,
      from,
      bodyPreview: body.slice(0, 120),
      err,
    });
    await report(err, { tenantId, stage: "project-inbound" });
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "projection failed",
    };
  }
}

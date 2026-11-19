"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auditEvent, customer, document, message, rental, vehicle } from "@/platform/db/schema";
import { requireAuth } from "@/platform/auth/authorization";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { createRentalSignatureRequest, getRentalSubmission, taqeeqSignedAt, taqeeqSigningUrl } from "@/platform/integrations/taqeeq/client";
import { canManageRentalsForTenant } from "./policies";
import { enqueueDistributorWhatsApp } from "./outbox";

async function loadRental(home: string, rentalId: string) {
  return withDrizzleTenant(home, async (tx) => {
    const [row] = await tx.select({ rental, customer, vehicle }).from(rental)
      .innerJoin(customer, eq(customer.id, rental.customerId))
      .innerJoin(vehicle, eq(vehicle.id, rental.vehicleId))
      .where(eq(rental.id, rentalId)).limit(1);
    if (!row) throw new Error("Rental not found");
    return row;
  });
}

export async function requestRentalDocuments(tenantId: string, tenantSlug: string, rentalId: string) {
  await canManageRentalsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  const row = await loadRental(home, rentalId);
  if (row.rental.onboardingStage !== "new_lead") throw new Error("Documents were already requested or this rental has moved on");
  if (!row.customer.phone) throw new Error("Customer phone is missing");
  const text = `Hi ${row.customer.name}, please send photos of your passport, driving licence, and Emirates ID if you are a UAE resident. We need them to prepare your rental contract for ${row.vehicle.plate}.`;
  const line = process.env.CUSTOMER_WA_SENDER_LINE?.trim() || (tenantSlug === "rma" ? "rma-main" : "");
  if (!line) throw new Error("CUSTOMER_WA_SENDER_LINE is not configured for this tenant");
  const queued = await enqueueDistributorWhatsApp({
    tenantId: home, line, toDigits: row.customer.phone, text, dedupeKey: `rental-onboarding-docs:${rentalId}`,
  });
  if (!queued) throw new Error("Customer phone is not a valid WhatsApp recipient");
  await withDrizzleTenant(home, async (tx) => {
    await tx.update(rental).set({ onboardingStage: "awaiting_docs", updatedAt: new Date() })
      .where(and(eq(rental.id, rentalId), eq(rental.onboardingStage, "new_lead")));
    await tx.insert(message).values({
      tenantId: home, channel: "whatsapp", direction: "outbound", to: row.customer.phone,
      customerId: row.customer.id, body: text, status: "queued", relatedEntityType: "rental", relatedEntityId: rentalId,
    });
    await tx.insert(auditEvent).values({
      tenantId: home, actorId, action: "rental.onboarding.documents_requested", entityType: "rental", entityId: rentalId,
      intent: "Requested customer documents through the approved WhatsApp outbox",
    });
  });
  revalidatePath(`/${tenantSlug}/onboarding`);
}

export async function startRentalOcrReview(tenantId: string, tenantSlug: string, rentalId: string) {
  await canManageRentalsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  const row = await loadRental(home, rentalId);
  if (row.rental.onboardingStage !== "awaiting_docs") throw new Error("This rental is not awaiting documents");
  await withDrizzleTenant(home, async (tx) => {
    const [doc] = await tx.select({ id: document.id }).from(document)
      .where(and(eq(document.entityType, "customer"), eq(document.entityId, row.customer.id))).limit(1);
    if (!doc) throw new Error("Upload at least one customer document first");
    await tx.update(rental).set({ onboardingStage: "ocr_review", updatedAt: new Date() })
      .where(and(eq(rental.id, rentalId), eq(rental.onboardingStage, "awaiting_docs")));
    await tx.insert(auditEvent).values({
      tenantId: home, actorId, action: "rental.onboarding.ocr_started", entityType: "rental", entityId: rentalId,
      intent: "Staff started customer document OCR review",
    });
  });
  revalidatePath(`/${tenantSlug}/onboarding`);
}

export async function sendRentalContract(tenantId: string, tenantSlug: string, rentalId: string) {
  await canManageRentalsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  const row = await loadRental(home, rentalId);
  if (row.rental.onboardingStage !== "ocr_review") throw new Error("Review the customer documents before sending the contract");
  if (!row.customer.documentsReviewedAt) throw new Error("Apply the reviewed OCR data on the customer page first");
  if (!row.customer.email) throw new Error("Customer email is required for the Taqeeq signing invitation");
  if (row.rental.taqeeqSubmissionId) throw new Error("A Taqeeq submission already exists for this rental");
  const submitter = await createRentalSignatureRequest({ email: row.customer.email, name: row.customer.name });
  const submissionId = String(submitter.submission_id);
  await withDrizzleTenant(home, async (tx) => {
    await tx.update(rental).set({
      onboardingStage: "contract_sent", taqeeqSubmissionId: submissionId,
      contractUrl: taqeeqSigningUrl(submitter.slug), updatedAt: new Date(),
    }).where(and(eq(rental.id, rentalId), eq(rental.onboardingStage, "ocr_review")));
    await tx.insert(auditEvent).values({
      tenantId: home, actorId, action: "rental.onboarding.contract_sent", entityType: "rental", entityId: rentalId,
      intent: `Sent the rental contract through Taqeeq submission ${submissionId}`,
    });
  });
  revalidatePath(`/${tenantSlug}/onboarding`);
}

export async function confirmRentalSignature(tenantId: string, tenantSlug: string, rentalId: string) {
  await canManageRentalsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  const row = await loadRental(home, rentalId);
  if (row.rental.onboardingStage !== "contract_sent" || !row.rental.taqeeqSubmissionId) throw new Error("No Taqeeq contract is awaiting signature");
  const submission = await getRentalSubmission(row.rental.taqeeqSubmissionId);
  const signedAt = taqeeqSignedAt(submission);
  if (!signedAt) throw new Error("Taqeeq does not show every required signature as complete");
  await withDrizzleTenant(home, async (tx) => {
    await tx.update(rental).set({ onboardingStage: "signed", taqeeqSignedAt: signedAt, updatedAt: new Date() })
      .where(and(eq(rental.id, rentalId), eq(rental.onboardingStage, "contract_sent")));
    await tx.insert(auditEvent).values({
      tenantId: home, actorId, action: "rental.onboarding.signed", entityType: "rental", entityId: rentalId,
      intent: `Confirmed completed signatures through Taqeeq submission ${row.rental.taqeeqSubmissionId}`,
    });
  });
  revalidatePath(`/${tenantSlug}/onboarding`);
}

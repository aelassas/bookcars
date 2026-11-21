"use server";

import { execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auditEvent, customer, deal, document, rental, vehicle } from "@/platform/db/schema";
import { requireAuth } from "@/platform/auth/authorization";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { parseTarsDocumentNumber, parseTarsHandoff, TARS_HANDOFF_VERSION } from "@/platform/integrations/tars/handoff";
import {
  hashTarsSubmissionPackage,
  isRetryableTarsError,
  parseTarsRunnerResult,
  type TarsSubmissionPackage,
} from "@/platform/integrations/tars/submission";
import { canManageRentalsForTenant } from "./policies";

const execFileAsync = promisify(execFile);
const CUSTOMER_DOCUMENT_CATEGORIES = ["id", "license", "passport", "international_license"];

export interface TarsReviewInput {
  agreementNumber: string;
  signatureConfirmed: boolean;
  location: string;
  odometer: number;
  fuelPercent: number;
}

function autoSubmissionEnabled(): boolean {
  return process.env.TARS_AUTO_SUBMIT_ENABLED === "true";
}

function refresh(tenantSlug: string, rentalId: string): void {
  revalidatePath(`/${tenantSlug}/rentals/${rentalId}`);
  revalidatePath(`/${tenantSlug}/onboarding`);
  revalidatePath(`/${tenantSlug}/deals`);
}

export async function reviewTarsSubmission(tenantId: string, tenantSlug: string, rentalId: string, input: TarsReviewInput) {
  await canManageRentalsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  if (!autoSubmissionEnabled()) throw new Error("Automatic TARS submission is disabled by the feature flag");
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();

  const submission = await withDrizzleTenant(home, async (tx) => {
    const rows = await tx.select().from(rental).where(eq(rental.id, rentalId)).limit(1);
    const current = rows[0];
    if (!current) throw new Error("Rental not found");
    if (current.tarsDocumentNumber) throw new Error(`This rental is already linked to TARS document ${current.tarsDocumentNumber}`);
    if (current.tarsSubmissionStatus === "running") throw new Error("A TARS submission is already running");

    const [related] = await tx.select({ customer, vehicle }).from(rental)
      .innerJoin(customer, eq(customer.id, rental.customerId))
      .innerJoin(vehicle, eq(vehicle.id, rental.vehicleId))
      .where(eq(rental.id, rentalId)).limit(1);
    if (!related) throw new Error("Rental customer or vehicle not found");
    if (!related.customer.documentsReviewedAt) throw new Error("Review the customer documents before preparing TARS");
    if (!current.contractUrl) throw new Error("Generate or upload the signed contract before preparing TARS");

    const contractId = /^\/api\/files\/([0-9a-f-]{36})$/i.exec(current.contractUrl)?.[1];
    if (!contractId) throw new Error("Automatic submission needs a signed PDF stored in RMA private documents");
    const [contract] = await tx.select().from(document).where(and(
      eq(document.id, contractId),
      eq(document.entityType, "rental"),
      eq(document.entityId, rentalId),
      eq(document.mimeType, "application/pdf"),
    )).limit(1);
    if (!contract) throw new Error("The signed rental contract PDF was not found");

    const customerDocuments = await tx.select({
      id: document.id,
      category: document.category,
      filename: document.filename,
    }).from(document).where(and(
      eq(document.entityType, "customer"),
      eq(document.entityId, related.customer.id),
      inArray(document.category, CUSTOMER_DOCUMENT_CATEGORIES),
    ));
    if (customerDocuments.length === 0) throw new Error("Upload the customer ID, passport or licence before preparing TARS");

    const value: TarsSubmissionPackage = {
      handoff: parseTarsHandoff({
        version: TARS_HANDOFF_VERSION,
        rentalId,
        agreementNumber: input.agreementNumber,
        signatureConfirmed: input.signatureConfirmed,
        customer: { name: related.customer.name, emiratesId: related.customer.emiratesId },
        vehicle: { plate: related.vehicle.plate, vin: related.vehicle.vin },
        rental: {
          startAt: current.startDate.toISOString(),
          returnAt: current.returnDate.toISOString(),
          location: input.location,
          odometer: input.odometer,
          fuelPercent: input.fuelPercent,
        },
      }),
      contractDocumentId: contract.id,
      customerDocuments,
    };
    const hash = hashTarsSubmissionPackage(value);
    const now = new Date();
    await tx.update(rental).set({
      tarsSubmissionStatus: "awaiting_confirmation",
      tarsSubmissionHash: hash,
      tarsSubmissionPayload: value,
      tarsSubmissionError: null,
      tarsSubmissionReviewedBy: actorId,
      tarsSubmissionReviewedAt: now,
      tarsSubmissionCompletedAt: null,
      updatedAt: now,
    }).where(eq(rental.id, rentalId));
    await tx.insert(auditEvent).values({
      tenantId: home,
      actorId,
      action: "rental.tars.submission_reviewed",
      entityType: "rental",
      entityId: rentalId,
      intent: `Manager reviewed automatic TARS package ${value.handoff.agreementNumber} (${hash.slice(0, 12)}) with ${customerDocuments.length} customer documents and signed contract ${contract.id}`,
    });
    return { status: "awaiting_confirmation" as const, hash, submission: value };
  });
  refresh(tenantSlug, rentalId);
  return submission;
}

async function resolveContractPath(home: string, value: TarsSubmissionPackage): Promise<string> {
  return withDrizzleTenant(home, async (tx) => {
    const [contract] = await tx.select({ storageKey: document.storageKey }).from(document)
      .where(eq(document.id, value.contractDocumentId)).limit(1);
    if (!contract || path.basename(contract.storageKey) !== contract.storageKey) throw new Error("The reviewed contract file is unavailable");
    return path.join(process.cwd(), ".private-uploads", "documents", contract.storageKey);
  });
}

async function runBrowserSubmission(home: string, value: TarsSubmissionPackage, dryRun: boolean) {
  const handoffPath = path.join(tmpdir(), `rma-tars-${value.handoff.rentalId}-${Date.now()}.json`);
  await writeFile(handoffPath, JSON.stringify(value.handoff), { mode: 0o600 });
  const args = [
    path.join(process.cwd(), "scripts", "tars-prepare.ts"),
    handoffPath,
    "--contract",
    await resolveContractPath(home, value),
    "--json",
    dryRun ? "--dry-run" : "--submit",
  ];
  try {
    const { stdout } = await execFileAsync(path.join(process.cwd(), "node_modules", ".bin", "tsx"), args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
      timeout: 240_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    return parseTarsRunnerResult(stdout);
  } catch (error) {
    const failure = error as { stderr?: string; stdout?: string; message?: string };
    throw new Error((failure.stderr || failure.stdout || failure.message || "TARS runner failed").trim().slice(0, 1000));
  } finally {
    await unlink(handoffPath).catch(() => {});
  }
}

export async function submitTarsApplication(tenantId: string, tenantSlug: string, rentalId: string, reviewedHash: string) {
  await canManageRentalsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  if (!autoSubmissionEnabled()) throw new Error("Automatic TARS submission is disabled by the feature flag");
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  const dryRun = process.env.TARS_AUTO_SUBMIT_DRY_RUN !== "false";
  const maxAttempts = Math.min(3, Math.max(1, Number(process.env.TARS_AUTO_SUBMIT_MAX_ATTEMPTS) || 3));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const claimed = await withDrizzleTenant(home, async (tx) => {
      const [current] = await tx.select().from(rental).where(eq(rental.id, rentalId)).limit(1);
      if (!current) throw new Error("Rental not found");
      if (current.tarsDocumentNumber) return { status: "succeeded" as const, documentNumber: current.tarsDocumentNumber, attempts: current.tarsSubmissionAttempts, summary: "Already linked to TARS" };
      if (current.tarsSubmissionStatus === "dry_run" && current.tarsSubmissionHash === reviewedHash) {
        return { status: "dry_run" as const, attempts: current.tarsSubmissionAttempts, summary: "This reviewed package already completed its dry run" };
      }
      if (current.tarsSubmissionStatus === "running") throw new Error("A TARS submission is already running");
      if (current.tarsSubmissionHash !== reviewedHash || !current.tarsSubmissionPayload) {
        throw new Error("Review the current rental details again before confirming TARS submission");
      }
      if (!["awaiting_confirmation", "failed"].includes(current.tarsSubmissionStatus)) {
        throw new Error("The reviewed TARS package is not ready for submission");
      }
      const value = current.tarsSubmissionPayload as TarsSubmissionPackage;
      const now = new Date();
      const updated = await tx.update(rental).set({
        tarsSubmissionStatus: "running",
        tarsSubmissionAttempts: sql`${rental.tarsSubmissionAttempts} + 1`,
        tarsSubmissionError: null,
        updatedAt: now,
      }).where(and(
        eq(rental.id, rentalId),
        eq(rental.tarsSubmissionHash, reviewedHash),
        inArray(rental.tarsSubmissionStatus, ["awaiting_confirmation", "failed"]),
      )).returning({ attempts: rental.tarsSubmissionAttempts });
      if (!updated[0]) throw new Error("Another manager changed this TARS submission; review it again");
      await tx.insert(auditEvent).values({
        tenantId: home,
        actorId,
        action: "rental.tars.submission_attempt",
        entityType: "rental",
        entityId: rentalId,
        intent: `${dryRun ? "Dry-run" : "Submit"} reviewed TARS package ${value.handoff.agreementNumber}; attempt ${updated[0].attempts} of ${maxAttempts}; hash ${reviewedHash.slice(0, 12)}`,
      });
      return { status: "running" as const, value, attempts: updated[0].attempts };
    });
    if (claimed.status !== "running") return claimed;

    try {
      const result = await runBrowserSubmission(home, claimed.value, dryRun);
      const documentNumber = result.documentNumber ? parseTarsDocumentNumber(result.documentNumber) : null;
      await withDrizzleTenant(home, async (tx) => {
        const now = new Date();
        await tx.update(rental).set({
          tarsSubmissionStatus: result.status,
          tarsSubmissionError: null,
          tarsSubmissionCompletedAt: now,
          tarsDocumentNumber: documentNumber,
          onboardingStage: result.status === "succeeded" ? "tars" : undefined,
          updatedAt: now,
        }).where(and(eq(rental.id, rentalId), eq(rental.tarsSubmissionHash, reviewedHash)));
        if (result.status === "succeeded") {
          const [current] = await tx.select({ dealId: rental.dealId }).from(rental).where(eq(rental.id, rentalId)).limit(1);
          if (current?.dealId) await tx.update(deal).set({ stage: "tars", updatedAt: now, lastActivityAt: now })
            .where(and(eq(deal.id, current.dealId), inArray(deal.stage, ["inquiry", "quote", "contract"])));
        }
        await tx.insert(auditEvent).values({
          tenantId: home,
          actorId,
          action: result.status === "succeeded" ? "rental.tars.submitted" : "rental.tars.dry_run_completed",
          entityType: "rental",
          entityId: rentalId,
          intent: result.status === "succeeded" ? `Submitted reviewed TARS application as ${documentNumber}` : `Dry-run completed for reviewed TARS package ${claimed.value.handoff.agreementNumber}; no final Submit button was pressed`,
        });
      });
      refresh(tenantSlug, rentalId);
      return { status: result.status, documentNumber, attempts: claimed.attempts, summary: result.summary };
    } catch (error) {
      const message = (error instanceof Error ? error.message : "TARS submission failed").slice(0, 500);
      await withDrizzleTenant(home, async (tx) => {
        await tx.update(rental).set({ tarsSubmissionStatus: "failed", tarsSubmissionError: message, updatedAt: new Date() })
          .where(and(eq(rental.id, rentalId), eq(rental.tarsSubmissionHash, reviewedHash)));
        await tx.insert(auditEvent).values({
          tenantId: home,
          actorId,
          action: "rental.tars.submission_failed",
          entityType: "rental",
          entityId: rentalId,
          intent: `TARS attempt ${claimed.attempts} failed: ${message}`,
        });
      });
      const canRetry = attempt + 1 < maxAttempts && isRetryableTarsError(message);
      if (!canRetry) {
        refresh(tenantSlug, rentalId);
        return { status: "failed" as const, attempts: claimed.attempts, error: message, summary: "" };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw new Error("TARS submission stopped unexpectedly");
}

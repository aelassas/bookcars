import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/platform/auth";
import { getTenantRoles, isPlatformAdmin } from "@/platform/auth/authorization";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { customer, rental, vehicle } from "@/platform/db/schema";
import { buildRentalContractPdf, missingRentalContractFields, type RentalContractPdfData } from "@/lib/pdf/rental-contract";
import { rentalPricingDays } from "@/modules/rental/pricing";
import { storeRentalContract, syncTarsRentalContract } from "@/modules/rental/contract-documents";
import { TarsClient } from "@/platform/integrations/tars/client";
import { loadSession } from "@/platform/integrations/tars/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: rentalId } = await params;
  const { db } = await import("@/platform/db/client");
  const [rentalRow] = await db.select({ tenantId: rental.tenantId }).from(rental).where(eq(rental.id, rentalId)).limit(1);
  if (!rentalRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { tenantId } = rentalRow;
  const roles = await getTenantRoles(session.user.id, tenantId);
  const isAdmin = await isPlatformAdmin(session.user.id);
  const canGenerate = roles.some((role) => ["sales", "sales_manager", "general_manager", "tenant_admin", "platform_admin"].includes(role));
  if (!canGenerate && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    if (new URL(req.url).searchParams.get("source") === "tars") {
      const tarsSession = loadSession();
      if (!tarsSession) throw new Error("No authenticated TARS session is available on the server");
      const client = new TarsClient({
        orgDid: process.env.TARS_ORG_DID?.trim() || "did:rta:51646245",
        cookieHeader: tarsSession.cookieHeader,
        baseUrl: process.env.TARS_BASE_URL?.trim() || "https://tars.rta.ae",
      });
      const result = await syncTarsRentalContract({ tenantId, rentalId, actorId: session.user.id, client });
      return NextResponse.json(result);
    }

    const pdfData = await withDrizzleTenant(tenantId, async (tx) => {
      const [row] = await tx.select({ r: rental, c: customer, v: vehicle }).from(rental)
        .innerJoin(customer, eq(rental.customerId, customer.id))
        .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
        .where(eq(rental.id, rentalId)).limit(1);
      if (!row) throw new Error("Rental not found in tenant");
      if (row.r.contractUrl) return { existingUrl: row.r.contractUrl } as const;
      if (row.r.tarsDocumentNumber) {
        throw new Error(`TARS contract ${row.r.tarsDocumentNumber} already exists. Sync its PDF instead of generating a new contract.`);
      }
      if (!row.c.documentsReviewedAt) {
        throw new Error("Review and apply the customer's document data before generating a contract");
      }
      const data: RentalContractPdfData = {
        reference: rentalId.slice(0, 8).toUpperCase(),
        companyName: "RMA Car Rental LLC S.O.C",
        companySlug: "rma",
        customerName: row.c.name,
        customerPhone: row.c.phone,
        customerDob: row.c.dateOfBirth,
        customerNationality: row.c.nationality,
        customerAddress: row.c.address,
        customerEid: row.c.emiratesId,
        customerEidIssue: row.c.emiratesIdIssue,
        customerEidExpiry: row.c.emiratesIdExpiry,
        customerPassport: row.c.passportNumber,
        customerPassportIssue: row.c.passportIssue,
        customerPassportExpiry: row.c.passportExpiry,
        customerLicenseNumber: row.c.driverLicenseNumber,
        customerLicenseIssue: row.c.driverLicenseIssue,
        customerLicenseExpiry: row.c.driverLicenseExpiry,
        vehicleMake: row.v.make,
        vehicleModel: row.v.model,
        vehiclePlate: row.v.plate,
        vehicleYear: row.v.year,
        vehicleColour: row.v.colour,
        exitOdometer: row.r.startOdometer,
        exitFuelPercent: row.r.startFuelLevel,
        returnOdometer: row.r.finalOdometer,
        returnFuelPercent: row.r.fuelLevel,
        startDate: row.r.startDate,
        returnDate: row.r.returnDate,
        actualReturnDate: row.r.actualReturnDate,
        totalDays: row.r.totalDays,
        dailyRate: row.r.dailyRate,
        deposit: row.r.deposit,
        rentalSubtotal: row.r.dailyRate * rentalPricingDays(row.r.totalDays),
        dailyKmLimit: row.r.dailyMileageLimitKm == null ? null : String(row.r.dailyMileageLimitKm),
        extraKmFee: "3 /km",
        returnRemarks: row.r.damageNotes,
      };
      const missing = missingRentalContractFields(data);
      if (missing.length > 0) {
        throw new Error(`Contract data is incomplete: ${missing.join(", ")}. Review the customer documents and vehicle Mulkiya first.`);
      }
      return { data } as const;
    });
    if ("existingUrl" in pdfData) return NextResponse.json({ url: pdfData.existingUrl, created: false });

    const bytes = await buildRentalContractPdf(pdfData.data);
    const result = await storeRentalContract({
      tenantId,
      rentalId,
      actorId: session.user.id,
      bytes,
      filename: `rma-rental-contract-${rentalId.slice(0, 8)}.pdf`,
      source: "generated",
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[contract]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Contract operation failed" }, { status: 409 });
  }
}

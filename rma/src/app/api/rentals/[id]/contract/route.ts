// platform/src/app/api/rentals/[id]/contract/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/platform/auth";
import { getTenantRoles, isPlatformAdmin } from "@/platform/auth/authorization";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { rental, customer, vehicle, document, company, tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { buildRentalContractPdf, type RentalContractPdfData } from "@/lib/pdf/rental-contract";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const COMPANY_NAME =
  process.env.DRIVER_BOT_COMPANY_NAME ?? "TAKE Auto Rent a Car LLC";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rentalId } = await params;

  // Cross-tenant lookup to resolve tenantId from the rental id.
  // We use the platform db (no RLS) to get tenantId only, then
  // re-read inside withDrizzleTenant so RLS applies to all subsequent writes.
  const { db } = await import("@/platform/db/client");
  const [rentalRow] = await db
    .select({ tenantId: rental.tenantId })
    .from(rental)
    .where(eq(rental.id, rentalId))
    .limit(1);
  if (!rentalRow)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { tenantId } = rentalRow;

  // Authorize: member of this tenant or platform admin.
  const roles = await getTenantRoles(session.user.id, tenantId);
  const isAdmin = await isPlatformAdmin(session.user.id);
  if (roles.length === 0 && !isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Further gating: only sales/manager/admin can generate contracts.
  const canGenerate = roles.some((r) =>
    ["sales", "sales_manager", "general_manager", "tenant_admin", "platform_admin"].includes(r)
  );
  if (!canGenerate && !isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const docId = await withDrizzleTenant(tenantId, async (tx) => {
      // Load rental with vehicle + customer.
      const [row] = await tx
        .select({
          r: rental,
          customerName: customer.name,
          customerPhone: customer.phone,
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehiclePlate: vehicle.plate,
          vehicleYear: vehicle.year,
          vehicleOdometer: vehicle.odometer,
        })
        .from(rental)
        .innerJoin(customer, eq(rental.customerId, customer.id))
        .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
        .where(eq(rental.id, rentalId))
        .limit(1);
      if (!row) throw new Error("Rental not found in tenant");

      // Branding: the rental's company (brand) wins; otherwise the tenant's
      // brand name; otherwise the env default. The slug picks the page-2
      // terms image.
      const brand = row.r.companyId
        ? (
            await tx
              .select({ slug: company.slug, name: company.name, brandName: company.brandName })
              .from(company)
              .where(eq(company.id, row.r.companyId))
              .limit(1)
          )[0]
        : undefined;
      const [tenantRow] = await tx
        .select({ slug: tenant.slug, name: tenant.name, brandName: tenant.brandName })
        .from(tenant)
        .where(eq(tenant.id, tenantId))
        .limit(1);

      const pdfData: RentalContractPdfData = {
        reference: rentalId.slice(0, 8).toUpperCase(),
        companyName:
          brand?.brandName ??
          brand?.name ??
          tenantRow?.brandName ??
          tenantRow?.name ??
          COMPANY_NAME,
        companySlug: brand?.slug ?? tenantRow?.slug ?? null,
        vehicleMake: row.vehicleMake ?? "",
        vehicleModel: row.vehicleModel ?? "",
        vehiclePlate: row.vehiclePlate ?? "",
        vehicleYear: row.vehicleYear ?? null,
        // Colour isn't modelled on `vehicle` yet — left blank, like the paper
        // form when the agent hasn't written it in.
        vehicleColour: null,
        exitOdometer: row.vehicleOdometer ?? null,
        exitFuelPercent: null,
        returnOdometer: row.r.finalOdometer ?? null,
        returnFuelPercent: row.r.fuelLevel ?? null,
        // Driver document fields (EID / passport / licence / DOB / nationality)
        // have no source in the schema yet; they print blank until OCR lands.
        customerName: row.customerName ?? "",
        customerPhone: row.customerPhone ?? null,
        startDate: row.r.startDate,
        returnDate: row.r.returnDate,
        totalDays: row.r.totalDays,
        dailyRate: row.r.dailyRate,
        deposit: row.r.deposit,
        rentalSubtotal: row.r.dailyRate * row.r.totalDays,
        returnRemarks: row.r.damageNotes ?? null,
      };

      const pdfBuffer = await buildRentalContractPdf(pdfData);

      // Save to .private-uploads/documents/
      const filename = `rental-contract-${rentalId.slice(0, 8)}-${Date.now()}.pdf`;
      const storageKey = filename;
      const dir = path.join(process.cwd(), ".private-uploads", "documents");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), pdfBuffer);

      // Insert document row (publicUrl is a placeholder; corrected below once we have the id).
      const [doc] = await tx
        .insert(document)
        .values({
          tenantId,
          entityType: "rental",
          entityId: rentalId,
          category: "rental_contract",
          filename,
          mimeType: "application/pdf",
          sizeBytes: pdfBuffer.length,
          storageKey,
          publicUrl: "/api/files/pending",
          uploadedBy: session.user.id,
        })
        .returning({ id: document.id });

      const finalUrl = `/api/files/${doc.id}`;

      // Patch the document row with the real URL and set rental.contract_url.
      await tx
        .update(document)
        .set({ publicUrl: finalUrl })
        .where(eq(document.id, doc.id));

      await tx
        .update(rental)
        .set({ contractUrl: finalUrl, updatedAt: new Date() })
        .where(eq(rental.id, rentalId));

      return doc.id;
    });

    return NextResponse.json({ url: `/api/files/${docId}` });
  } catch (err) {
    console.error("[contract/generate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate contract" },
      { status: 500 }
    );
  }
}

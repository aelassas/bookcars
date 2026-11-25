import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getRentalWithDetails } from "@/modules/rental/queries";
import { RentalDetail } from "@/components/rental/RentalDetail";
import ReturnChecklist from "@/components/returns/ReturnChecklist";
import { Card } from "@/components/ui";
import { MessageSquare } from "lucide-react";

interface Props {
  params: Promise<{ tenantSlug: string; rentalId: string }>;
}

export default async function RentalDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug, rentalId } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("rentals")) redirect(`/${tenantSlug}`);

  const data = await getRentalWithDetails(t.id, rentalId);
  if (!data) notFound();

  const canConfirm = (t.roles ?? []).some((r) => ["sales", "sales_manager", "general_manager", "tenant_admin", "platform_admin"].includes(r));
  const canEditPayments = (t.roles ?? []).some((r) => ["tenant_admin", "platform_admin"].includes(r));

  return (
    <main className="p-6">
      <RentalDetail
        tenantId={t.id}
        tenantSlug={tenantSlug}
        rental={data.rental}
        customerName={data.customerName}
        customerPhone={data.customerPhone}
        customerEmiratesId={data.customerEmiratesId}
        customerDocumentsReviewed={Boolean(data.customerDocumentsReviewedAt)}
        vehicleLabel={`${data.vehicleMake} ${data.vehicleModel} (${data.vehiclePlate})`}
        vehiclePlate={data.vehiclePlate ?? ""}
        vehicleVin={data.vehicleVin}
        vehicleOdometer={data.vehicleOdometer}
        liveVehicleOdometer={data.liveVehicleOdometer}
        liveVehicleOdometerAt={data.liveVehicleOdometerAt}
        odometerPhotos={data.odometerPhotos}
        payments={data.payments}
        charges={data.charges.map((charge) => ({ charge, customerName: data.customerName ?? "Customer", plate: data.vehiclePlate ?? "—" }))}
        actorId={session.user.id}
        canConfirm={canConfirm}
        canEditPayments={canEditPayments}
        tarsAutoEnabled={process.env.TARS_AUTO_SUBMIT_ENABLED === "true"}
        tarsAutoDryRun={process.env.TARS_AUTO_SUBMIT_DRY_RUN !== "false"}
        tarsAutoCloseEnabled={process.env.TARS_AUTO_CLOSE_ENABLED === "true"}
        tarsAutoCloseDryRun={process.env.TARS_AUTO_CLOSE_DRY_RUN !== "false"}
      />

      {/* Car panel additions (slice 2): the return close-out + a jump to the
          client's WhatsApp chat, so the calendar → rental → everything flow is
          complete. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div id="return-checklist" className="scroll-mt-24">
        <Card className="h-fit p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-2">Return checklist</h2>
          <ReturnChecklist tenantId={t.id} rentalId={data.rental.id} />
        </Card>
        </div>
        {data.customerPhone && (
          <div id="chat" className="scroll-mt-24">
          <Card className="h-fit p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-2">Client</h2>
            <p className="mt-2 text-sm text-ink">{data.customerName ?? "Customer"}</p>
            <p className="text-sm text-ink-2 tnum">{data.customerPhone}</p>
            <Link
              href={`/${tenantSlug}/messages`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-field bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              <MessageSquare className="h-4 w-4" /> Open WhatsApp chat
            </Link>
          </Card>
          </div>
        )}
      </div>
    </main>
  );
}

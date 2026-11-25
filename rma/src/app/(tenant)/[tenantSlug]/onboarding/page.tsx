import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, ClipboardCheck, ExternalLink, FileSearch, Send } from "lucide-react";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getRentalOnboardingBoard } from "@/modules/rental/onboarding-queries";
import { confirmRentalSignature, requestRentalDocuments, sendRentalContract, startRentalOcrReview } from "@/modules/rental/onboarding-actions";
import { TarsSection } from "@/components/rental/TarsSection";
import { Badge, Button, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rental onboarding" };

const STAGES = [
  { id: "new_lead", label: "New lead" },
  { id: "awaiting_docs", label: "Awaiting docs" },
  { id: "ocr_review", label: "OCR review" },
  { id: "contract_sent", label: "Contract sent" },
  { id: "signed", label: "Signed" },
  { id: "tars", label: "TARS" },
] as const;

export default async function RentalOnboardingPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  if (!tenant.modules.includes("rentals")) redirect(`/${tenantSlug}`);
  const board = await getRentalOnboardingBoard(tenant.id);

  return <main className="p-6">
    <PageHeader title="Rental onboarding" subtitle={`${board.rows.filter((row) => row.rental.onboardingStage !== "tars").length} in progress · latest 20 completed TARS handoffs`} icon={<ClipboardCheck className="h-4.5 w-4.5" />} action={<Link href={`/${tenantSlug}/onboarding/setup`} className="text-sm text-brand-700 hover:underline">Workspace setup</Link>} />
    <div className="overflow-x-auto pb-4">
      <div className="grid min-w-[1500px] grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const rows = board.rows.filter((row) => row.rental.onboardingStage === stage.id);
          return <section key={stage.id} className="rounded-card border border-line bg-sunken">
            <header className="flex items-center justify-between border-b border-line px-3 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-2">{stage.label}</h2>
              <Badge>{rows.length}</Badge>
            </header>
            <div className="space-y-3 p-3">
              {rows.length === 0 && <p className="py-6 text-center text-xs text-ink-3">No rentals</p>}
              {rows.map(({ rental, customer, vehicle }) => <article key={rental.id} className="rounded-card border border-line bg-surface p-3 shadow-card">
                <Link href={`/${tenantSlug}/rentals/${rental.id}`} className="font-medium text-ink hover:underline">{customer.name}</Link>
                <div className="mt-1 text-xs text-ink-3">{vehicle.plate} · {vehicle.make} {vehicle.model}</div>
                <div className="mt-2 text-xs text-ink-3 tnum">{rental.startDate.toLocaleDateString()} → {rental.returnDate.toLocaleDateString()}</div>
                <div className="mt-3 space-y-2 border-t border-line-soft pt-3">
                  {stage.id === "new_lead" && <form action={requestRentalDocuments.bind(null, tenant.id, tenantSlug, rental.id)}>
                    <Button type="submit" size="sm" className="w-full"><Send className="h-3.5 w-3.5" /> Request docs via WhatsApp</Button>
                  </form>}
                  {stage.id === "awaiting_docs" && <>
                    <Link href={`/${tenantSlug}/customers/${customer.id}`} className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"><FileSearch className="h-3.5 w-3.5" /> Open customer documents</Link>
                    {board.customersWithDocuments.has(customer.id) ? <form action={startRentalOcrReview.bind(null, tenant.id, tenantSlug, rental.id)}>
                      <Button type="submit" size="sm" variant="secondary" className="w-full">Start OCR review</Button>
                    </form> : <p className="text-xs text-ink-3">Waiting for the first document</p>}
                  </>}
                  {stage.id === "ocr_review" && <>
                    <Link href={`/${tenantSlug}/customers/${customer.id}`} className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"><FileSearch className="h-3.5 w-3.5" /> Review and apply OCR</Link>
                    {customer.documentsReviewedAt ? <form action={sendRentalContract.bind(null, tenant.id, tenantSlug, rental.id)}>
                      <Button type="submit" size="sm" className="w-full"><Send className="h-3.5 w-3.5" /> Send Taqeeq contract</Button>
                    </form> : <p className="text-xs text-warn">OCR has not been applied</p>}
                  </>}
                  {stage.id === "contract_sent" && <>
                    {rental.contractUrl && <a href={rental.contractUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 break-all text-xs font-medium text-brand-700 hover:underline">Open signing link <ExternalLink className="h-3.5 w-3.5 shrink-0" /></a>}
                    <form action={confirmRentalSignature.bind(null, tenant.id, tenantSlug, rental.id)}>
                      <Button type="submit" size="sm" variant="secondary" className="w-full"><CheckCircle2 className="h-3.5 w-3.5" /> Confirm signed</Button>
                    </form>
                  </>}
                  {stage.id === "signed" && <TarsSection
                    tenantId={tenant.id} tenantSlug={tenantSlug} rentalId={rental.id}
                    contractUrl={rental.contractUrl} tarsDocumentNumber={rental.tarsDocumentNumber}
                    customerName={customer.name} customerEmiratesId={customer.emiratesId}
                    customerDocumentsReviewed={Boolean(customer.documentsReviewedAt)}
                    vehiclePlate={vehicle.plate} vehicleVin={vehicle.vin} vehicleOdometer={vehicle.odometer}
                    startAt={rental.startDate.toISOString()} returnAt={rental.returnDate.toISOString()} canManage
                    autoEnabled={process.env.TARS_AUTO_SUBMIT_ENABLED === "true"}
                    autoDryRun={process.env.TARS_AUTO_SUBMIT_DRY_RUN !== "false"}
                    submissionStatus={rental.tarsSubmissionStatus} submissionHash={rental.tarsSubmissionHash}
                    submissionAttempts={rental.tarsSubmissionAttempts} submissionError={rental.tarsSubmissionError}
                    initialSubmission={(rental.tarsSubmissionPayload ?? null) as import("@/platform/integrations/tars/submission").TarsSubmissionPackage | null}
                  />}
                  {stage.id === "tars" && <div className="flex items-center gap-1.5 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" /> {rental.tarsDocumentNumber ?? "Recorded"}</div>}
                </div>
              </article>)}
            </div>
          </section>;
        })}
      </div>
    </div>
  </main>;
}

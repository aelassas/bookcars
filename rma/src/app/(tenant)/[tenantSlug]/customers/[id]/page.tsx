import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getCustomerDetail } from "@/modules/crm/customer-queries";
import { getCustomerThread, getCustomerReplyContext } from "@/modules/crm/chat-queries";
import { ChatThread } from "@/components/crm/ChatThread";
import {
  Card,
  CardHeader,
  Badge,
  Table,
  TH,
  TD,
  type BadgeTone,
} from "@/components/ui";
import { CustomerActions } from "@/components/crm/CustomerActions";
import { BackLink } from "@/components/ui/BackLink";
import { recordHref, safeReturnHref } from "@/lib/return-navigation";
import { DocumentPanel } from "@/components/documents/DocumentPanel";

const money = (n: number | null | undefined) => `${(n ?? 0).toLocaleString()} AED`;

const STATUS_TONE: Record<string, BadgeTone> = {
  reserved: "warning",
  active: "success",
  returned: "info",
  completed: "neutral",
  cancelled: "neutral",
  draft: "neutral",
  defaulted: "danger",
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { tenantSlug, id } = await params;
  const { returnTo } = await searchParams;
  const profileHref = recordHref(`/${tenantSlug}/customers/${id}`, safeReturnHref(returnTo ?? null, `/${tenantSlug}/customers`));
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();

  const data = await getCustomerDetail(t.id, id);
  if (!data) notFound();
  const { customer: c, rentals, leases } = data;

  // Thread + composer eligibility both read here (server), same pattern as
  // the lead detail page — see crm/leads/[leadId]/page.tsx.
  const [thread, replyContext] = await Promise.all([
    getCustomerThread(t.id, id),
    getCustomerReplyContext(t.id, id),
  ]);

  return (
    <main className="p-6">
      <BackLink href={`/${tenantSlug}/customers`}>Back to customers</BackLink>

      <Card className="mt-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{c.name}</h1>
          <CustomerActions tenantId={t.id} customer={{
            id: c.id, name: c.name, phone: c.phone, email: c.email, division: c.division, source: c.source, notes: c.notes,
            dateOfBirth: c.dateOfBirth, nationality: c.nationality, emiratesId: c.emiratesId, emiratesIdExpiry: c.emiratesIdExpiry,
            passportNumber: c.passportNumber, driverLicenseNumber: c.driverLicenseNumber, driverLicenseExpiry: c.driverLicenseExpiry,
          }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <Field label="Phone" value={c.phone ? <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">{c.phone}</a> : "—"} />
          <Field label="Email" value={c.email ? <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a> : "—"} />
          <Field label="Division" value={c.division} />
          <Field label="Source" value={c.source ?? "—"} />
          <Field label="Notes" value={c.notes ?? "—"} />
          <Field label="Emirates ID" value={c.emiratesId ?? "—"} />
          <Field label="Passport" value={c.passportNumber ?? "—"} />
          <Field label="Driving licence" value={c.driverLicenseNumber ?? "—"} />
          <Field label="Licence expiry" value={c.driverLicenseExpiry ?? "—"} />
          <Field label="Nationality" value={c.nationality ?? "—"} />
          <Field label="Documents reviewed" value={c.documentsReviewedAt ? new Date(c.documentsReviewedAt).toLocaleString() : "Pending review"} />
        </div>
      </Card>

      <div className="mt-6">
        <DocumentPanel tenantId={t.id} entityType="customer" entityId={id} entityLabel={c.name} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <Card className="overflow-hidden">
            <CardHeader title="Rental contracts" count={rentals.length} />
            {rentals.length === 0 ? (
              <p className="p-4 text-sm text-ink-3">No rental contracts.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <TH>Vehicle</TH>
                    <TH>Dates</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Balance</TH>
                  </tr>
                </thead>
                <tbody>
                  {rentals.map((r) => (
                    <tr key={r.rental.id} className="transition-colors hover:bg-sunken/50">
                      <TD className="font-medium text-ink">
                        <Link
                          href={recordHref(`/${tenantSlug}/rentals/${r.rental.id}`, profileHref)}
                          className="hover:text-brand-700 hover:underline"
                        >
                          {r.vehicleMake} {r.vehicleModel} · {r.vehiclePlate}
                        </Link>
                      </TD>
                      <TD className="whitespace-nowrap tnum">
                        {new Date(r.rental.startDate).toLocaleDateString()}
                        <span className="text-ink-3"> → </span>
                        {new Date(r.rental.returnDate).toLocaleDateString()}
                      </TD>
                      <TD>
                        <Badge tone={STATUS_TONE[r.rental.status] ?? "neutral"}>{r.rental.status}</Badge>
                      </TD>
                      <TD
                        className={`whitespace-nowrap text-right font-medium tnum ${r.rental.balanceDue > 0 ? "text-danger" : "text-success"}`}
                      >
                        {money(r.rental.balanceDue)}
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card className="mt-6 overflow-hidden">
            <CardHeader title="Lease contracts" count={leases.length} />
            {leases.length === 0 ? (
              <p className="p-4 text-sm text-ink-3">No lease contracts.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <TH>Vehicle</TH>
                    <TH>Ref</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Balance</TH>
                  </tr>
                </thead>
                <tbody>
                  {leases.map((l) => (
                    <tr key={l.lease.id} className="transition-colors hover:bg-sunken/50">
                      <TD className="font-medium text-ink">
                        <Link
                          href={recordHref(`/${tenantSlug}/leases/${l.lease.id}`, profileHref)}
                          className="hover:text-brand-700 hover:underline"
                        >
                          {l.vehicleMake} {l.vehicleModel} · {l.vehiclePlate}
                        </Link>
                      </TD>
                      <TD>{l.lease.contractRef}</TD>
                      <TD>
                        <Badge tone={STATUS_TONE[l.lease.status] ?? "neutral"}>{l.lease.status}</Badge>
                      </TD>
                      <TD
                        className={`whitespace-nowrap text-right font-medium tnum ${l.lease.balanceDue > 0 ? "text-danger" : "text-success"}`}
                      >
                        {money(l.lease.balanceDue)}
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <ChatThread
          entityType="customer"
          tenantSlug={tenantSlug}
          tenantId={t.id}
          entityId={id}
          initialThread={thread}
          initialReplyContext={replyContext}
        />
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink">{value}</div>
    </div>
  );
}

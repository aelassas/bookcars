import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getOperationsBoard } from "@/modules/rental/operations-queries";
import { Badge, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const EXTENSION: Record<string, string> = { not_sent: "Reminder not sent", awaiting_response: "Awaiting reply", wants_extension: "Wants extension", returning: "Will return", extension_confirmed: "Extended" };

export default async function OperationsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  if (!tenant.modules.includes("rentals")) redirect(`/${tenantSlug}`);
  const rows = await getOperationsBoard(tenant.id);
  const awaiting = rows.filter((row) => row.rental?.status === "active" && row.rental.returnReminderSentAt && !row.rental.customerResponseAt).length;

  return <main className="p-6"><PageHeader title="Rental operations" subtitle={`${rows.filter((row) => row.rental?.status === "active").length} active · ${awaiting} returns awaiting a customer reply`} icon={<Activity className="h-4.5 w-4.5" />} />
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card"><table className="w-full min-w-[1450px] text-sm"><thead><tr className="border-b border-line text-left text-xs text-ink-3"><th className="p-3">Vehicle</th><th className="p-3">Customer / rental</th><th className="p-3">Return / reply</th><th className="p-3">Mileage / allowance</th><th className="p-3">Charges</th><th className="p-3">Debt</th><th className="p-3">Engine</th><th className="p-3">Service</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.vehicle.id} className="border-b border-line-soft align-top last:border-0">
        <td className="p-3"><Link href={`/${tenantSlug}/fleet/${row.vehicle.id}`} className="font-medium text-ink hover:underline">{row.vehicle.plate}</Link><div className="text-xs text-ink-3">{row.vehicle.make} {row.vehicle.model}</div><div className="mt-1 text-xs text-ink-3">{row.vehicle.status.replaceAll("_", " ")}</div></td>
        <td className="p-3">{row.rental ? <><Link href={`/${tenantSlug}/rentals/${row.rental.id}`} className="font-medium text-brand-700 hover:underline">{row.customerName}</Link><div className="text-xs text-ink-3">{new Date(row.rental.startDate).toLocaleDateString()} · {row.rental.status}</div></> : <span className="text-ink-3">No current rental</span>}</td>
        <td className="p-3">{row.rental ? <><div className="tnum">{new Date(row.rental.returnDate).toLocaleString()}</div><Badge tone={row.rental.extensionStatus === "wants_extension" ? "warning" : "neutral"}>{EXTENSION[row.rental.extensionStatus] ?? row.rental.extensionStatus}</Badge></> : "—"}</td>
        <td className="p-3 tnum">{row.mileage ? <><div>{row.mileage.drivenKm} / {row.mileage.allowedKm} km</div><div className={row.mileage.excessKm > 0 ? "text-danger" : "text-success"}>{row.mileage.excessKm > 0 ? `${row.mileage.excessKm} km over` : `${row.mileage.remainingKm} km left`}</div></> : <span className="text-ink-3">{row.rental ? "Start odometer needed" : "—"}</span>}</td>
        <td className="p-3 text-xs"><div>Fines: {row.charges.fines}</div><div>Salik: {row.charges.salik}</div><div>Parking: {row.charges.parking}</div><div className="mt-1 font-medium text-ink">{row.charges.outstanding} AED unpaid</div></td>
        <td className={"p-3 font-semibold tnum " + (row.totalDebt > 0 ? "text-danger" : "text-success")}>{row.totalDebt} AED</td>
        <td className="p-3"><Badge tone={row.vehicle.gpsBlocked ? "danger" : "success"}>{row.vehicle.gpsBlocked ? "Blocked" : "Not blocked"}</Badge></td>
        <td className="p-3"><Badge tone={row.service.status === "due" ? "danger" : row.service.status === "due_soon" ? "warning" : "neutral"}>{row.service.status.replaceAll("_", " ")}</Badge><div className="mt-1 text-xs text-ink-3 tnum">{row.service.remainingKm == null ? "No baseline" : `${row.service.remainingKm} km left`}</div></td>
      </tr>)}
    </tbody></table></div>
  </main>;
}

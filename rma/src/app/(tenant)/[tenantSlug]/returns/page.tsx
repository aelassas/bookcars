import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import ReturnsToday from "@/components/returns/ReturnsToday";
import {
  getRentalsReturningToday,
  getRentalsOverdue,
  getRentalsReturningSoon,
} from "@/modules/returns/queries";

export default async function ReturnsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("returns")) redirect(`/${tenantSlug}`);

  const [returns, overdue, upcoming] = await Promise.all([
    getRentalsReturningToday(t.id),
    getRentalsOverdue(t.id),
    getRentalsReturningSoon(t.id),
  ]);

  return (
    <main className="p-6">
      <ReturnsToday
        returns={returns}
        overdue={overdue}
        upcoming={upcoming}
        tenantId={t.id}
        tenantSlug={tenantSlug}
        actorId={session.user.id}
      />
    </main>
  );
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import RentalsList from "@/components/rental/RentalsList";
import { getRentals } from "@/modules/rental/queries";

export default async function RentalsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("rentals")) redirect(`/${tenantSlug}`);

  const rentals = await getRentals(t.id);

  return (
    <main className="p-6">
      <RentalsList rentals={rentals} tenantSlug={tenantSlug} tenantId={t.id} actorId={session.user.id} />
    </main>
  );
}

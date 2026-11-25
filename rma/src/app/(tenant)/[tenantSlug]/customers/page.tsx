import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import CustomersList from "@/components/crm/CustomersList";
import { getCustomersPaginated } from "@/modules/crm/customer-queries";

const PAGE_SIZE = 50;

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const { page: pageParam, search } = await searchParams;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("customers")) redirect(`/${tenantSlug}`);

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const { rows, total, page: actualPage } = await getCustomersPaginated(t.id, {
    page,
    pageSize: PAGE_SIZE,
    search: search?.trim() || undefined,
  });

  return (
    <main className="p-6">
      <CustomersList
        customers={rows}
        total={total}
        page={actualPage}
        pageSize={PAGE_SIZE}
        tenantId={t.id}
        tenantSlug={tenantSlug}
      />
    </main>
  );
}

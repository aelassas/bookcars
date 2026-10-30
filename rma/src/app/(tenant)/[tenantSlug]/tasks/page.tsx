import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getTasks } from "@/modules/tasks/queries";
import { getCompanies } from "@/modules/company/queries";
import TasksView from "@/components/tasks/TasksView";

const MANAGE_ROLES = ["tenant_admin", "platform_admin", "hr", "technical", "sales"];

export default async function TasksPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("tasks")) redirect(`/${tenantSlug}`);

  const tasks = await getTasks(t.id);
  const companies = await getCompanies(t.id);
  const canManage = (t.roles ?? []).some((r) => MANAGE_ROLES.includes(r));

  return (
    <main className="p-6">
      <TasksView tasks={tasks} tenantSlug={tenantSlug} tenantId={t.id} companies={companies} canManage={canManage} />
    </main>
  );
}

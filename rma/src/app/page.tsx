import { redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getActiveTenant } from "@/platform/auth/tenant";
import { isPlatformAdmin } from "@/platform/auth/authorization";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // Membership wins: a platform admin who also belongs to a tenant (the
  // client owner, e.g. ruslan@rma.network) lands in HIS CRM, not the console.
  const t = await getActiveTenant();
  if (t) {
    // Land on the tenant overview, which routes each role to THEIR cockpit
    // (/my for reps, /monitor for line heads). Going straight to /crm dumped
    // everyone on the generic kanban instead of their own flow.
    redirect(`/${t.slug}`);
  }
  // Pure platform admins have no tenant of their own — the console.
  if (await isPlatformAdmin(session.user.id)) redirect("/admin");
  redirect("/onboarding");
}

import { redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getActiveTenant } from "@/platform/auth/tenant";
import { isPlatformAdmin } from "@/platform/auth/authorization";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // Platform admins have no tenant of their own — send them to the console.
  if (await isPlatformAdmin(session.user.id)) redirect("/admin");
  const t = await getActiveTenant();
  if (!t) redirect("/onboarding");
  // Land on the tenant overview, which routes each role to THEIR cockpit
  // (/my for reps, /monitor for line heads). Going straight to /crm dumped
  // everyone on the generic kanban instead of their own flow.
  redirect(`/${t.slug}`);
}

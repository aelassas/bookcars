import { auth } from "@/platform/auth";
import { db } from "@/platform/db/client";
import { tenant, lead } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function HelloTenantPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  // Week 1 stub: auto-create tenant if none exists
  const [existingTenant] = await db.select().from(tenant).where(eq(tenant.slug, "take-auto")).limit(1);

  let currentTenant = existingTenant;
  if (!currentTenant) {
    const [created] = await db
      .insert(tenant)
      .values({ slug: "take-auto", name: "TAKE Auto" })
      .returning();
    currentTenant = created;
  }

  // RLS-protected query via Drizzle transaction (single connection)
  const leadCount = await withDrizzleTenant(currentTenant.id, async (tx) => {
    const [result] = await tx.select({ count: count() }).from(lead);
    return result.count;
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas p-8">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 shadow-card">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Hello Tenant ✅</h1>
        <p className="mb-4 text-sm text-ink-2">
          Logged in as: <span className="font-medium text-ink">{session.user.email}</span>
        </p>
        <div className="mb-4 rounded-field border border-success-line bg-success-soft p-4">
          <p className="text-sm font-medium text-success">Tenant: {currentTenant.name}</p>
          <p className="text-xs text-success/80">ID: {currentTenant.id}</p>
        </div>
        <div className="rounded-field border border-line p-4">
          <p className="text-sm text-ink-2">
            Leads in your tenant (RLS-scoped):{" "}
            <span className="text-lg font-bold text-ink tnum">{leadCount}</span>
          </p>
          <p className="mt-1 text-xs text-ink-3">
            This returns 0 because RLS filters rows by tenant_id automatically.
          </p>
        </div>
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/platform/auth";
import { isPlatformAdmin } from "@/platform/auth/authorization";
import { db } from "@/platform/db/client";
import { deviceLogin, user, tenantMember, tenant } from "@/platform/db/schema";
import { confirmDevice } from "./actions";
import RevokeAccessButton from "./RevokeAccessButton";

export const dynamic = "force-dynamic";

export default async function AccessReviewPage() {
  const s = await auth();
  if (!s?.user?.id || !(await isPlatformAdmin(s.user.id))) redirect("/");

  const devices = await db
    .select({
      id: deviceLogin.id,
      email: deviceLogin.email,
      ip: deviceLogin.ip,
      mac: deviceLogin.mac,
      lastSeen: deviceLogin.lastSeen,
      confirmed: deviceLogin.confirmed,
      userId: deviceLogin.userId,
      name: user.name,
    })
    .from(deviceLogin)
    .leftJoin(user, eq(deviceLogin.userId, user.id))
    .orderBy(desc(deviceLogin.lastSeen))
    .limit(500);

  const members = await db
    .select({
      userId: tenantMember.userId,
      tenantId: tenantMember.tenantId,
      slug: tenant.slug,
      roles: tenantMember.roles,
    })
    .from(tenantMember)
    .innerJoin(tenant, eq(tenantMember.tenantId, tenant.id));

  // Keep the tenant id alongside the label: revoking is per-tenant now, so
  // each membership needs its own button rather than one platform-wide wipe.
  type Membership = { tenantId: string; slug: string; roles: string[] };
  const memMap = new Map<string, Membership[]>();
  for (const m of members) {
    const cur = memMap.get(m.userId) ?? [];
    cur.push({ tenantId: m.tenantId, slug: m.slug, roles: m.roles ?? [] });
    memMap.set(m.userId, cur);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Access review</h1>
      <p className="mt-1 text-sm text-ink-2">
        Everyone who registered from the office network, and the device (MAC) they came from.
        Confirm the ones you recognise; remove the ones you don&apos;t need.
      </p>

      <div className="mt-6 overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-canvas text-left text-xs uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-4 py-3">Person</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Device (MAC)</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">Last seen</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-3">
                  No registrations yet.
                </td>
              </tr>
            )}
            {devices.map((d) => (
              <tr key={d.id} className="border-b border-line/60">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{d.name || "—"}</div>
                  <div className="text-xs text-ink-3">{d.email}</div>
                </td>
                <td className="px-4 py-3 text-xs text-ink-2">
                  {(memMap.get(d.userId ?? "") ?? []).length === 0
                    ? "revoked"
                    : (memMap.get(d.userId ?? "") ?? [])
                        .map((m) => `${m.slug}:${m.roles.join("/") || "—"}`)
                        .join(", ")}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-2">{d.mac || "unknown"}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-2">{d.ip}</td>
                <td className="px-4 py-3 text-xs text-ink-3">
                  {d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  {d.confirmed ? (
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">confirmed</span>
                  ) : (
                    <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">pending</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {!d.confirmed && (
                      <form action={confirmDevice}>
                        <input type="hidden" name="id" value={d.id} />
                        <input
                          type="hidden"
                          name="tenantId"
                          value={(memMap.get(d.userId ?? "") ?? [])[0]?.tenantId ?? ""}
                        />
                        <button className="rounded-field border border-line px-2 py-1 text-xs font-semibold text-success hover:bg-success-soft">
                          Confirm
                        </button>
                      </form>
                    )}
                    {(memMap.get(d.userId ?? "") ?? []).map((m) => (
                      <RevokeAccessButton
                        key={m.tenantId}
                        userId={d.userId ?? ""}
                        tenantId={m.tenantId}
                        tenantSlug={m.slug}
                        email={d.email ?? "this person"}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

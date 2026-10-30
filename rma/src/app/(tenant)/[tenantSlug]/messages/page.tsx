import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import MessageInbox from "@/components/messaging/MessageInbox";
import { getMessageThreads } from "@/modules/messaging/queries";

const PAGE_SIZE = 50;

export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const { page: pageParam } = await searchParams;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("messages")) redirect(`/${tenantSlug}`);

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const { threads, total } = await getMessageThreads(t.id, { page, pageSize: PAGE_SIZE });
  // Surface whether outbound sends are actually wired up (real WhatsApp
  // credentials) or just the mock provider — see modules/messaging/send-message.ts.

  return (
    <main className="p-6">
      <MessageInbox
        threads={threads}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        tenantSlug={tenantSlug}
        tenantId={t.id}
      />
    </main>
  );
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import ConversationThread from "@/components/messaging/ConversationThread";
import { getThreadByJid } from "@/modules/messaging/queries";
import { getRentalForContactName } from "@/modules/rental/rental-context";
import { Car } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; jid: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug, jid: rawJid } = await params;
  const jid = decodeURIComponent(rawJid);
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("messages")) redirect(`/${tenantSlug}`);

  const thread = await getThreadByJid(t.id, jid);
  if (!thread) notFound();

  // Puzzle piece: tie this conversation to the car the person is renting, from
  // Babek's sheet (matched by name — the sheet has no phone). Best-effort: a
  // null just hides the banner. See modules/rental/rental-context.ts.
  // Only for 1:1 chats — a group/broadcast "name" isn't a single renter.
  const isPerson = !jid.endsWith("@g.us") && jid !== "status@broadcast";
  const rentalCtx = isPerson ? await getRentalForContactName(thread.customerName).catch(() => null) : null;

  return (
    <main className="p-6">
      {rentalCtx && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-line bg-surface px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
            <Car className="h-4 w-4 text-brand-600" />
            {rentalCtx.car}
            {rentalCtx.plate && <span className="font-mono text-ink-2">({rentalCtx.plate})</span>}
          </span>
          {rentalCtx.brand && <span className="text-ink-3">{rentalCtx.brand}</span>}
          <span className={rentalCtx.active ? "text-emerald-600" : "text-ink-3"}>
            {rentalCtx.active ? "on rent" : "past rental"}
          </span>
          <span className="text-ink-2">Return: {fmtDate(rentalCtx.returnDate)}</span>
          {rentalCtx.responsible && (
            <span className="text-ink-2">Assignee: <span className="font-medium text-ink">{rentalCtx.responsible}</span></span>
          )}
          <span className="ml-auto text-[11px] text-ink-3">name match</span>
        </div>
      )}
      <ConversationThread thread={thread} tenantSlug={tenantSlug} />
    </main>
  );
}

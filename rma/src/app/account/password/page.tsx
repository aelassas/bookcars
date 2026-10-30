import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { db } from "@/platform/db/client";
import { user } from "@/platform/db/schema";
import { auth } from "@/platform/auth";
import { PageHeader, Card } from "@/components/ui";
import { PLATFORM_NAME } from "@/platform/brand";
import { getServerLang } from "@/platform/i18n/lang";
import { t } from "@/platform/i18n/dict";
import { ru } from "@/lib/i18n/ru";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";

// Auth Wave 1 (P0-2/P0-3) — outside [tenantSlug] on purpose: the tenant
// layout redirects here while mustChangePassword is set, so this page must
// never itself be gated behind that same tenant layout (no redirect loop).
export default async function AccountPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { next } = await searchParams;
  const lang = await getServerLang();
  // Back link + post-submit target: same rule — the `next` param when it is a
  // local path (leading "/", but not the protocol-relative "//host" form).
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const [u] = await db
    .select({ email: user.email, password: user.password, mustChangePassword: user.mustChangePassword })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!u) redirect("/login");

  const hasPassword = !!u.password;

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-canvas to-brand-50">
      {/* Minimal chrome — this page sits outside the tenant layout on purpose
          (mustChangePassword redirect loop), so it carries its own wordmark
          and a way back. */}
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-sm font-semibold tracking-wide text-ink">{PLATFORM_NAME}</span>
        <Link href={safeNext} className="text-sm text-ink-3 transition-colors hover:text-ink">
          {t(lang, "account.back")}
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <PageHeader
            title={hasPassword ? ru.password.changeTitle : ru.password.setTitle}
            subtitle={hasPassword ? ru.password.changeSubtitle : ru.password.setSubtitle}
            icon={<KeyRound className="h-4.5 w-4.5" />}
          />
          {u.mustChangePassword && (
            <div className="mb-4 rounded-field border border-warn-line bg-warn-soft px-3 py-2 text-sm text-warn">
              {ru.password.mustChangeNotice}
            </div>
          )}
          <Card className="p-6">
            <PasswordForm
              email={u.email}
              hasPassword={hasPassword}
              next={safeNext}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}

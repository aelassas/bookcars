import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { tenantWordmark } from "@/lib/branding";
import LoginForm from "@/components/auth/LoginForm";

// Branded per-tenant login door. Lives under /login (NOT under [tenantSlug])
// on purpose: the tenant layout's auth guard redirects anonymous visitors to
// /login/<slug>, so a login page nested inside that layout would bounce. This
// route is public and un-guarded, same as bare /login.
//
// The Telegram button here deep-links the bot's onboarding interview for THIS
// workspace (`?start=<slug>`) so the bot knows which door the person used —
// recognised staff get signed in, strangers are queued for approval.

export default async function BrandedLoginPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const [t] = await db
    .select({ name: tenant.name, brandName: tenant.brandName })
    .from(tenant)
    .where(eq(tenant.slug, tenantSlug))
    .limit(1);
  if (!t) notFound();

  const wordmark = tenantWordmark(tenantSlug, t.name, t.brandName);
  const botUsername = process.env.TELEGRAM_OTP_BOT_USERNAME ?? "zamtek_otp_bot";
  const deepLink = `https://t.me/${botUsername}?start=${encodeURIComponent(tenantSlug)}`;

  return (
    <LoginForm
      wordmark={wordmark}
      titleName={`${wordmark.accent}${wordmark.rest}`}
      telegram={{ mode: "onboard", deepLink }}
    />
  );
}

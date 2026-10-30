import Link from "next/link";
import NamePinLogin from "@/components/auth/NamePinLogin";
import { loginRoster } from "@/modules/auth/roster";
import { getServerLang } from "@/platform/i18n/lang";
import { t } from "@/platform/i18n/dict";

// Bare /login is the SIMPLE staff door: tap your name, punch your PIN. Works
// remotely over Tailscale. Email / Telegram / magic-link sign-in (owner,
// admins) lives at /login/admin. Per-tenant branded doors are /login/<slug>.
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM_NAME || "MyCRM";

// Reads the staff roster from the DB per request — never prerender it.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const [roster, lang] = await Promise.all([loginRoster(), getServerLang()]);
  return (
    <>
      <NamePinLogin roster={roster} platform={PLATFORM} lang={lang} />
      <Link
        href="/login/admin"
        style={{ position: "fixed", left: 0, right: 0, bottom: 20, textAlign: "center", color: "#94a3b8", fontSize: 14, textDecoration: "none" }}
      >
        {t(lang, "login.adminLink")}
      </Link>
    </>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Send, MessageCircle, Phone } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { ru } from "@/lib/i18n/ru";
import {
  startTelegramLogin,
  pollTelegramLogin,
  requestOtpByPhone,
} from "@/modules/auth-otp/actions";

// Auth Wave 1 (P0-3) — email is DEAD in this deployment (RESEND_API_KEY=""),
// so magic-link cannot be the reliable recovery path. The admin's WhatsApp
// number is the primary recovery affordance instead. wa.me requires digits
// only; the raw env value is still shown as plain text alongside the button.
const SUPPORT_WHATSAPP_RAW = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "";
const SUPPORT_WHATSAPP_DIGITS = SUPPORT_WHATSAPP_RAW.replace(/[^\d]/g, "");

// Telegram poll cadence + hard timeout (shared by the one-tap button and the
// phone-number confirm push — both end in the same poll → signIn handshake).
const TG_POLL_INTERVAL_MS = 2000;
const TG_POLL_TIMEOUT_MS = 5 * 60 * 1000;

// ?email= (set by invite links) — the query string never changes while the
// form is mounted, so this is a one-shot external read. Server snapshot is ""
// (matches the pre-hydration HTML); the client value is applied after
// hydration, exactly like the old useEffect prefill did.
const subscribeNever = () => () => {};
const readInviteEmail = () => new URLSearchParams(window.location.search).get("email") ?? "";
const serverInviteEmail = () => "";

type TgStatus = "idle" | "starting" | "waiting" | "expired" | "error";
type PhoneStatus = "idle" | "requesting" | "waiting" | "notfound" | "expired" | "error";

/** Two-tone wordmark: accented prefix + neutral suffix (e.g. "My"+"CRM"). */
export type Wordmark = { accent: string; rest: string };

/**
 * Telegram button behaviour:
 *  - "premium": neutral door — the one-tap poll login (startTelegramLogin).
 *  - "onboard": branded door — a plain deep link into the bot's per-tenant
 *    onboarding interview (`?start=<slug>`); the page does not poll for it.
 */
export type TelegramConfig = { mode: "premium" } | { mode: "onboard"; deepLink: string };

export default function LoginForm({
  wordmark,
  titleName,
  telegram,
}: {
  wordmark: Wordmark;
  /** Full wordmark text for the card title, e.g. "TakeAutoCRM" / "MyCRM". */
  titleName: string;
  telegram: TelegramConfig;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [magicSubmitting, setMagicSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);

  // Telegram one-tap (premium) status.
  const [tgStatus, setTgStatus] = useState<TgStatus>("idle");
  const [tgDeepLink, setTgDeepLink] = useState("");
  const [tgError, setTgError] = useState("");

  // Phone-number login status.
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>("idle");
  const [phoneError, setPhoneError] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  // Belt-and-braces cleanup if the component unmounts mid-poll.
  useEffect(() => clearTimers, []);

  // Prefill email from ?email= (set by invite links) — applied once, as a
  // render-time adjustment, so the user's later edits are never overwritten.
  const inviteEmail = useSyncExternalStore(subscribeNever, readInviteEmail, serverInviteEmail);
  const [prefillApplied, setPrefillApplied] = useState(false);
  if (!prefillApplied && inviteEmail) {
    setPrefillApplied(true);
    setEmail(inviteEmail);
  }

  function redirectAfterSignIn(resultUrl: string | null | undefined) {
    // Stay on whatever host the user used (office LAN IP / tailscale /
    // localhost). result.url is absolute and can carry the wrong host.
    let dest = "/";
    try {
      const u = new URL(resultUrl || "/", window.location.origin);
      dest = u.pathname + u.search + u.hash;
    } catch {}
    window.location.href = dest;
  }

  // Generic token → session handshake shared by both Telegram flows.
  async function finishSignIn(token: string, onError: () => void) {
    const result = await signIn("telegram-session", { token, callbackUrl: "/", redirect: false });
    if (result?.error) {
      onError();
      return;
    }
    if (result?.ok) {
      try {
        await fetch("/api/device/ping", { method: "POST" });
      } catch {}
      redirectAfterSignIn(result.url);
    }
  }

  // Poll a login_request token until the bot authenticates it, then sign in.
  // onExpired handles both the "expired/consumed" poll result and the hard
  // timeout; onError handles a failed signIn.
  function startPolling(token: string, onExpired: () => void, onError: () => void) {
    clearTimers();
    pollRef.current = setInterval(async () => {
      try {
        const res = await pollTelegramLogin(token);
        if (res.status === "authenticated") {
          clearTimers();
          void finishSignIn(token, onError);
        } else if (res.status === "expired" || res.status === "consumed") {
          clearTimers();
          onExpired();
        }
        // "pending" — keep polling.
      } catch {
        // Transient network hiccup — next tick may succeed.
      }
    }, TG_POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      clearTimers();
      onExpired();
    }, TG_POLL_TIMEOUT_MS);
  }

  // ── Telegram one-tap (premium door) ──────────────────────────────────────
  async function handleTelegramLogin() {
    setTgStatus("starting");
    setTgError("");
    clearTimers();
    try {
      const result = await startTelegramLogin();
      if (!result.ok) {
        setTgError(ru.tgLogin.rateLimited);
        setTgStatus("error");
        return;
      }
      setTgDeepLink(result.deepLink);
      // Best-effort popup — many webviews block window.open() after an await,
      // so the manual fallback link below always renders too.
      window.open(result.deepLink, "_blank", "noopener,noreferrer");
      setTgStatus("waiting");
      startPolling(
        result.token,
        () => setTgStatus((s) => (s === "waiting" ? "expired" : s)),
        () => {
          setTgError(ru.tgLogin.genericError);
          setTgStatus("error");
        },
      );
    } catch {
      setTgError(ru.tgLogin.genericError);
      setTgStatus("error");
    }
  }

  // ── Phone-number login ───────────────────────────────────────────────────
  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setPhoneStatus("requesting");
    setPhoneError("");
    clearTimers();
    try {
      const res = await requestOtpByPhone(phone.trim());
      if (!res.ok) {
        setPhoneStatus(res.error === "rate_limited" ? "error" : "notfound");
        if (res.error === "rate_limited") setPhoneError(ru.phoneLogin.rateLimited);
        return;
      }
      setPhoneStatus("waiting");
      startPolling(
        res.token,
        () => setPhoneStatus((s) => (s === "waiting" ? "expired" : s)),
        () => {
          setPhoneError(ru.phoneLogin.genericError);
          setPhoneStatus("error");
        },
      );
    } catch {
      setPhoneError(ru.phoneLogin.genericError);
      setPhoneStatus("error");
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setError(ru.login.enterEmailFirst);
      return;
    }
    setMagicSubmitting(true);
    setError("");
    await signIn("email", { email: email.trim(), callbackUrl: "/" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
      redirect: false,
    });

    setSubmitting(false);
    if (result?.error) {
      setError(ru.login.invalidCredentials);
    } else if (result?.ok) {
      try {
        await fetch("/api/device/ping", { method: "POST" });
      } catch {}
      redirectAfterSignIn(result.url);
    }
  }

  const waPrefill = ru.forgotPassword.whatsappPrefillText(email.trim());
  const waHref = SUPPORT_WHATSAPP_DIGITS
    ? `https://wa.me/${SUPPORT_WHATSAPP_DIGITS}?text=${encodeURIComponent(waPrefill)}`
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-canvas to-brand-50 px-4">
      <div className="w-full max-w-sm">
        {/* Wordmark — plain text, no badge. */}
        <div className="mb-6 flex flex-col items-center">
          <div className="text-3xl font-bold tracking-tight">
            {wordmark.accent && <span className="text-brand-600">{wordmark.accent}</span>}
            <span className="text-ink">{wordmark.rest}</span>
          </div>
          <p className="mt-2 text-center text-xs tracking-wide text-ink-3">Smart rental control</p>
        </div>

        {/* Card */}
        <div className="rounded-card border border-line bg-surface p-8 shadow-lifted">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{ru.login.title(titleName)}</h1>
          <p className="mt-1 text-sm text-ink-2">{ru.tgLogin.subtitle}</p>

          {/* Email + password — primary door */}
          <form onSubmit={handleSubmit} className="mt-5">
            {error && (
              <div role="alert" className="mb-4 rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <Label htmlFor="login-email">{ru.login.emailLabel}</Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              placeholder={ru.login.emailPlaceholder}
            />

            <Label className="mt-4" htmlFor="login-password">
              {ru.login.passwordLabel}
            </Label>
            <PasswordInput
              id="login-password"
              name="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={ru.login.passwordPlaceholder}
            />

            <div className="-mt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setForgotOpen((v) => !v)}
                aria-expanded={forgotOpen}
                aria-controls="forgot-password-panel"
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                {forgotOpen ? ru.login.forgotPasswordClose : ru.login.forgotPassword}
              </button>
            </div>

            {forgotOpen && (
              <div id="forgot-password-panel" className="mt-2 rounded-field border border-line bg-sunken/60 p-3">
                <p className="text-sm font-medium text-ink">{ru.forgotPassword.title}</p>
                <p className="mt-1 text-xs text-ink-2">{ru.forgotPassword.primaryHint}</p>

                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-field bg-[#25D366] px-3.5 text-sm font-medium text-white shadow-card transition-colors hover:brightness-95"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {ru.forgotPassword.whatsappButton}
                  </a>
                ) : null}
                {SUPPORT_WHATSAPP_RAW && (
                  <p className="mt-2 text-center text-[11px] text-ink-3">
                    {ru.forgotPassword.whatsappNumberLabel} {SUPPORT_WHATSAPP_RAW}
                  </p>
                )}

                <div className="my-3 flex items-center gap-3 text-[10px] uppercase tracking-wide text-ink-3">
                  <span className="h-px flex-1 bg-line" />
                  {ru.login.or}
                  <span className="h-px flex-1 bg-line" />
                </div>

                <p className="text-xs text-ink-3">{ru.forgotPassword.secondaryHint}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleMagicLink}
                  disabled={magicSubmitting || !email.trim()}
                  className="mt-2 w-full"
                >
                  {magicSubmitting ? ru.forgotPassword.sendingLink : ru.forgotPassword.magicLinkButton}
                </Button>
              </div>
            )}

            <Button type="submit" disabled={submitting || !email.trim() || !password} className="mt-5 w-full">
              {submitting ? ru.login.signingIn : ru.login.signIn}
            </Button>
            <p className="mt-2 text-center text-[11px] text-ink-3">{ru.login.magicLinkHint}</p>
          </form>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-wide text-ink-3">
            <span className="h-px flex-1 bg-line" />
            {ru.login.or}
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* Telegram — one-tap alternative */}
          <div className="mt-5">
            {telegram.mode === "onboard" ? (
              <>
                <a
                  href={telegram.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-field bg-[#26A5E4] px-3.5 text-sm font-semibold text-white shadow-card transition-colors hover:brightness-95"
                >
                  <Send className="h-4.5 w-4.5" />
                  {ru.tgLogin.onboardButton}
                </a>
                <p className="mt-2 text-center text-[11px] text-ink-3">{ru.tgLogin.onboardHint}</p>
              </>
            ) : (
              (tgStatus === "idle" || tgStatus === "starting") && (
                <button
                  type="button"
                  onClick={handleTelegramLogin}
                  disabled={tgStatus === "starting"}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-field bg-[#26A5E4] px-3.5 text-sm font-semibold text-white shadow-card transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Send className="h-4.5 w-4.5" />
                  {tgStatus === "starting" ? ru.tgLogin.starting : ru.tgLogin.primaryButton}
                </button>
              )
            )}

            {telegram.mode === "premium" && tgStatus === "waiting" && (
              <div className="rounded-field border border-line bg-sunken/60 p-4 text-center">
                <p className="text-sm font-medium text-ink">{ru.tgLogin.waitingTitle}</p>
                <p className="mt-1 text-xs text-ink-2">{ru.tgLogin.waitingHint}</p>
                <a
                  href={tgDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-field bg-[#26A5E4] px-3.5 text-sm font-medium text-white shadow-card transition-colors hover:brightness-95"
                >
                  <Send className="h-4 w-4" />
                  {ru.tgLogin.openTelegramFallback}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    clearTimers();
                    setTgStatus("idle");
                  }}
                  className="mt-2 text-xs font-medium text-ink-3 hover:text-ink-2 hover:underline"
                >
                  {ru.tgLogin.cancelButton}
                </button>
              </div>
            )}

            {telegram.mode === "premium" && tgStatus === "expired" && (
              <div className="space-y-2">
                <div role="alert" className="rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
                  {ru.tgLogin.expired}
                </div>
                <Button type="button" onClick={handleTelegramLogin} className="w-full">
                  {ru.tgLogin.retryButton}
                </Button>
              </div>
            )}

            {telegram.mode === "premium" && tgStatus === "error" && (
              <div className="space-y-2">
                <div role="alert" className="rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
                  {tgError}
                </div>
                <Button type="button" onClick={handleTelegramLogin} className="w-full">
                  {ru.tgLogin.retryButton}
                </Button>
              </div>
            )}
          </div>

          {/* Phone-number login */}
          <div className="mt-3">
            {phoneStatus === "waiting" ? (
              <div className="rounded-field border border-line bg-sunken/60 p-4 text-center">
                <p className="text-sm font-medium text-ink">{ru.phoneLogin.waitingTitle}</p>
                <p className="mt-1 text-xs text-ink-2">{ru.phoneLogin.waitingHint}</p>
                <button
                  type="button"
                  onClick={() => {
                    clearTimers();
                    setPhoneStatus("idle");
                  }}
                  className="mt-3 text-xs font-medium text-ink-3 hover:text-ink-2 hover:underline"
                >
                  {ru.phoneLogin.cancelButton}
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPhoneOpen((v) => !v)}
                  aria-expanded={phoneOpen}
                  aria-controls="phone-login-panel"
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-field border border-line bg-surface px-3.5 text-sm font-medium text-ink-2 transition-colors hover:bg-sunken"
                >
                  <Phone className="h-4 w-4" />
                  {phoneOpen ? ru.phoneLogin.toggleClose : ru.phoneLogin.toggleOpen}
                </button>

                {phoneOpen && (
                  <form id="phone-login-panel" onSubmit={handlePhoneSubmit} className="mt-3">
                    {phoneStatus === "notfound" && (
                      <div role="alert" className="mb-2 rounded-field border border-warn-line bg-warn-soft px-3 py-2 text-sm text-warn">
                        {ru.phoneLogin.notFound}
                      </div>
                    )}
                    {(phoneStatus === "error" || phoneStatus === "expired") && (
                      <div role="alert" className="mb-2 rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
                        {phoneStatus === "expired" ? ru.phoneLogin.expired : phoneError}
                      </div>
                    )}
                    <Label htmlFor="login-phone">{ru.phoneLogin.phoneLabel}</Label>
                    <Input
                      id="login-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full"
                      placeholder={ru.phoneLogin.phonePlaceholder}
                    />
                    <Button
                      type="submit"
                      disabled={phoneStatus === "requesting" || !phone.trim()}
                      className="mt-3 w-full"
                    >
                      {phoneStatus === "requesting" ? ru.phoneLogin.requesting : ru.phoneLogin.requestButton}
                    </Button>
                  </form>
                )}
              </>
            )}
          </div>


        </div>

        <p className="mt-4 text-center text-[11px] text-ink-3">{ru.login.footer}</p>
      </div>
    </main>
  );
}

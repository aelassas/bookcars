"use client";

/**
 * Auth Wave 1 (P0-2) — dismissible nudge for password-less users (signed in
 * via magic link only, `user.password IS NULL`, and NOT already forced
 * through /account/password by mustChangePassword). Dismissal is
 * client-only (localStorage) — reappears in a new browser/profile, which is
 * fine for a P0 nudge, not a compliance gate.
 */
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { KeyRound, X } from "lucide-react";
import { ru } from "@/lib/i18n/ru";

const DISMISS_KEY = "take-auto:set-password-banner-dismissed";

// Dismissal is modelled as a tiny external store over localStorage: the server
// snapshot is "dismissed" (banner hidden — avoids a flash before hydration),
// the client snapshot reads storage, and dismiss() notifies subscribers.
// `sessionDismissed` keeps the X button working even when localStorage throws.
const listeners = new Set<() => void>();
let sessionDismissed = false;

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getDismissed(): boolean {
  if (sessionDismissed) return true;
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

const getServerDismissed = () => true;

function dismiss() {
  sessionDismissed = true;
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {}
  for (const l of listeners) l();
}

export default function SetPasswordBanner() {
  const dismissed = useSyncExternalStore(subscribe, getDismissed, getServerDismissed);

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-900">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 shrink-0 text-brand-700" />
        <span>
          <strong className="font-semibold">{ru.banner.setPasswordTitle}</strong>{" "}
          <span className="text-brand-800/80">{ru.banner.setPasswordBody}</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link href="/account/password" className="text-xs font-semibold text-brand-700 hover:underline">
          {ru.banner.setPasswordCta}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label={ru.banner.dismiss}
          className="rounded-field p-1 text-brand-700/70 hover:bg-brand-100 hover:text-brand-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

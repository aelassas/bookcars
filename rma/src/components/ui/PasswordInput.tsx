"use client";

/* ---------------------------------------------------------------------------
   PasswordInput — Auth Wave 1 (P0-4).

   A password <input> with a show/hide eye toggle and a Caps-Lock hint.
   Client component (needs state for visibility + Caps Lock detection).

   A11y:
   - Toggle is a real <button type="button"> (never submits the form),
     with aria-pressed + an aria-label that flips with visibility state.
   - Toggle keeps a ≥44×44px hit area regardless of the field's own height,
     and never steals focus from the input (onMouseDown preventDefault).
   - focus-visible ring on both the field and the toggle.
   - Caps-Lock hint is announced via aria-live="polite" and rendered as
     visible text (not screen-reader-only) — it's genuinely useful to see.
--------------------------------------------------------------------------- */
import { useId, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cx } from "./index";
import { ru } from "@/lib/i18n/ru";

const FIELD_BASE =
  "h-9 w-full rounded-field border border-line bg-surface pl-3 pr-11 text-sm text-ink placeholder:text-ink-3 " +
  "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 " +
  "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3";

export function PasswordInput({
  id,
  name,
  autoComplete,
  className,
  showCapsLockHint = true,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Set false to suppress the Caps-Lock hint (rarely needed). */
  showCapsLockHint?: boolean;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function trackCapsLock(e: KeyboardEvent<HTMLInputElement>) {
    if (typeof e.getModifierState === "function") {
      setCapsLock(e.getModifierState("CapsLock"));
    }
  }

  return (
    <div>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          onKeyDown={trackCapsLock}
          onKeyUp={trackCapsLock}
          className={cx(FIELD_BASE, className)}
          {...props}
        />
        <button
          type="button"
          aria-pressed={visible}
          aria-label={visible ? ru.password.hidePassword : ru.password.showPassword}
          onClick={() => setVisible((v) => !v)}
          // Keep focus on the input when the toggle is clicked with a
          // mouse/touch — otherwise the caret jumps away mid-typing.
          onMouseDown={(e) => e.preventDefault()}
          // Focus ring comes from the global button:focus-visible rule in
          // globals.css (P0-8) — no need to duplicate it here.
          className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-ink-3 transition-colors hover:text-ink-2"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showCapsLockHint && (
        <p aria-live="polite" className="mt-1 min-h-[1em] text-[11px] font-medium text-warn">
          {capsLock ? ru.password.capsLockOn : ""}
        </p>
      )}
    </div>
  );
}

export default PasswordInput;

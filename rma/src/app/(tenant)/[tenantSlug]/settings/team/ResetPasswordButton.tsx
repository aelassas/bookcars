"use client";

/**
 * Auth Wave 1 (P0-3) — per-row admin password reset. Shows the CSPRNG temp
 * password returned by resetMemberPassword() exactly once, with a copy
 * button; there is no way to see it again after this closes (the hash is
 * all that's stored server-side).
 */
import { useActionState, useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";
import { ru } from "@/lib/i18n/ru";
import { resetMemberPassword, type ResetPasswordState } from "./actions";

export default function ResetPasswordButton({ slug, memberId }: { slug: string; memberId: string }) {
  const action = resetMemberPassword.bind(null, slug);
  const [state, formAction, pending] = useActionState<ResetPasswordState | null, FormData>(
    action,
    null
  );
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  if (state?.tempPassword) {
    return (
      <div className="mt-2 rounded-field border border-warn-line bg-warn-soft p-2 text-xs">
        <p className="font-semibold text-ink">{ru.adminReset.tempPasswordTitle}</p>
        <p className="mt-0.5 text-ink-2">{ru.adminReset.tempPasswordBody}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-surface px-2 py-1 font-mono text-[11px] text-ink">
            {state.tempPassword}
          </code>
          <button
            type="button"
            onClick={() => copy(state.tempPassword!)}
            className="flex h-7 items-center gap-1 rounded-field border border-line bg-surface px-2 text-[11px] font-medium text-ink-2 hover:bg-sunken"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? ru.adminReset.copied : ru.adminReset.copy}
          </button>
        </div>
      </div>
    );
  }

  if (confirming) {
    return (
      <form action={formAction} className="mt-2 flex items-center gap-2">
        <input type="hidden" name="memberId" value={memberId} />
        {state?.error && <span className="text-[11px] text-danger">{state.error}</span>}
        <button
          type="submit"
          disabled={pending}
          className="text-[11px] font-semibold text-danger hover:underline"
        >
          {pending ? ru.adminReset.working : ru.adminReset.confirm}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-[11px] font-medium text-ink-3 hover:underline"
        >
          {ru.adminReset.close}
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="mt-2 flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-ink-2 hover:underline"
    >
      <KeyRound className="h-3 w-3" />
      {ru.adminReset.button}
    </button>
  );
}

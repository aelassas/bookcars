"use client";

/**
 * Per-member console controls: reset password (copy-once) and remove from
 * tenant (two-step confirm). Modelled on the tenant-side ResetPasswordButton
 * — the temp password is shown exactly once, because only its hash is stored
 * server-side and there is no way to see it again after this closes.
 *
 * Both destructive paths require a second click: from the console these act on
 * someone else's workspace, so a stray click must not be enough.
 */
import { useActionState, useState } from "react";
import { Copy, Check, KeyRound, UserMinus } from "lucide-react";
import {
  adminResetMemberPassword,
  type AdminResetPasswordState,
} from "@/modules/admin/actions";

export function ResetMemberPassword({
  tenantId,
  userId,
  email,
}: {
  tenantId: string;
  userId: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState<AdminResetPasswordState | null, FormData>(
    adminResetMemberPassword.bind(null, tenantId),
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
      <div className="rounded-field border border-warn-line bg-warn-soft p-2 text-xs">
        <p className="font-semibold text-ink">Temporary password — shown once</p>
        <p className="mt-0.5 text-ink-2">
          Give it to {state.email || email} directly. They must change it on next sign-in.
        </p>
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
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  if (confirming) {
    return (
      <form action={formAction} className="flex items-center justify-end gap-2">
        <input type="hidden" name="userId" value={userId} />
        {state?.error && <span className="text-[11px] text-danger">{state.error}</span>}
        <span className="text-[11px] text-ink-3">Reset password for {email}?</span>
        <button
          type="submit"
          disabled={pending}
          className="text-[11px] font-semibold text-danger hover:underline"
        >
          {pending ? "Working…" : "Confirm reset"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-[11px] font-medium text-ink-3 hover:underline"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-ink-2 hover:underline"
    >
      <KeyRound className="h-3 w-3" />
      Reset password
    </button>
  );
}

export function RemoveMemberButton({
  action,
  userId,
  email,
}: {
  action: (formData: FormData) => void;
  userId: string;
  email: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <form action={action} className="flex items-center justify-end gap-2">
        <input type="hidden" name="userId" value={userId} />
        <span className="text-[11px] text-ink-3">Remove {email} from this tenant?</span>
        <button type="submit" className="text-[11px] font-semibold text-danger hover:underline">
          Confirm remove
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-[11px] font-medium text-ink-3 hover:underline"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-danger hover:underline"
    >
      <UserMinus className="h-3 w-3" />
      Remove
    </button>
  );
}

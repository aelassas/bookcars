"use client";

import { useActionState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button, Label } from "@/components/ui";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { ru } from "@/lib/i18n/ru";
import { setOrChangePassword, type PasswordActionState } from "./actions";

export default function PasswordForm({
  email,
  hasPassword,
  next,
}: {
  email: string;
  hasPassword: boolean;
  next: string;
}) {
  const [state, action, pending] = useActionState<PasswordActionState | null, FormData>(
    setOrChangePassword,
    null
  );
  // update() re-runs the jwt callback with trigger:"update", which
  // re-reads mustChangePassword from the DB (now false) — without this the
  // tenant layout would keep redirecting back here on the stale JWT.
  const { update } = useSession();

  useEffect(() => {
    if (!state?.success) return;
    let cancelled = false;
    (async () => {
      // update() refreshes the JWT flag but can hang or reject; never let the
      // user sit on a spinner — hard-navigate after at most 2.5s. The tenant
      // layout re-verifies the flag against the DB, so even a failed refresh
      // can't loop.
      try {
        await Promise.race([
          update().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 2500)),
        ]);
      } finally {
        if (!cancelled) window.location.assign(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state?.success, update, next]);

  if (state?.success) {
    return (
      <p role="status" className="text-sm font-medium text-success">
        {ru.password.success}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-xs text-ink-3">{email}</p>

      {state?.error && (
        <div
          role="alert"
          className="rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </div>
      )}

      {hasPassword && (
        <div>
          <Label htmlFor="current-password">{ru.password.currentPasswordLabel}</Label>
          <PasswordInput
            id="current-password"
            name="currentPassword"
            required
            autoComplete="current-password"
          />
        </div>
      )}

      <div>
        <Label htmlFor="new-password">{ru.password.newPasswordLabel}</Label>
        <PasswordInput
          id="new-password"
          name="newPassword"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div>
        <Label htmlFor="confirm-password">{ru.password.confirmPasswordLabel}</Label>
        <PasswordInput
          id="confirm-password"
          name="confirmPassword"
          required
          minLength={8}
          autoComplete="new-password"
          showCapsLockHint={false}
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? ru.password.submitting : hasPassword ? ru.password.submitChange : ru.password.submitSet}
      </Button>
    </form>
  );
}

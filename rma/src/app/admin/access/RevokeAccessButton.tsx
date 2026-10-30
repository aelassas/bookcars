"use client";

/**
 * Two-step confirm for revoking a person's access to one tenant. This button
 * used to be a single click that wiped the user's membership of EVERY tenant;
 * it is now scoped and confirmed, and it names the workspace it will act on so
 * the operator can see which one before committing.
 */
import { useState } from "react";
import { revokeUser } from "./actions";

export default function RevokeAccessButton({
  userId,
  tenantId,
  tenantSlug,
  email,
}: {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  email: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <form action={revokeUser} className="flex items-center gap-2">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="tenantId" value={tenantId} />
        <span className="text-[11px] text-ink-3">
          Remove {email} from {tenantSlug}?
        </span>
        <button
          type="submit"
          className="rounded-field border border-line px-2 py-1 text-xs font-semibold text-danger hover:bg-danger-soft"
        >
          Confirm
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
      className="rounded-field border border-line px-2 py-1 text-xs font-semibold text-danger hover:bg-danger-soft"
    >
      Remove from {tenantSlug}
    </button>
  );
}

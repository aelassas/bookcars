"use client";
// «Floor login» name grid — one big tap per person, phone/tablet-first for the
// office floor. Tapping a name mints that user's session via the `floor-name`
// provider (all gating server-side; see platform/auth/floor-login.ts) and
// lands them on «Мой день». Design-system tokens ONLY (bg-surface/bg-sunken,
// text-ink*, border-line, rounded-card) — mirror PulseBoard/MyDay, no
// slate/white.
import { useState } from "react";
import { signIn } from "next-auth/react";
import type { FloorMember } from "@/modules/admin/floor-queries";

export function FloorNameGrid({
  tenantSlug,
  members,
}: {
  tenantSlug: string;
  members: FloorMember[];
}) {
  // Which button is signing in (disables the whole grid), and the last error.
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function pick(userId: string) {
    if (busy) return;
    setBusy(userId);
    setError("");
    const result = await signIn("floor-name", { userId, tenantSlug, redirect: false });
    if (result?.error || !result?.ok) {
      setBusy(null);
      setError("Sign-in failed. Contact your administrator.");
      return;
    }
    // Same destination the password/telegram flows resolve to for sales staff.
    window.location.assign(`/${tenantSlug}`); // root decides: floor rep → /my, manager → full desk
  }

  if (members.length === 0) {
    return (
      <p className="rounded-card border border-line bg-surface px-4 py-6 text-center text-[17px] text-ink-2">
        Nobody to show here yet.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-field bg-red-600/15 px-4 py-3 text-center text-[15px] text-red-500">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {members.map((m) => (
          <button
            key={m.userId}
            type="button"
            onClick={() => pick(m.userId)}
            disabled={busy !== null}
            className="flex flex-col items-start gap-1 rounded-card border border-line bg-surface px-4 py-5 text-left transition hover:border-ink-3 disabled:opacity-50"
          >
            <span className="text-[17px] font-semibold text-ink">
              {busy === m.userId ? "Signing in…" : m.name}
            </span>
            <span className="rounded-full bg-sunken px-2 py-0.5 text-[13px] text-ink-2">
              {m.roleLabel}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

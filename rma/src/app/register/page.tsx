"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@/components/ui";
import { registerFromLan, type RegisterState } from "./actions";

const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM_NAME || "MyCRM";
const BRANDS = [
  { slug: "rma", label: "RMA Car Rental" },
];

export default function RegisterPage() {
  const [state, action, pending] = useActionState<RegisterState | null, FormData>(
    registerFromLan,
    null,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-canvas to-brand-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="text-3xl font-bold tracking-tight text-ink">{PLATFORM}</div>
          <p className="mt-2 text-center text-xs tracking-wide text-ink-3">
            Create your {PLATFORM} account
          </p>
        </div>

        <form
          action={action}
          className="rounded-card border border-line bg-surface p-8 shadow-lifted"
        >
          <h1 className="text-xl font-semibold tracking-tight text-ink">Register</h1>
          <p className="mt-1 text-sm text-ink-2">
            Office network only. Your device is recorded for the admin to confirm.
          </p>

          {state?.error && (
            <div className="mt-4 rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
              {state.error}
            </div>
          )}

          <Label className="mt-5" htmlFor="reg-name">Full name</Label>
          <Input id="reg-name" name="name" required autoFocus className="w-full" placeholder="Azat Yagdyyev" />

          <Label className="mt-4" htmlFor="reg-email">Email</Label>
          <Input id="reg-email" name="email" type="email" required className="w-full" placeholder="you@company.com" />

          <Label className="mt-4" htmlFor="reg-password">Password</Label>
          <Input id="reg-password" name="password" type="password" required className="w-full" placeholder="At least 6 characters" />

          <Label className="mt-4" htmlFor="reg-brand">Company</Label>
          <select
            id="reg-brand"
            name="brand"
            required
            defaultValue="rma"
            className="mt-1 w-full rounded-field border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            {BRANDS.map((b) => (
              <option key={b.slug} value={b.slug}>{b.label}</option>
            ))}
          </select>

          <Button type="submit" disabled={pending} className="mt-5 w-full">
            {pending ? "Creating…" : "Create account"}
          </Button>

          <p className="mt-3 text-center text-[11px] text-ink-3">
            Already have an account? <Link href="/login" className="text-brand-700">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}

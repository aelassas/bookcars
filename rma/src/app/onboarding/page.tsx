import { redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getActiveTenant } from "@/platform/auth/tenant";
import { createTenantForCurrentUser } from "./actions";
import { MODULE_REGISTRY } from "@/platform/tenant-modules";
import { Button, Input, Label } from "@/components/ui";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const active = await getActiveTenant();
  if (active) redirect(`/${active.slug}/crm`);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-canvas to-brand-50 px-4 py-8">
      <form
        action={createTenantForCurrentUser}
        className="w-full max-w-lg rounded-card border border-line bg-surface p-8 shadow-lifted"
      >
        <h1 className="text-xl font-semibold tracking-tight text-ink">Create your workspace</h1>
        <p className="mt-1 text-sm text-ink-2">
          One workspace per company. You can invite teammates after setup.
        </p>

        <Label className="mt-6" htmlFor="ob-name">
          Company name
        </Label>
        <Input
          id="ob-name"
          name="name"
          required
          autoFocus
          minLength={2}
          className="w-full"
          placeholder="Acme Rentals LLC"
        />

        <Label className="mt-4" htmlFor="ob-slug">
          Workspace slug
        </Label>
        <Input
          id="ob-slug"
          name="slug"
          required
          minLength={2}
          pattern="[a-z0-9-]+"
          className="w-full"
          placeholder="acme-rentals"
        />
        <p className="mt-1 text-[11px] text-ink-3">
          Lowercase letters, numbers, dashes. Becomes part of your URLs.
        </p>

        <div className="mt-6">
          <div className="text-xs font-medium text-ink-2">Modules to enable</div>
          <p className="text-[11px] text-ink-3">You can change this later in workspace settings.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MODULE_REGISTRY.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2 rounded-field border border-line p-3 transition-colors hover:bg-sunken"
              >
                <input
                  type="checkbox"
                  name="modules[]"
                  value={m.id}
                  defaultChecked={true}
                  className="h-4 w-4 rounded border-line accent-brand-600"
                />
                <span className="text-sm text-ink-2">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" className="mt-8 w-full">
          Create workspace
        </Button>
      </form>
    </main>
  );
}

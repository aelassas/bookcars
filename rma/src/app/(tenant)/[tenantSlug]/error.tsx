"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";
import { isStaleActionError, reloadForStaleAction } from "@/lib/stale-action";

// Tenant-level error boundary: any uncaught render error (e.g. a role guard
// throwing) shows a friendly page with a way back — never the raw production
// "Server Components render" screen.
export default function TenantError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  // After a deploy, an open tab holds Server Action ids the new build doesn't
  // have. That is staleness, not a permissions problem — reloading fixes it,
  // and showing "not available for your role" here would be a lie.
  useEffect(() => {
    if (isStaleActionError(error)) reloadForStaleAction();
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warn-soft text-warn"><AlertTriangle className="h-6 w-6" /></div>
      <h1 className="text-lg font-semibold text-ink">We couldn’t load this view</h1>
      <p className="mt-1 max-w-sm text-sm text-ink-2">
        Try again. If the problem continues, return to your dashboard or contact your administrator.
      </p>
      {error.digest && <p className="mt-2 text-xs text-ink-3">Reference: {error.digest}</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href={tenantSlug ? `/${tenantSlug}` : "/"}>Back to dashboard</ButtonLink>
      </div>
    </div>
  );
}

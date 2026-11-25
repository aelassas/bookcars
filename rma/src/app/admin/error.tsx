"use client";

// Platform-console error boundary. Every admin server action signals failure
// by `throw new Error(...)` ("Slug is already taken", "Invalid tier", "No
// active support grant for you on this tenant"). Without a boundary here Next
// swallows the message in production and renders the generic "Application
// error" screen — the operator sees a crash instead of the reason. This shows
// the message itself, in console chrome.
import { AlertTriangle } from "lucide-react";
import { Card, Button, ButtonLink } from "@/components/ui";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warn-soft text-warn">
            <AlertTriangle className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-ink">That action didn&apos;t go through</h1>
            <p className="mt-1 text-sm text-ink-2">
              Nothing was changed. The reason reported by the server:
            </p>
            <p className="mt-3 rounded-field border border-line bg-sunken px-3 py-2 text-sm text-ink">
              {error.message || "Unknown error"}
            </p>
            {error.digest && (
              <p className="mt-2 text-[11px] text-ink-3">
                Reference: <span className="font-mono">{error.digest}</span>
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" onClick={reset} size="sm">
                Try again
              </Button>
              <ButtonLink href="/admin" variant="secondary">
                Back to dashboard
              </ButtonLink>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

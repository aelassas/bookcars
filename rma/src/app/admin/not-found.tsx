// Console 404. Also what a non-admin gets: the /admin layout calls
// notFound() rather than throwing, so the console's existence isn't
// revealed — keep this copy neutral for that reason.
import { Card, ButtonLink } from "@/components/ui";

export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <Card className="p-6">
        <h1 className="text-base font-semibold text-ink">Page not found</h1>
        <p className="mt-1 text-sm text-ink-2">
          This page doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
        <div className="mt-5">
          <ButtonLink href="/admin" variant="secondary">
            Back to dashboard
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { FileSearch } from "lucide-react";
import { ButtonLink } from "@/components/ui";

export default function RecordNotFound() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <FileSearch className="mb-4 h-8 w-8 text-ink-3" />
      <h1 className="text-xl font-semibold text-ink">Record not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-2">This record may have been removed, or the link is no longer available in your workspace.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <ButtonLink href={`/${tenantSlug}/search`} variant="primary">Search records</ButtonLink>
        <ButtonLink href={`/${tenantSlug}`}>Back to dashboard</ButtonLink>
      </div>
    </main>
  );
}

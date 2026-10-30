"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { safeReturnHref } from "@/lib/return-navigation";

export function BackLink({ href, children }: { href: string; children: string }) {
  const params = useSearchParams();
  const target = safeReturnHref(params.get("returnTo"), href);
  const sameSection = target.split("?")[0].split("#")[0] === href;
  return (
    <Link href={target} className="mb-4 inline-flex items-center gap-1 rounded-field py-1 text-sm text-ink-2 transition-colors hover:text-ink">
      <ChevronLeft className="h-4 w-4" /> {sameSection ? children : "Back to previous view"}
    </Link>
  );
}

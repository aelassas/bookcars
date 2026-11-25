import type { Metadata } from "next";
import { Send } from "lucide-react";
import { PLATFORM_NAME } from "@/platform/brand";

export const metadata: Metadata = {
  title: `${PLATFORM_NAME} — Customer Portal`,
  description: "Lease customer self-service portal.",
};

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full bg-canvas">
      <header className="border-b border-line bg-surface px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Send className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink">{PLATFORM_NAME}</div>
            <div className="text-[11px] text-ink-3">Customer Portal</div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </div>
  );
}

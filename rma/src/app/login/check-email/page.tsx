import Link from "next/link";
import { MailCheck } from "lucide-react";
import { ru } from "@/lib/i18n/ru";

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-canvas to-brand-50 px-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-8 text-center shadow-lifted">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <MailCheck className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{ru.checkEmail.title}</h1>
        <p role="status" className="mt-2 text-sm text-ink-2">
          {ru.checkEmail.body}
        </p>
        <p className="mt-6 text-[11px] leading-relaxed text-ink-3">
          {ru.checkEmail.notReceived}{" "}
          <Link href="/login" className="font-medium text-brand-700 underline">
            {ru.checkEmail.signInLink}
          </Link>{" "}
          {ru.checkEmail.tryAgain}
        </p>
      </div>
    </main>
  );
}

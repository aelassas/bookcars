// One place all outbound email goes through. Uses Resend over plain fetch
// (no SDK dependency). If RESEND_API_KEY is unset it logs to the console so
// dev works offline — same graceful-degradation pattern as the AI router.
//
// Required env to actually deliver:
//   RESEND_API_KEY   — from https://resend.com
//   AUTH_EMAIL_FROM  — e.g. "TAKE Auto <noreply@yourdomain.ae>" (the domain
//                      must be verified in Resend; for quick tests Resend
//                      allows onboarding@resend.dev)

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  sent: boolean;
  reason?: string;
}

const DEFAULT_FROM = "TAKE Auto <onboarding@resend.dev>";

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM ?? DEFAULT_FROM;

  if (!apiKey) {
    const bar = "─".repeat(64);
    console.log(
      `\n${bar}\n EMAIL (RESEND_API_KEY not set — not delivered)\n To:      ${msg.to}\n Subject: ${msg.subject}\n\n${msg.text}\n${bar}\n`
    );
    return { sent: false, reason: "RESEND_API_KEY not set (logged to console)" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return { sent: true };
}

/** Base URL for links in emails. */
export function appBaseUrl(): string {
  return (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

import type { EmailConfig } from "@auth/core/providers/email";
import { sendEmail } from "@/platform/email/send";
import { magicLinkEmail } from "@/platform/email/templates";

/**
 * Magic-link provider. Delivers via the shared email sender (Resend if
 * RESEND_API_KEY is set, otherwise the link is logged to stdout so dev
 * works offline).
 */
export function magicLinkProvider(): EmailConfig {
  return {
    id: "email",
    type: "email",
    name: "Email",
    from: process.env.AUTH_EMAIL_FROM ?? "TAKE Auto <onboarding@resend.dev>",
    maxAge: 24 * 60 * 60,
    server: undefined,
    options: {},
    async sendVerificationRequest({ identifier, url }) {
      await sendEmail(magicLinkEmail(identifier, url));
    },
  };
}

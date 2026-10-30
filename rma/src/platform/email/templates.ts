// Transactional email templates. Plain, inline-styled HTML (email clients
// don't do <style>/CSS classes reliably) + a text fallback.

import type { EmailMessage } from "./send";

function layout(heading: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f8f9fc;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 16px;font-size:18px;color:#222">${heading}</h1>
      ${bodyHtml}
      <p style="margin-top:28px;font-size:12px;color:#a0a0a0">TAKE Auto · Powered by Pilot Telematics</p>
    </div>
  </body></html>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:#7B61FF;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">${label}</a>`;
}

export function magicLinkEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Sign in to TAKE Auto",
    html: layout(
      "Sign in to TAKE Auto",
      `<p style="font-size:14px;line-height:1.6">Click the button below to sign in. The link expires in 24 hours.</p>
       <p style="margin:20px 0">${button(url, "Sign in")}</p>
       <p style="font-size:12px;color:#7a7a7a">If you didn't request this, you can safely ignore this email.</p>`
    ),
    text: `Sign in to TAKE Auto: ${url}\n\nThe link expires in 24 hours. If you didn't request this, ignore it.`,
  };
}

export function inviteEmail(to: string, tenantName: string, loginUrl: string): EmailMessage {
  return {
    to,
    subject: `You've been added to ${tenantName} on TAKE Auto`,
    html: layout(
      `Welcome to ${tenantName}`,
      `<p style="font-size:14px;line-height:1.6">You've been given access to <strong>${tenantName}</strong> on TAKE Auto.
       Click below, then choose <em>"Email me a sign-in link"</em> to get a one-time login link — no password needed.</p>
       <p style="margin:20px 0">${button(loginUrl, "Go to sign in")}</p>
       <p style="font-size:12px;color:#7a7a7a">If you weren't expecting this, you can ignore this email.</p>`
    ),
    text: `You've been added to ${tenantName} on TAKE Auto.\n\nSign in here (choose "Email me a sign-in link"): ${loginUrl}\n\nNo password needed. If you weren't expecting this, ignore it.`,
  };
}

// WhatsApp webhook signature verification and subscribe challenge.
// https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks

import { createHmac, timingSafeEqual } from "node:crypto";

export type SignatureCheck =
  | { ok: true; valid: boolean }
  | { ok: false; reason: "signature_required" | "signature_mismatch" };

/**
 * Verify the HMAC-SHA256 signature on the raw body.
 * WhatsApp sends `X-Hub-Signature-256: sha256=<hex>`.
 *
 * Tri-state (same pattern as CallGear):
 * - secret set + valid   → {ok:true, valid:true}
 * - secret set + invalid → {ok:false, reason:"signature_mismatch"}
 * - secret unset + prod  → {ok:false, reason:"signature_required"}
 * - secret unset + dev   → {ok:true, valid:false}
 */
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null
): SignatureCheck {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "signature_required" };
    }
    return { ok: true, valid: false };
  }
  if (!signatureHeader) {
    return { ok: false, reason: "signature_required" };
  }
  const given = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (given.length !== expected.length) {
    return { ok: false, reason: "signature_mismatch" };
  }
  let match: boolean;
  try {
    match = timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return { ok: false, reason: "signature_mismatch" };
  }
  return match ? { ok: true, valid: true } : { ok: false, reason: "signature_mismatch" };
}

/**
 * Respond to Meta's webhook verification challenge.
 * Meta sends GET with hub.mode=subscribe, hub.verify_token, hub.challenge.
 */
export function verifySubscribeChallenge(params: {
  mode?: string;
  verifyToken?: string;
  challenge?: string;
}): { ok: boolean; challenge?: string; reason?: string } {
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expectedToken) {
    return { ok: false, reason: "verify_token_not_configured" };
  }
  if (params.mode !== "subscribe") {
    return { ok: false, reason: "invalid_mode" };
  }
  if (params.verifyToken !== expectedToken) {
    return { ok: false, reason: "verify_token_mismatch" };
  }
  if (!params.challenge) {
    return { ok: false, reason: "missing_challenge" };
  }
  return { ok: true, challenge: params.challenge };
}

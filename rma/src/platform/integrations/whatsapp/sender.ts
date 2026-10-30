// WhatsApp outbound message sender.
// Real sending is NOT implemented — outbound WA is human-gated by design and
// hard-blocked by the read-only switch. What remains is an explicitly opt-in
// MOCK for local/staging work. Replace with real WhatsApp Business API calls
// once credentials are available.
// https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages

import { assertOutboundDisabled } from "../readonly";
import { log } from "@/platform/log";

export interface SendMessageResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

// The mock reports success without sending anything, so callers mark messages
// as delivered that no customer ever received. It must therefore be opted into
// explicitly — never by the mere absence of a token. Read per call: this module
// does not own dotenv loading, so a module-load read could miss .env.local.
function mockSendEnabled(): boolean {
  return (process.env.WHATSAPP_MOCK_SEND ?? "").trim().toLowerCase() === "true";
}

/**
 * Send a WhatsApp message.
 *
 * Real delivery is disabled: with a token configured this throws via the
 * read-only guard (unchanged behaviour). Without one it either performs an
 * explicitly-enabled MOCK send (`WHATSAPP_MOCK_SEND=true`, loudly logged so
 * staging logs never read as real delivery) or refuses with ok:false so the
 * caller does not record a phantom delivery.
 *
 * In production, the real path calls:
 *   POST https://graph.facebook.com/v18.0/{phoneNumberId}/messages
 * with Bearer {WHATSAPP_ACCESS_TOKEN} and the message payload. When that lands,
 * give the fetch an `AbortSignal.timeout(...)` — undici has no total-response
 * timeout by default, so a wedged Graph API would stall the worker forever.
 */
export async function sendWhatsAppMessage(args: {
  to: string;
  body: string;
  phoneNumberId?: string | null;
}): Promise<SendMessageResult> {
  const { to, body, phoneNumberId } = args;

  // Hard block real outbound during read-only consolidation. (The mock below
  // sends nothing externally, so it stays usable when no token is configured.)
  if (process.env.WHATSAPP_ACCESS_TOKEN) assertOutboundDisabled("whatsapp");

  if (!mockSendEnabled()) {
    log.warn("whatsapp send refused — no transport configured", {
      to,
      phoneNumberId: phoneNumberId ?? "not_configured",
      hint: "set WHATSAPP_MOCK_SEND=true to simulate delivery in dev/staging",
    });
    return {
      ok: false,
      error:
        "WhatsApp sending is not configured (no transport; set WHATSAPP_MOCK_SEND=true to simulate)",
    };
  }

  log.warn("whatsapp MOCK send — nothing was delivered to the customer", {
    mock: true,
    to,
    bodyPreview: body.slice(0, 80),
    phoneNumberId: phoneNumberId ?? "not_configured",
  });

  return {
    ok: true,
    messageId: `wamid.mock.${Date.now()}`,
  };
}

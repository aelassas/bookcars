import type { MessagingProvider, SendResult } from "./provider";

export interface WhatsAppProvider extends MessagingProvider {
  readonly channel: "whatsapp";
}

class LiveWhatsAppProvider implements WhatsAppProvider {
  readonly channel = "whatsapp" as const;
  readonly mode = "live" as const;

  async send(args: {
    to: string;
    body: string;
    tenantId: string;
    phoneNumberId?: string | null;
  }): Promise<SendResult> {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) {
      return { ok: false, error: "WHATSAPP_ACCESS_TOKEN not configured" };
    }
    const phoneNumberId = args.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!phoneNumberId) {
      return { ok: false, error: "WhatsApp phone number ID not configured for tenant" };
    }

    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: args.to,
        type: "text",
        text: { body: args.body, preview_url: false },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `WhatsApp API ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = (await res.json()) as { messages?: { id: string }[] };
    return { ok: true, messageId: json.messages?.[0]?.id };
  }
}

class MockWhatsAppProvider implements WhatsAppProvider {
  readonly channel = "whatsapp" as const;
  readonly mode = "mock" as const;

  async send(args: {
    to: string;
    body: string;
    tenantId: string;
    phoneNumberId?: string | null;
  }): Promise<SendResult> {
    console.log("[whatsapp:mock:send]", {
      to: args.to,
      body: args.body.slice(0, 80),
      tenantId: args.tenantId,
      phoneNumberId: args.phoneNumberId ?? "not_configured",
      at: new Date().toISOString(),
    });
    return { ok: true, messageId: `wamid.mock.${Date.now()}` };
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  if (process.env.WHATSAPP_ACCESS_TOKEN) {
    return new LiveWhatsAppProvider();
  }
  return new MockWhatsAppProvider();
}

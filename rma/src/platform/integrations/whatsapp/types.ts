// WhatsApp Business API webhook payload types.
// Based on Meta Cloud API webhook format.
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

export interface WhatsAppValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppInboundMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppContact {
  wa_id: string;
  profile: { name: string };
}

export interface WhatsAppInboundMessage {
  from: string; // sender phone number
  id: string;   // WhatsApp message ID (unique per message)
  timestamp: string;
  type: "text" | "image" | "document" | "audio" | "video" | "location" | "interactive";
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string };
  document?: { id: string; mime_type: string; sha256: string; filename: string };
  audio?: { id: string; mime_type: string; sha256: string };
  video?: { id: string; mime_type: string; sha256: string };
  location?: { latitude: string; longitude: string; name?: string; address?: string };
  interactive?: { type: string; [key: string]: unknown };
  context?: { from: string; id: string };
}

export interface WhatsAppStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  conversation?: { id: string; origin: { type: string } };
  pricing?: { billable: boolean; pricing_model: string; category: string };
  errors?: WhatsAppError[];
}

export interface WhatsAppError {
  code: number;
  title: string;
  message?: string;
  error_data?: { details: string };
}

export interface WhatsAppWebhookPayload {
  object: "whatsapp_business_account";
  entry: WhatsAppWebhookEntry[];
}

/**
 * Extract the first inbound text message from a webhook payload.
 * Returns undefined if the payload contains no inbound text messages.
 */
export function extractFirstInboundTextMessage(
  payload: WhatsAppWebhookPayload
): { from: string; name: string; body: string; messageId: string; timestamp: number } | undefined {
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const value = change.value;
      if (!value.messages || value.messages.length === 0) continue;
      const msg = value.messages[0];
      if (msg.type !== "text" || !msg.text?.body) continue;
      const contact = value.contacts?.find((c) => c.wa_id === msg.from);
      return {
        from: msg.from,
        name: contact?.profile?.name ?? msg.from,
        body: msg.text.body,
        messageId: msg.id,
        timestamp: Number(msg.timestamp) * 1000,
      };
    }
  }
  return undefined;
}

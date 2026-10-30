import "server-only";
import { eq, and } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import * as schema from "@/platform/db/schema";
import { getMessagingProvider } from "@/platform/messaging";

interface SendMessageInput {
  tenantId: string;
  channel: "whatsapp";
  to: string;
  body: string;
  phoneNumberId?: string | null;
  relatedEntityType?: "rental" | "customer" | "lead" | null;
  relatedEntityId?: string | null;
}

export async function sendMessage(input: SendMessageInput) {
  const provider = getMessagingProvider(input.channel);
  const result = await provider.send({
    to: input.to,
    body: input.body,
    tenantId: input.tenantId,
    phoneNumberId: input.phoneNumberId,
  });

  const mock = provider.mode === "mock";
  const messageId = result.ok && result.messageId ? result.messageId : null;

  // Honesty: the mock provider never actually delivers anything, so record
  // it as "queued" rather than "sent" — a real provider still gets "sent"/
  // "failed" from the actual send result.
  const status = !result.ok ? "failed" : mock ? "queued" : "sent";

  await withDrizzleTenant(input.tenantId, async (tx) => {
    await tx.insert(schema.message).values({
      tenantId: input.tenantId,
      channel: input.channel,
      direction: "outbound",
      status,
      to: input.to,
      body: input.body,
      externalMessageId: messageId,
      errorMessage: result.error ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
    });
  });

  return { ...result, mock };
}

export async function sendAiReplyForInboundMessage(messageId: string, tenantId: string) {
  const [msg] = await withDrizzleTenant(tenantId, async (tx) =>
    tx
      .select()
      .from(schema.message)
      .where(and(eq(schema.message.id, messageId), eq(schema.message.tenantId, tenantId)))
  );
  if (!msg || !msg.aiReply || !msg.from) return { ok: false, error: "No AI reply or sender", mock: false };

  const tenant = await withDrizzleTenant(tenantId, async (tx) =>
    tx.query.tenant.findFirst({
      where: eq(schema.tenant.id, tenantId),
      columns: { whatsappPhoneNumberId: true },
    })
  );

  return sendMessage({
    tenantId,
    channel: "whatsapp",
    to: msg.from,
    body: msg.aiReply,
    phoneNumberId: tenant?.whatsappPhoneNumberId ?? null,
    relatedEntityType: msg.relatedEntityType as "rental" | "customer" | "lead" | null,
    relatedEntityId: msg.relatedEntityId,
  });
}

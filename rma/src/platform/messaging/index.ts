import { getWhatsAppProvider } from "./whatsapp-provider";
import type { MessagingProvider } from "./provider";

export * from "./provider";
export { getWhatsAppProvider } from "./whatsapp-provider";

export function getMessagingProvider(channel: "whatsapp"): MessagingProvider {
  switch (channel) {
    case "whatsapp":
      return getWhatsAppProvider();
    default:
      throw new Error(`Unsupported messaging channel: ${channel}`);
  }
}

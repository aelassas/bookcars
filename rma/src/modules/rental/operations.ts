export type ExtensionStatus = "awaiting_response" | "wants_extension" | "returning" | "extension_confirmed";

export function returnReminderIsDue(returnDate: Date, reminderSentAt: Date | null, now: Date): boolean {
  return reminderSentAt == null && returnDate.getTime() - now.getTime() <= 48 * 60 * 60 * 1000;
}

export function buildReturnReminder(input: { customerName: string; plate: string; returnDate: Date }): string {
  return [
    `Hello ${input.customerName}, this is RMA Car Rental.`,
    `Your rental vehicle ${input.plate} is due back on ${input.returnDate.toISOString().slice(0, 16).replace("T", " ")} UTC.`,
    "Would you like to extend the rental, or will you return the vehicle at that time? Please reply here and our manager will confirm any extension.",
  ].join("\n");
}

export function classifyExtensionReply(body: string): "wants_extension" | "returning" | null {
  const text = body.toLowerCase();
  if (/(продл|продле|extend|extension|renew|أمد|تمديد|تجديد)/i.test(text)) return "wants_extension";
  if (/(верн|возвращ|return|give back|أرجع|ارجاع|إرجاع|سأعيد)/i.test(text)) return "returning";
  return null;
}

import "server-only";
import { eq } from "drizzle-orm";
import { rentalCharge } from "@/platform/db/schema";
import { waOutbox } from "@/platform/outbox/schema";
import { dedupeUuid } from "@/modules/rental/outbox";
import { withDrizzleTenant } from "@/platform/tenancy/rls";

export async function markDeliveredChargeNotifications(home: string): Promise<number> {
  const queued = await withDrizzleTenant(home, (tx) => tx.select({ id: rentalCharge.id, kind: rentalCharge.kind })
    .from(rentalCharge).where(eq(rentalCharge.notificationStatus, "queued")));
  let delivered = 0;
  for (const charge of queued) {
    const [outbox] = await withDrizzleTenant(home, (tx) => tx.select({ status: waOutbox.status, sentAt: waOutbox.sentAt, error: waOutbox.error })
      .from(waOutbox).where(eq(waOutbox.boardItemId, dedupeUuid(`rental-charge:${charge.id}`))).limit(1));
    if (!outbox) continue;
    if (outbox.status === "sent" && outbox.sentAt) {
      const sentAt = outbox.sentAt;
      await withDrizzleTenant(home, (tx) => tx.update(rentalCharge).set({
        notificationStatus: "sent",
        notifiedAt: sentAt,
        paymentDueAt: charge.kind === "fine" ? new Date(sentAt.getTime() + 24 * 60 * 60 * 1000) : null,
        notificationError: null,
        updatedAt: new Date(),
      }).where(eq(rentalCharge.id, charge.id)));
      delivered++;
    } else if (["failed", "skipped", "skipped_no_observer"].includes(outbox.status)) {
      await withDrizzleTenant(home, (tx) => tx.update(rentalCharge).set({
        notificationStatus: "failed",
        notificationError: outbox.error?.slice(0, 500) ?? `WhatsApp ${outbox.status}`,
        updatedAt: new Date(),
      }).where(eq(rentalCharge.id, charge.id)));
    }
  }
  return delivered;
}

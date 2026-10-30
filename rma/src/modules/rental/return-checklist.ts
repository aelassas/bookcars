"use server";
/**
 * Return checklist (owner 2026-07-26). On the car's return, before the rental is
 * closed, staff tick: fines / Salik / parking / defects (manual — Salik/fines
 * live in iTransport, no access yet). Save it, then send it to the deal's
 * responsible salesperson over WhatsApp / Telegram. The «finish» step reads it
 * — a soft gate (fill OR skip-with-note).
 *
 * There used to be a second, hardcoded recipient: Lidia, the returns/fines
 * coordinator. That role is obsolete (owner, 2026-08-05), so the checklist now
 * goes to the responsible agent only. If a coordinator role comes back, add it
 * as CONFIG (an owner key from the notify registry), never as a name in code —
 * a hardcoded person silently keeps paging someone who has left.
 */
import { eq } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { rental, customer, vehicle } from "@/platform/db/schema";
import { canManageRentalsForTenant } from "./policies";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { requireAuth } from "@/platform/auth/authorization";
import { sendNotification } from "@/modules/notify/send";
import { ownerKeyForUser } from "@/modules/notify/registry";

export type ChecklistItem = { checked: boolean; amount?: number | null; note?: string | null };
export type ReturnChecklist = {
  fines?: ChecklistItem;
  salik?: ChecklistItem;
  parking?: ChecklistItem;
  defects?: { checked: boolean; note?: string | null };
  completedBy?: string | null;
  completedAt?: string | null;
  sentAt?: string | null;
  skipped?: boolean;
};

export async function saveReturnChecklist(
  tenantId: string,
  rentalId: string,
  data: ReturnChecklist,
): Promise<void> {
  await canManageRentalsForTenant(tenantId);
  const actor = await requireAuth();
  // Shared fleet lives in fleet-home — the rental row is there.
  const home = await requireFleetHomeTenantId();
  await withDrizzleTenant(home, async (tx) => {
    await tx
      .update(rental)
      .set({
        returnChecklist: { ...data, completedBy: actor, completedAt: new Date().toISOString(), skipped: false },
        updatedAt: new Date(),
      })
      .where(eq(rental.id, rentalId));
  });
}

const money = (n?: number | null) => (n == null ? "" : ` — ${n.toLocaleString()} AED`);

/** Send the saved checklist to the deal's responsible agent over WhatsApp/Telegram. */
export async function sendReturnChecklist(tenantId: string, rentalId: string): Promise<{ sent: number }> {
  await canManageRentalsForTenant(tenantId);
  const home = await requireFleetHomeTenantId();

  const row = await withDrizzleTenant(home, async (tx) => {
    const [r] = await tx
      .select({
        id: rental.id,
        agent: rental.salesAgentId,
        checklist: rental.returnChecklist,
        customerName: customer.name,
        plate: vehicle.plate,
        make: vehicle.make,
        model: vehicle.model,
      })
      .from(rental)
      .innerJoin(customer, eq(rental.customerId, customer.id))
      .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
      .where(eq(rental.id, rentalId))
      .limit(1);
    return r;
  });
  if (!row) throw new Error("Rental not found");

  const cl = (row.checklist ?? {}) as ReturnChecklist;
  const car = [row.make, row.model].filter(Boolean).join(" ");
  const lines = [
    `📋 Return checklist`,
    `${car} (${row.plate}) — ${row.customerName ?? "customer"}`,
    `${cl.fines?.checked ? "🔴" : "⚪️"} Fines${cl.fines?.checked ? money(cl.fines.amount) : ""}${cl.fines?.note ? ` (${cl.fines.note})` : ""}`,
    `${cl.salik?.checked ? "🔴" : "⚪️"} Salik${cl.salik?.checked ? money(cl.salik.amount) : ""}`,
    `${cl.parking?.checked ? "🔴" : "⚪️"} Parking${cl.parking?.checked ? money(cl.parking.amount) : ""}`,
    `${cl.defects?.checked ? "🔴" : "⚪️"} Defects${cl.defects?.note ? ` — ${cl.defects.note}` : ""}`,
  ].join("\n");

  // Recipient: the deal's responsible agent. De-dupe by owner key (the loop
  // below still guards it — the list grows again the moment a second role is
  // configured).
  const targets: { userId?: string; ownerKey: string }[] = [];
  if (row.agent) {
    const k = ownerKeyForUser(row.agent);
    if (k) targets.push({ userId: row.agent, ownerKey: k });
  }

  let sent = 0;
  const seen = new Set<string>();
  for (const target of targets) {
    if (seen.has(target.ownerKey)) continue;
    seen.add(target.ownerKey);
    const res = await sendNotification(tenantId, {
      kind: "return_checklist",
      target,
      text: lines,
      dedupeKey: `retchk:${rentalId}:${target.ownerKey}:${new Date().toISOString().slice(0, 13)}`,
      entityType: "rental",
      entityId: rentalId,
    });
    if (res.outcome === "sent" || res.outcome === "dry_run") sent++;
  }

  await withDrizzleTenant(home, async (tx) => {
    await tx.update(rental).set({ returnChecklist: { ...cl, sentAt: new Date().toISOString() } }).where(eq(rental.id, rentalId));
  });
  return { sent };
}

import { eq, ne } from "drizzle-orm";
import { tenantMember, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { serviceState } from "@/modules/fleet/maintenance";
import { sendNotification } from "./send";
import { dubaiDateKey } from "./policy";
import type { RuleSummary } from "./rules";

export async function notifyServiceDue(tenantId: string, opts: { dryRun?: boolean; now?: Date } = {}): Promise<RuleSummary> {
  const now = opts.now ?? new Date();
  const today = dubaiDateKey(now);
  const summary: RuleSummary = { rule: "service_due", scanned: 0, outcomes: {} };
  const rows = await withDrizzleTenant(tenantId, async (tx) => ({
    vehicles: await tx.select().from(vehicle).where(ne(vehicle.status, "sold")),
    recipients: await tx.select({ userId: tenantMember.userId, roles: tenantMember.roles }).from(tenantMember).where(eq(tenantMember.tenantId, tenantId)),
  }));
  const recipients = rows.recipients.filter((row) => row.roles.some((role) => ["fleet", "tenant_admin", "platform_admin"].includes(role)));

  for (const car of rows.vehicles) {
    const state = serviceState({
      currentOdometer: car.odometer,
      lastServiceOdometer: car.lastServiceOdometer,
      nextServiceOdometer: car.nextServiceOdometer,
      warningIntervalKm: car.oilChangeIntervalKm,
      limitIntervalKm: car.serviceLimitIntervalKm,
    });
    const dateDue = car.nextServiceDate != null && car.nextServiceDate <= today;
    if (!dateDue && !["due_soon", "due"].includes(state.status)) continue;
    summary.scanned++;
    const text = `🔧 Oil/service ${state.status === "due" || dateDue ? "due" : "approaching"}\n${car.make} ${car.model} (${car.plate})\nCurrent: ${car.odometer} km` +
      (state.remainingKm != null ? ` · ${state.remainingKm} km left` : "") +
      (car.nextServiceDate ? `\nPlanned date: ${car.nextServiceDate}` : "");
    for (const recipient of recipients) {
      const result = await sendNotification(tenantId, {
        kind: "service_due",
        target: { userId: recipient.userId },
        text,
        dedupeKey: `service_due:${car.id}:${state.status}:${car.nextServiceOdometer ?? "-"}:${car.nextServiceDate ?? "-"}:${recipient.userId}`,
        entityType: "vehicle",
        entityId: car.id,
        dryRun: opts.dryRun,
        now,
      });
      summary.outcomes[result.outcome] = (summary.outcomes[result.outcome] ?? 0) + 1;
    }
  }
  return summary;
}

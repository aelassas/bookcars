import { and, eq, lte, ne, or } from "drizzle-orm";
import { tenantMember, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { sendNotification } from "./send";
import { dubaiDateKey } from "./policy";
import type { RuleSummary } from "./rules";

export async function notifyServiceDue(
  tenantId: string,
  opts: { dryRun?: boolean; now?: Date } = {},
): Promise<RuleSummary> {
  const now = opts.now ?? new Date();
  const today = dubaiDateKey(now);
  const summary: RuleSummary = { rule: "service_due", scanned: 0, outcomes: {} };

  const rows = await withDrizzleTenant(tenantId, async (tx) => ({
    vehicles: await tx
      .select({
        id: vehicle.id,
        plate: vehicle.plate,
        make: vehicle.make,
        model: vehicle.model,
        odometer: vehicle.odometer,
        nextServiceOdometer: vehicle.nextServiceOdometer,
        nextServiceDate: vehicle.nextServiceDate,
      })
      .from(vehicle)
      .where(and(
        ne(vehicle.status, "sold"),
        or(
          lte(vehicle.nextServiceOdometer, vehicle.odometer),
          lte(vehicle.nextServiceDate, today),
        ),
      )),
    recipients: await tx
      .select({ userId: tenantMember.userId, roles: tenantMember.roles })
      .from(tenantMember)
      .where(eq(tenantMember.tenantId, tenantId)),
  }));

  const recipients = rows.recipients.filter((r) =>
    r.roles.some((role) => ["fleet", "tenant_admin", "platform_admin"].includes(role)),
  );
  for (const car of rows.vehicles) {
    summary.scanned++;
    const text = `🔧 Oil/service due\n${car.make} ${car.model} (${car.plate})\nCurrent: ${car.odometer} km` +
      (car.nextServiceOdometer != null ? ` · planned: ${car.nextServiceOdometer} km` : "") +
      (car.nextServiceDate ? `\nPlanned date: ${car.nextServiceDate}` : "");
    for (const recipient of recipients) {
      const result = await sendNotification(tenantId, {
        kind: "service_due",
        target: { userId: recipient.userId },
        text,
        dedupeKey: `service_due:${car.id}:${car.nextServiceOdometer ?? "-"}:${car.nextServiceDate ?? "-"}:${recipient.userId}`,
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

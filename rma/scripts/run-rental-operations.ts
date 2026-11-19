import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { lookupFines } from "@/platform/integrations/rta/client";
import { parsePlate } from "@/lib/plates";
import { notifyRentalChargeById, upsertRentalCharge, vehiclesForChargeEntry } from "@/modules/rental-charges/core";
import { blockEligibleFineCharges } from "@/modules/rental-charges/engine-service";
import { markDeliveredChargeNotifications } from "@/modules/rental-charges/delivery";
import { syncSalikCharges } from "@/modules/rental-charges/salik";
import { captureExtensionReplies, sendDueChargeStatements, sendDueReturnReminders } from "@/modules/rental/operations-service";

const tenantSlug = process.env.RMA_OPERATIONS_TENANT_SLUG?.trim() || "rma";
const commit = process.argv.includes("--commit");
const syncFines = process.argv.includes("--sync-fines");
const syncSalik = process.argv.includes("--sync-salik");
const blockFines = process.argv.includes("--block-overdue-fines");

async function main() {
  const [tenant] = (await pool.query("SELECT id FROM tenant WHERE slug=$1", [tenantSlug])).rows;
  if (!tenant) throw new Error(`Tenant ${tenantSlug} not found`);
  if (!commit) {
    console.log(`[rental-operations] dry run only for ${tenantSlug}; no database writes, WhatsApp messages or Pilot commands. Use --commit to run.`);
    console.log(`Optional feeds: --sync-fines --sync-salik. Safety-critical blocking additionally requires --block-overdue-fines.`);
    await pool.end();
    return;
  }

  const reminders = await sendDueReturnReminders(tenant.id, tenantSlug);
  const replies = await captureExtensionReplies(tenant.id);
  const statements = await sendDueChargeStatements(tenant.id, tenantSlug);
  const deliveredNotifications = await markDeliveredChargeNotifications(tenant.id);
  console.log(JSON.stringify({ reminders, replies, statements, deliveredNotifications }));

  if (syncFines) {
    const vehicles = await vehiclesForChargeEntry(tenant.id);
    let created = 0;
    const errors: string[] = [];
    for (const vehicle of vehicles) {
      const plate = parsePlate(vehicle.plate);
      if (!plate) continue;
      try {
        const result = await lookupFines({ sourceCode: "DXB", plateCategory: "PRIVATE", ...plate });
        for (const fine of result.fines) {
          try {
            const saved = await upsertRentalCharge(tenant.id, null, {
              vehicleId: vehicle.id,
              kind: "fine",
              externalId: fine.referenceNo,
              occurredAt: new Date(fine.ticketDate),
              amount: fine.amount,
              description: [fine.description, fine.source].filter(Boolean).join(" · "),
              source: "rta",
            });
            if (saved.created) {
              created++;
              await notifyRentalChargeById(tenant.id, tenantSlug, saved.charge.id);
            }
          } catch (error) {
            errors.push(error instanceof Error ? error.message : "Fine import failed");
          }
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "RTA lookup failed");
      }
    }
    console.log(JSON.stringify({ fines: { created, errors } }));
  }

  if (syncSalik) console.log(JSON.stringify({ salik: await syncSalikCharges(tenant.id, null) }));
  if (blockFines) console.log(JSON.stringify({ engineBlocks: await blockEligibleFineCharges(tenant.id) }));
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});

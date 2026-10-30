"use server";

import { and, desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { call, lead, user } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { canManageCRMForTenant } from "./policies";
import { requireAuth } from "@/platform/auth/authorization";
import { getTwilioClient } from "@/platform/integrations/twilio/client";
import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { normalizePhone } from "@/platform/messaging/phone";
import { ownerKeyForUser, resolveWaPhone } from "@/modules/notify/registry";

// Click-to-call from the lead card (P1 of the telephony plan). Twilio calls
// the MANAGER first (their number comes from the same per-owner env bridge
// the notify layer uses: NOTIFY_WA_PHONE_<key>), then dials the client with
// dual-channel recording. Every call lands as a `call` row immediately and is
// updated by the status webhooks — the card always shows the truth.
export async function startCall(
  tenantId: string,
  leadId: string
): Promise<{ ok: boolean; error?: string }> {
  await canManageCRMForTenant(tenantId);
  const actorId = await requireAuth();

  const [l] = await withDrizzleTenant(tenantId, (tx) =>
    tx
      .select({ phone: lead.phone, customerName: lead.customerName })
      .from(lead)
      .where(eq(lead.id, leadId))
      .limit(1)
  );
  if (!l) return { ok: false, error: "Lead not found" };
  const clientPhone = normalizePhone(l.phone);
  if (clientPhone.length < 9) return { ok: false, error: "Lead has no usable phone number" };

  const ownerKey = ownerKeyForUser(actorId);
  const managerPhone = ownerKey ? resolveWaPhone({ ownerKey }) : null;
  if (!managerPhone) {
    return { ok: false, error: "Your phone number is not configured (NOTIFY_WA_PHONE_<your key>)" };
  }

  const [t] = await db.select({ telephonyWebhookToken: tenant.telephonyWebhookToken }).from(tenant).where(eq(tenant.id, tenantId)).limit(1);
  const base = process.env.APP_BASE_URL?.trim() ?? "http://localhost:3000";
  const token = t?.telephonyWebhookToken ?? "unregistered";
  const statusCallbackUrl = `${base}/api/integrations/twilio/${token}?kind=status`;
  const recordingCallbackUrl = `${base}/api/integrations/twilio/${token}?kind=recording`;

  const client = getTwilioClient();
  const { providerCallId } = await client.startOutboundCall({
    managerPhone,
    clientPhone,
    statusCallbackUrl,
    recordingCallbackUrl,
  });

  await withDrizzleTenant(tenantId, (tx) =>
    tx.insert(call).values({
      tenantId,
      leadId,
      managerId: actorId,
      direction: "outbound",
      phone: clientPhone,
      provider: "twilio",
      providerCallId,
      status: client.mode === "mock" ? "completed" : "initiated",
      durationSec: client.mode === "mock" ? 60 : null,
    })
  );
  return { ok: true };
}

// Call history for the lead card — newest first, with the manager's name.
export async function getLeadCalls(tenantId: string, leadId: string) {
  await canManageCRMForTenant(tenantId);
  return withDrizzleTenant(tenantId, (tx) =>
    tx
      .select({
        id: call.id,
        direction: call.direction,
        status: call.status,
        durationSec: call.durationSec,
        recordingUrl: call.recordingUrl,
        createdAt: call.createdAt,
        managerName: user.name,
        qa: call.qa,
      })
      .from(call)
      .leftJoin(user, eq(call.managerId, user.id))
      .where(and(eq(call.leadId, leadId)))
      .orderBy(desc(call.createdAt))
      .limit(20)
  );
}

// Point-in-time counts for the performance report (P4 uses this too).
export async function getCallStats(tenantId: string, days: number) {
  await canManageCRMForTenant(tenantId);
  const res = (await withDrizzleTenant(tenantId, (tx) =>
    tx.execute(sql`
      SELECT u.name AS manager,
             count(*) FILTER (WHERE c.direction = 'outbound')::int AS outbound,
             count(*) FILTER (WHERE c.direction = 'inbound')::int AS inbound,
             count(*) FILTER (WHERE c.status = 'missed')::int AS missed,
             count(*) FILTER (WHERE c.status = 'completed')::int AS completed,
             coalesce(avg(c.duration_sec) FILTER (WHERE c.status = 'completed'), 0)::int AS avg_duration_sec
      FROM "call" c JOIN "user" u ON u.id = c.manager_id
      WHERE c.created_at >= now() - make_interval(days => ${days})
      GROUP BY 1 ORDER BY 6 DESC
    `)
  )) as unknown as { rows: Record<string, unknown>[] };
  return res.rows;
}

"use server";
import { sql } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { canManageFleetForTenant } from "./policies";

export type Contract = {
  id: string; kind: string; client_name: string | null; phone: string | null;
  plate: string | null; car_model: string | null; delivery_date: string | null;
  pickup_date: string | null; rent: number | null; deposit: number | null;
  salik: number | null; fine: number | null; total: number | null;
  manager: string | null; source_chat: string | null; source_ts: string | null;
};

export type ContractsResult = { available: boolean; rows: Contract[] };

/**
 * All Telegram-parsed contracts for this tenant, newest first.
 *
 * `tg_contract` is populated out-of-band by scripts/parse-tg-contracts.py and
 * has no Drizzle migration, so it may not exist on a given database. Two
 * safeguards here:
 *   1. canManageFleetForTenant(tenantId) authorizes the CALLER for the passed
 *      tenant — the `WHERE tenant_id = …` clause alone is NOT isolation,
 *      because tenantId is caller input and RLS scopes to whatever id it gets.
 *   2. A missing table resolves to `{ available:false }` instead of throwing,
 *      so the page renders an honest "not configured" state rather than
 *      spinning forever on a DB that has never run the parser.
 */
export async function getContracts(tenantId: string): Promise<ContractsResult> {
  await canManageFleetForTenant(tenantId);
  try {
    const rows = await withDrizzleTenant(tenantId, async (tx) => {
      const res = await tx.execute(sql`
        SELECT id, kind, client_name, phone, plate, car_model, delivery_date, pickup_date,
               rent, deposit, salik, fine, total, manager, source_chat, source_ts
        FROM tg_contract
        WHERE tenant_id = ${tenantId}
        ORDER BY source_ts DESC NULLS LAST LIMIT 300`);
      return res.rows as Contract[];
    });
    return { available: true, rows };
  } catch (e) {
    // 42P01 = undefined_table. Any other error is a real fault — rethrow.
    const err = e as { code?: string; message?: string } | undefined;
    if (err?.code === "42P01" || /relation .*tg_contract.* does not exist/i.test(err?.message ?? "")) {
      return { available: false, rows: [] };
    }
    throw e;
  }
}

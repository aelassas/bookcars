import type { db } from "@/platform/db/client";
import { integrationEvent, customer, lead, deal, user } from "@/platform/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { createBitrix24Client, type Bitrix24Client } from "./client";
import { assignLeadOwnersRoundRobin, notifyLeadOwner } from "@/modules/crm/lead-routing";

// The tenant-scoped Drizzle handle (a transaction) that the caller opened with
// `SET LOCAL app.tenant_id` set. All DB work MUST run on this handle so it
// stays on the connection that carries the tenant context and RLS applies.
type Db = typeof db;
import {
  mapBitrixContactToCustomer,
  mapBitrixLeadToLead,
  mapBitrixDealToDeal,
  mapBitrixDealSemanticFields,
  bitrixDealContactId,
  createStageCatalog,
  createLeadStatusCatalog,
  createDealUserFieldCatalog,
  type BitrixCrmRecord,
  type StageCatalog,
  type LeadStatusCatalog,
  type DealUserFieldCatalog,
} from "./mappings";

/**
 * Every distinct Bitrix contact id named by a deals page (CONTACT_ID, or the
 * first of CONTACT_IDS). Collected once per page so the platform-customer
 * resolution below is ONE IN query, not one lookup per deal.
 */
export function collectDealContactExternalIds(batch: BitrixCrmRecord[]): string[] {
  const ids = new Set<string>();
  for (const item of batch) {
    const cid = bitrixDealContactId(item);
    if (cid) ids.add(cid);
  }
  return [...ids];
}

/**
 * Bitrix contact external id → platform customer.id, scoped to the tenant's
 * bitrix24-sourced customers. Contacts not yet synced are simply absent from
 * the map — the deal row is written with customer_id NULL and the nightly
 * reconcile heals it once the contact lands. Empty input never queries.
 */
export async function resolveCustomerIdsByExternalId(
  db: Db,
  tenantId: string,
  externalIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (externalIds.length === 0) return map;
  const rows = await db
    .select({ id: customer.id, externalId: customer.externalId })
    .from(customer)
    .where(
      and(
        eq(customer.tenantId, tenantId),
        eq(customer.externalSource, "bitrix24"),
        inArray(customer.externalId, externalIds)
      )
    );
  for (const r of rows) {
    if (r.externalId) map.set(r.externalId, r.id);
  }
  return map;
}

// Error → message, without assuming everything thrown is an Error.
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export interface BitrixSyncResult {
  usersSynced: number;
  contactsSynced: number;
  leadsSynced: number;
  dealsSynced: number;
  companiesSynced: number;
  errors: string[];
}

export interface BitrixSyncOptions {
  modifiedSince?: string;
  syncContacts?: boolean;
  syncLeads?: boolean;
  syncDeals?: boolean;
  syncCompanies?: boolean;
  maxRecordsPerEntity?: number; // for preview / testing
  /**
   * Suppress the per-lead "hot lead" Telegram push that lead auto-routing
   * fires on INSERT. Off (notify) for the live incremental sync; ON for bulk
   * historical back-fills, where notifying an owner about hundreds of
   * months-old leads would flood their Telegram. notifyLeadOwner uses
   * force:true, so it bypasses NOTIFY_ENABLED — this flag is the only way to
   * silence it for a batch import.
   */
  suppressNotify?: boolean;
}

/**
 * Sync Bitrix users into platform user table.
 * Returns a map: Bitrix user ID → platform user ID.
 */
export async function syncBitrixUsers(db: Db, client: Bitrix24Client): Promise<Map<string, string>> {
  const userMap = new Map<string, string>();
  type BitrixUser = {
    ID: string;
    NAME: string;
    LAST_NAME: string;
    SECOND_NAME?: string;
    EMAIL: string;
    ACTIVE: boolean;
    WORK_POSITION?: string;
  };
  const bitrixUsers: BitrixUser[] = [];

  // `user.get` returns only ACTIVE users by default. Many historical deals are
  // assigned to former employees — without them ASSIGNED_BY_ID can't resolve
  // and owner_id lands NULL ("2,567 open deals without owner"). Page active
  // first, then inactive as a best-effort second pass (a portal where the
  // webhook user can't read inactive users just yields the active set).
  const seenBxIds = new Set<string>();
  const collect = (u: BitrixUser) => {
    if (u?.EMAIL && !seenBxIds.has(String(u.ID))) {
      seenBxIds.add(String(u.ID));
      bitrixUsers.push(u);
    }
  };
  for await (const u of client.listAll<BitrixUser>("user.get", {}, 50)) collect(u);
  try {
    for await (const u of client.listAll<BitrixUser>("user.get", { filter: { ACTIVE: "N" } }, 50)) collect(u);
  } catch {
    // inactive pass is best-effort; active users are already collected.
  }

  if (bitrixUsers.length === 0) return userMap;

  // Find existing users by email
  const emails = bitrixUsers.map((u) => u.EMAIL.toLowerCase().trim());
  const existingUsers = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(sql`lower(${user.email})`, emails));

  const existingByEmail = new Map(existingUsers.map((u) => [u.email.toLowerCase().trim(), u.id]));

  const toInsert: { name: string; email: string }[] = [];

  for (const bxUser of bitrixUsers) {
    const email = bxUser.EMAIL.toLowerCase().trim();
    const existingId = existingByEmail.get(email);

    if (existingId) {
      userMap.set(String(bxUser.ID), existingId);
    } else {
      const name = [bxUser.NAME, bxUser.SECOND_NAME, bxUser.LAST_NAME]
        .filter(Boolean)
        .join(" ")
        .trim();

      toInsert.push({
        name: name || bxUser.EMAIL,
        email: bxUser.EMAIL,
      });
    }
  }

  // Batch insert new users and add to map
  if (toInsert.length > 0) {
    const inserted = await db.insert(user).values(toInsert).onConflictDoNothing().returning({ id: user.id, email: user.email });
    for (const row of inserted) {
      const bxUser = bitrixUsers.find((u) => u.EMAIL.toLowerCase().trim() === row.email.toLowerCase().trim());
      if (bxUser) {
        userMap.set(String(bxUser.ID), row.id);
      }
    }
  }

  return userMap;
}

export async function syncBitrix24(
  db: Db,
  tenantId: string,
  webhookUrl: string,
  options?: BitrixSyncOptions,
  userMap?: Map<string, string>
): Promise<BitrixSyncResult> {
  const client = createBitrix24Client(webhookUrl);
  const result: BitrixSyncResult = {
    usersSynced: 0,
    contactsSynced: 0,
    leadsSynced: 0,
    dealsSynced: 0,
    companiesSynced: 0,
    errors: [],
  };

  const opts = {
    syncContacts: true,
    syncLeads: true,
    syncDeals: true,
    syncCompanies: true,
    ...options,
  };

  // User sync is best-effort — a failure here (e.g. webhook lacks `user`
  // scope, or user.get response shape differs) must NOT skip entity sync.
  // Owner FK on imported records can be null.
  if (!userMap) {
    try {
      userMap = await syncBitrixUsers(db, client);
      result.usersSynced = userMap.size;
    } catch (e) {
      result.errors.push(`user sync failed (continuing without owner map): ${errMsg(e)}`);
      userMap = new Map<string, string>();
    }
  }

  // Each entity gets its own try/catch so one bad endpoint doesn't kill
  // the rest.
  if (opts.syncContacts) {
    try {
      await syncEntity(db, client, tenantId, "crm.contact.list", result, "contacts", userMap, opts.maxRecordsPerEntity, opts.modifiedSince);
    } catch (e) {
      result.errors.push(`contacts: ${errMsg(e)}`);
    }
  }
  if (opts.syncLeads) {
    try {
      await syncEntity(db, client, tenantId, "crm.lead.list", result, "leads", userMap, opts.maxRecordsPerEntity, opts.modifiedSince, opts.suppressNotify);
    } catch (e) {
      result.errors.push(`leads: ${errMsg(e)}`);
    }
  }
  if (opts.syncDeals) {
    try {
      await syncEntity(db, client, tenantId, "crm.deal.list", result, "deals", userMap, opts.maxRecordsPerEntity, opts.modifiedSince);
    } catch (e) {
      result.errors.push(`deals: ${errMsg(e)}`);
    }
  }
  if (opts.syncCompanies) {
    try {
      await syncEntity(db, client, tenantId, "crm.company.list", result, "companies", userMap, opts.maxRecordsPerEntity, opts.modifiedSince);
    } catch (e) {
      result.errors.push(`companies: ${errMsg(e)}`);
    }
  }

  return result;
}

type EntityType = "contacts" | "leads" | "deals" | "companies";

// Singular form used in both `provider_event_id` and `normalized_type`.
// Spelled out rather than `slice(0, -1)`, which turned "companies" into
// "companie" — harmless while nothing read it, but these strings are now the
// archive's identity and are matched on during the Bitrix migration.
const ENTITY_SINGULAR: Record<EntityType, string> = {
  contacts: "contact",
  leads: "lead",
  deals: "deal",
  companies: "company",
};

async function syncEntity(
  db: Db,
  client: Bitrix24Client,
  tenantId: string,
  method: string,
  result: BitrixSyncResult,
  entityType: EntityType,
  userMap: Map<string, string>,
  maxRecords?: number,
  modifiedSince?: string,
  suppressNotify?: boolean
) {
  const batch: BitrixCrmRecord[] = [];
  let total = 0;

  // One stage catalog per entity sync — lazy, so it only ever hits Bitrix
  // (crm.dealcategory.stage.list, once per distinct category) when the deals
  // branch actually resolves a stage name. Shared across every batch below.
  const stageCatalog = createStageCatalog(client);
  // Lead-status catalog — lazy twin of the above for the leads branch
  // (crm.status.list, one call, cached), so lead.stage_detail carries the real
  // funnel name for whichever portal this sync is pulling.
  const leadStatusCatalog = createLeadStatusCatalog(client);
  // Deal user-field catalog — resolves the loss-reason / language / car-model
  // UF ids BY MEANING from THIS portal's crm.deal.userfield.list (one cached
  // read). The UF ids differ per portal; hardcoding the sales portal's would
  // silently break cardiwan/easyrent.
  const dealUfCatalog = createDealUserFieldCatalog(client);

  // Newest-first so a capped demo import lands the active pipeline
  // (not the 2017 leads). order: { DATE_CREATE: "DESC" } is honoured
  // by every crm.*.list method. WEB is a multi-field: like PHONE/EMAIL it is
  // only returned when explicitly selected (the social profile URL lives there).
  for await (const item of client.listAll<BitrixCrmRecord>(
    method,
    { select: ["*", "UF_*", "PHONE", "EMAIL", "WEB"], order: { DATE_CREATE: "DESC" }, ...(modifiedSince ? { filter: { ">DATE_MODIFY": modifiedSince } } : {}) },
    50,
  )) {
    batch.push(item);
    total++;

    if (batch.length >= 50) {
      await flushBatch(db, tenantId, batch, result, entityType, userMap, stageCatalog, leadStatusCatalog, dealUfCatalog, suppressNotify);
      batch.length = 0;
    }

    if (maxRecords && total >= maxRecords) break;
  }

  if (batch.length > 0) {
    await flushBatch(db, tenantId, batch, result, entityType, userMap, stageCatalog, leadStatusCatalog, dealUfCatalog, suppressNotify);
  }
}

async function flushBatch(
  db: Db,
  tenantId: string,
  batch: BitrixCrmRecord[],
  result: BitrixSyncResult,
  entityType: EntityType,
  userMap: Map<string, string>,
  stageCatalog: StageCatalog,
  leadStatusCatalog: LeadStatusCatalog,
  dealUfCatalog: DealUserFieldCatalog,
  suppressNotify?: boolean
) {
  // 1. Batch insert integration events
  const eventValues = batch.map((item) => ({
    tenantId,
    provider: "bitrix24",
    // Entity-qualified, because Bitrix numbers contacts, leads, deals and
    // companies in SEPARATE sequences while the archive's unique key is
    // (tenant, provider, provider_event_id) — normalized_type is not in it.
    // With a bare ID, contact #4211 and deal #4211 were one row and
    // onConflictDoNothing silently dropped whichever synced second, so the
    // archive was incomplete by construction. It is the only recovery source
    // for the Bitrix migration, so it has to be whole.
    providerEventId: `${ENTITY_SINGULAR[entityType]}:${item.ID}`,
    signatureValid: true,
    rawPayload: item,
    normalizedType: `bitrix24.${ENTITY_SINGULAR[entityType]}`,
    processingStatus: "done" as const,
    processedAt: new Date(),
  }));

  await db.insert(integrationEvent).values(eventValues).onConflictDoNothing({
    target: [integrationEvent.tenantId, integrationEvent.provider, integrationEvent.providerEventId],
  });

  // 2. Process domain records
  const externalIds = batch.map((item) => String(item.ID));

  if (entityType === "contacts") {
    const existing = await db
      .select({ id: customer.id, externalId: customer.externalId })
      .from(customer)
      .where(
        and(
          eq(customer.tenantId, tenantId),
          eq(customer.externalSource, "bitrix24"),
          inArray(customer.externalId, externalIds)
        )
      );
    const existingMap = new Map(existing.map((r) => [r.externalId, r.id]));

    const toInsert: (typeof customer.$inferInsert)[] = [];
    const toUpdate: { id: string; data: Partial<typeof customer.$inferInsert> }[] = [];

    for (const item of batch) {
      try {
        const mapped = mapBitrixContactToCustomer(item);
        const existingId = existingMap.get(mapped.externalId);
        if (existingId) {
          toUpdate.push({ id: existingId, data: { ...mapped, updatedAt: new Date() } });
        } else {
          toInsert.push({ tenantId, ...mapped, division: "rent", externalSource: "bitrix24" });
        }
        result.contactsSynced++;
      } catch (e) {
        result.errors.push(`Contact ${item.ID}: ${errMsg(e)}`);
      }
    }

    if (toInsert.length) await db.insert(customer).values(toInsert);
    for (const u of toUpdate) await db.update(customer).set(u.data).where(eq(customer.id, u.id));
  }

  if (entityType === "leads") {
    const existing = await db
      .select({ id: lead.id, externalId: lead.externalId })
      .from(lead)
      .where(
        and(
          eq(lead.tenantId, tenantId),
          eq(lead.externalSource, "bitrix24"),
          inArray(lead.externalId, externalIds)
        )
      );
    const existingMap = new Map(existing.map((r) => [r.externalId, r.id]));

    const toInsert: (typeof lead.$inferInsert)[] = [];
    const toUpdate: { id: string; data: Partial<typeof lead.$inferInsert> }[] = [];

    for (const item of batch) {
      try {
        const mapped = mapBitrixLeadToLead(item);
        // status is null for an unmapped STATUS_ID (foreign-portal UC_* codes).
        // Split it out: a brand-new lead defaults to "new" on INSERT, but an
        // EXISTING lead must never have its status overwritten by an unmapped
        // code — that was resetting cardiwan/easyrent to "new" every pass.
        const { status: mappedStatus, ...leadRest } = mapped;
        const assignedTo = item.ASSIGNED_BY_ID ? userMap.get(String(item.ASSIGNED_BY_ID)) ?? null : null;
        // Real Bitrix status NAME for this portal's lead funnel (e.g.
        // "Established Contact"). Null when the catalog can't resolve it —
        // omitted on update (never wipes a good value), like deal stageDetail.
        const stageDetail = await leadStatusCatalog.nameFor(
          item.STATUS_ID != null ? String(item.STATUS_ID) : undefined
        );
        const existingId = existingMap.get(mapped.externalId);
        if (existingId) {
          // Only overwrite the owner when Bitrix actually names one we can map.
          // Writing `null` here erased the owner that this very function's HOT
          // LANE round-robin (below) had assigned — the platform's own routing
          // undone by the next sync pass. Same discipline now applies to status.
          toUpdate.push({
            id: existingId,
            data: {
              ...leadRest,
              ...(mappedStatus ? { status: mappedStatus } : {}),
              ...(stageDetail ? { stageDetail } : {}),
              ...(assignedTo ? { assignedTo } : {}),
              updatedAt: new Date(),
            },
          });
        } else {
          toInsert.push({
            tenantId,
            ...leadRest,
            status: mappedStatus ?? "new",
            stageDetail,
            assignedTo,
            externalSource: "bitrix24",
          });
        }
        result.leadsSynced++;
      } catch (e) {
        result.errors.push(`Lead ${item.ID}: ${errMsg(e)}`);
      }
    }

    // HOT LANE — Bitrix leads with no ASSIGNED_BY_ID (or an assignee we
    // couldn't map) arrive with assignedTo=null. Auto-route those to the
    // sales pool so they don't sit unowned. Fetch the pool + current load
    // ONCE per batch (not per lead) and round-robin within the batch,
    // incrementing counts in memory — avoids N+1 against a large sync.
    const unroutedIdx: number[] = [];
    for (let i = 0; i < toInsert.length; i++) {
      if (toInsert[i].assignedTo == null) unroutedIdx.push(i);
    }
    if (unroutedIdx.length > 0) {
      const owners = await assignLeadOwnersRoundRobin(db, tenantId, unroutedIdx.length);
      unroutedIdx.forEach((idx, i) => {
        toInsert[idx].assignedTo = owners[i];
      });
    }

    if (toInsert.length) {
      const inserted = await db.insert(lead).values(toInsert).returning({
        id: lead.id,
        tenantId: lead.tenantId,
        customerName: lead.customerName,
        phone: lead.phone,
        assignedTo: lead.assignedTo,
      });
      // Best-effort notifications for newly auto-routed leads only — never
      // block/slow the sync loop on Telegram; notifyLeadOwner itself never
      // throws, and allSettled guarantees this can't reject either.
      const toNotify = suppressNotify ? [] : inserted.filter((r) => r.assignedTo);
      if (toNotify.length > 0) {
        await Promise.allSettled(toNotify.map((r) => notifyLeadOwner(r.assignedTo as string, r)));
      }
    }
    for (const u of toUpdate) await db.update(lead).set(u.data).where(eq(lead.id, u.id));
  }

  if (entityType === "deals") {
    const existing = await db
      .select({ id: deal.id, externalId: deal.externalId })
      .from(deal)
      .where(
        and(
          eq(deal.tenantId, tenantId),
          eq(deal.externalSource, "bitrix24"),
          inArray(deal.externalId, externalIds)
        )
      );
    const existingMap = new Map(existing.map((r) => [r.externalId, r.id]));

    // One resolution per batch (cached per run): which UF ids on THIS portal
    // carry the loss reason / language / car models. Empty when the portal
    // lacks them — the semantic fields are then simply absent for every deal.
    const ufResolution = await dealUfCatalog.resolution();

    // Deal → customer link (0067): Bitrix deals name a CONTACT_ID far more
    // often than a lead (easyrent: lead_id NULL on 237/237 recent deals), and
    // the platform's lead join alone leaves those deals phoneless — the AI
    // resolver's evidence gate then skips every one of them. ONE IN query for
    // the whole page; contacts not synced yet resolve to no entry, and the
    // deal keeps customer_id NULL until the nightly reconcile heals it.
    const customerByContactId = await resolveCustomerIdsByExternalId(
      db,
      tenantId,
      collectDealContactExternalIds(batch)
    );

    const toInsert: (typeof deal.$inferInsert)[] = [];
    const toUpdate: { id: string; data: Partial<typeof deal.$inferInsert> }[] = [];

    for (const item of batch) {
      try {
        const mapped = mapBitrixDealToDeal(item);
        const ownerId = item.ASSIGNED_BY_ID ? userMap.get(String(item.ASSIGNED_BY_ID)) ?? null : null;
        const contactId = bitrixDealContactId(item);
        const customerId = contactId ? customerByContactId.get(contactId) ?? null : null;
        // Exact Bitrix funnel-stage NAME, resolved from the LIVE per-category
        // stage list (cached). Uses the FRESH payload's CATEGORY_ID/STAGE_ID —
        // never a stale import snapshot — so a deal that moved categories in
        // Bitrix mirrors correctly. Null when the stage can't be resolved
        // (unknown/empty), which falls back to the coarse board.
        const stageDetail = await stageCatalog.nameFor(item.CATEGORY_ID, item.STAGE_ID);
        // The semantically rich fields the original import dropped: BitrixGPT
        // summary (COMMENTS → source_comments), loss reason / language /
        // car-model UF labels, social SOURCE_DESCRIPTION, return-customer flag
        // and the MOVED_* stage audit. Keys are ABSENT unless Bitrix carries a
        // value — the same discipline as stageDetail below, so a portal without
        // a field (or a failed userfield.list) never wipes what a previous
        // pass stored.
        const semantic = mapBitrixDealSemanticFields(item, ufResolution);
        // Name of the stage the deal came FROM, for the stageEvent audit feed.
        const previousStageDetail = item.PREVIOUS_STAGE_ID
          ? await stageCatalog.nameFor(item.CATEGORY_ID, String(item.PREVIOUS_STAGE_ID))
          : null;
        const existingId = existingMap.get(mapped.externalId);
        if (existingId) {
          // Both fields are omitted rather than written as null when we have
          // nothing to say. `ownerId: null` erased owners set here by
          // assignDeal(); `stageDetail: null` blanked the funnel column for a
          // whole batch whenever the live stage-list call failed, because
          // nameFor() swallows its errors and returns null (mappings.ts).
          // Absent means "unchanged"; null meant "wipe it".
          toUpdate.push({
            id: existingId,
            data: {
              ...mapped,
              ...semantic,
              ...(ownerId ? { ownerId } : {}),
              ...(stageDetail ? { stageDetail } : {}),
              ...(previousStageDetail ? { previousStageDetail } : {}),
              // Absent-vs-null like the neighbours: a contact we cannot
              // resolve yet must not wipe a link a previous pass set.
              ...(customerId ? { customerId } : {}),
              updatedAt: new Date(),
            },
          });
        } else {
          toInsert.push({
            tenantId,
            ...mapped,
            ...semantic,
            ownerId,
            stageDetail,
            previousStageDetail,
            customerId,
            externalSource: "bitrix24",
          });
        }
        result.dealsSynced++;
      } catch (e) {
        result.errors.push(`Deal ${item.ID}: ${errMsg(e)}`);
      }
    }

    if (toInsert.length) await db.insert(deal).values(toInsert);
    for (const u of toUpdate) await db.update(deal).set(u.data).where(eq(deal.id, u.id));
  }

  if (entityType === "companies") {
    // Namespace company customer rows as `company:${ID}`, mirroring
    // provider_event_id above. Bitrix numbers contacts and companies in SEPARATE
    // sequences, so a BARE id made contact #42 and company #42 the same customer
    // row — every company pass overwrote a real person's name with the company
    // TITLE and their source with "bitrix24". Contacts keep the bare id (no
    // migration needed): the next contact sync re-updates the bare-id row back
    // to the person, and companies now land on their own key.
    const companyExternalIds = batch.map((item) => `company:${item.ID}`);
    const existing = await db
      .select({ id: customer.id, externalId: customer.externalId })
      .from(customer)
      .where(
        and(
          eq(customer.tenantId, tenantId),
          eq(customer.externalSource, "bitrix24"),
          inArray(customer.externalId, companyExternalIds)
        )
      );
    const existingMap = new Map(existing.map((r) => [r.externalId, r.id]));

    const toInsert: (typeof customer.$inferInsert)[] = [];
    const toUpdate: { id: string; data: Partial<typeof customer.$inferInsert> }[] = [];

    for (const item of batch) {
      try {
        // Phone/email are still deliberately ABSENT (not null): a Bitrix company
        // payload carries neither, and nulling them wiped data before the key
        // was namespaced. Nothing to overwrite now, but the discipline stands.
        const mapped = {
          externalId: `company:${item.ID}`,
          name: item.TITLE || "Unknown Company",
          notes: item.COMMENTS || null,
          source: "bitrix24",
        };
        const existingId = existingMap.get(mapped.externalId);
        if (existingId) {
          toUpdate.push({ id: existingId, data: { ...mapped, updatedAt: new Date() } });
        } else {
          toInsert.push({ tenantId, ...mapped, division: "rent", externalSource: "bitrix24" });
        }
        result.companiesSynced++;
      } catch (e) {
        result.errors.push(`Company ${item.ID}: ${errMsg(e)}`);
      }
    }

    if (toInsert.length) await db.insert(customer).values(toInsert);
    for (const u of toUpdate) await db.update(customer).set(u.data).where(eq(customer.id, u.id));
  }
}

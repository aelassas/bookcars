"use server";

import { lead, deal, user, rental, lease, vehicle, tenant, tenantMember, message } from "@/platform/db/schema";
import { RMA_RENTAL_STAGES } from "./stages";
import { boardItem } from "@/platform/db/board-schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import {
  eq,
  and,
  desc,
  count,
  sql,
  or,
  ilike,
  not,
  ne,
  inArray,
  isNull,
  isNotNull,
  getTableColumns,
  type SQL,
} from "drizzle-orm";
import { canManageCRMForTenant } from "./policies";
import { canReadCRMForTenant } from "@/platform/auth/authorization";
import { requireAuth } from "@/platform/auth/authorization";
import { FUNNEL_C6_COLUMNS, COARSE_TO_DETAIL_COLUMN } from "@/platform/integrations/bitrix24/mappings";
import { effectiveIntent, isExplicit, INTENT_ORDER, INTENT_LABELS, type Intent } from "./intent";
import { canonicalName } from "@/modules/monitor/people";

// Resolve the owner filter shared by the kanban queries: `ownerIds` (a chip's
// grouped ids — e.g. Moe = login row + "Mohammad Imad" Bitrix row) wins;
// `ownerId: "me"` resolves to the session user; undefined = whole tenant.
async function resolveOwners(opts?: { ownerId?: string; ownerIds?: string[] }): Promise<string[] | undefined> {
  if (opts?.ownerIds?.length) return opts.ownerIds;
  if (!opts?.ownerId) return undefined;
  return [opts.ownerId === "me" ? await requireAuth() : opts.ownerId];
}

/**
 * Person-filter chips for the pipeline: the tenant's CURRENT sales team
 * (members with a sales-ish role who own open deals), grouped by canonical
 * name so duplicate accounts collapse into one chip (Moe = "Moe" +
 * "Mohammad Imad", Firuz = "Firuz" + "FIRUZ KHUSAINOV"). Ex-staff Bitrix
 * accounts aren't members, so their deals stay visible under "All" only —
 * the owner's model: the live stream belongs to the named three.
 */
export type DealOwnerChip = { name: string; ids: string[]; deals: number };

/** Same chips, but for LEADS (lead.assigned_to) — the Leads tab person filter. */
export async function getLeadOwnerChips(tenantId: string): Promise<DealOwnerChip[]> {
  await canManageCRMForTenant(tenantId);
  const rows = await withDrizzleTenant(tenantId, (tx) =>
    tx
      .select({ id: user.id, name: user.name, deals: sql<number>`count(*)::int` })
      .from(lead)
      .innerJoin(user, eq(user.id, lead.assignedTo))
      .innerJoin(
        tenantMember,
        and(eq(tenantMember.userId, user.id), eq(tenantMember.tenantId, lead.tenantId))
      )
      .where(
        sql`${tenantMember.roles} && ARRAY['sales','sales_manager','general_manager','tenant_admin']::text[]`
      )
      .groupBy(user.id, user.name)
  );
  const byName = new Map<string, { ids: string[]; deals: number }>();
  for (const r of rows) {
    const canon = canonicalName(r.name);
    if (!canon) continue;
    const g = byName.get(canon) ?? { ids: [], deals: 0 };
    g.ids.push(r.id);
    g.deals += r.deals;
    byName.set(canon, g);
  }
  return [...byName.entries()]
    .map(([name, g]) => ({ name, ids: g.ids, deals: g.deals }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDealOwnerChips(tenantId: string): Promise<DealOwnerChip[]> {
  await canManageCRMForTenant(tenantId);
  const rows = await withDrizzleTenant(tenantId, (tx) =>
    tx
      .select({ id: user.id, name: user.name, deals: sql<number>`count(*)::int` })
      .from(deal)
      .innerJoin(user, eq(user.id, deal.ownerId))
      .innerJoin(
        tenantMember,
        and(eq(tenantMember.userId, user.id), eq(tenantMember.tenantId, deal.tenantId))
      )
      .where(
        and(
          eq(deal.status, "open"),
          sql`${tenantMember.roles} && ARRAY['sales','sales_manager','general_manager','tenant_admin']::text[]`
        )
      )
      .groupBy(user.id, user.name)
  );
  const byName = new Map<string, { ids: string[]; deals: number }>();
  for (const r of rows) {
    const canon = canonicalName(r.name);
    if (!canon) continue;
    const g = byName.get(canon) ?? { ids: [], deals: 0 };
    g.ids.push(r.id);
    g.deals += r.deals;
    byName.set(canon, g);
  }
  return [...byName.entries()]
    .map(([name, g]) => ({ name, ids: g.ids, deals: g.deals }))
    .sort((a, b) => a.name.localeCompare(b.name));
}


// ─── Live / Archive scope (display-level only — nothing is written) ────────
// take-auto carries its full Bitrix24 history (~92k deals / ~59k leads),
// bulk-imported 2026-07-06 … 2026-07-10. "live" hides that mass behind pure
// query filters; "archive" shows only it; "all" shows everything. Reversible.
export type CrmScope = "live" | "archive" | "all";
export type DealTypeLens = "lease" | "rent" | "purchase" | "all";

const LIVE_CUTOFF = "2026-07-11";

function liveDealCond(): SQL {
  return or(
    sql`${deal.createdAt} >= ${LIVE_CUTOFF}`,
    and(eq(deal.status, "open"), inArray(deal.stage, ["quote", "contract", "tars", "handover"])),
    and(eq(deal.status, "open"), eq(deal.stage, "inquiry"), ne(deal.type, "rent"))
  ) as SQL;
}
function dealScopeCond(scope: CrmScope): SQL | undefined {
  if (scope === "live") return liveDealCond();
  if (scope === "archive") return not(liveDealCond());
  return undefined;
}
function liveLeadCond(): SQL {
  return or(
    inArray(lead.status, ["contacted", "qualified"]),
    sql`${lead.createdAt} >= ${LIVE_CUTOFF}`
  ) as SQL;
}
function leadScopeCond(scope: CrmScope): SQL | undefined {
  if (scope === "live") return liveLeadCond();
  if (scope === "archive") return not(liveLeadCond());
  return undefined;
}
function dealTypeCond(dealType?: DealTypeLens): SQL | undefined {
  return dealType && dealType !== "all" ? eq(deal.type, dealType) : undefined;
}

// ─── Kanban "hot list" window ──────────────────────────────────────────────
// The pipeline board (kanban) shows only deals TOUCHED recently —
// last_activity_at within this rolling window. This is deliberately DISTINCT
// from CrmScope above (which the funnel / deals-list use, keyed on import date
// + stage): for a bulk-imported Bitrix deal, created_at is the *import*
// timestamp, so every one of the ~25k archived inquiries looks brand new.
// Only last_activity_at separates the ~200 genuinely-live deals from that mass.
const KANBAN_LIVE_WINDOW_DAYS = 90;
export type KanbanScope = "live" | "archive";

export type KanbanDeal = {
  id: string;
  ref: string;
  type: "rent" | "lease" | "purchase";
  stage: string;
  status: string;
  value: number | null;
  /** Muted, never-summed estimate — set only when `value` is NULL/0. */
  estValue: number | null;
  balanceDue: number;
  leadId: string | null;
  notes: string | null;
  lastActivityAt: Date | string | null;
  // ── Card-minimalism fields (Azat-simple presentation) ───────────────────
  /** Customer name from the linked lead — the card's headline. */
  customerName: string | null;
  phone: string | null;
  /** Car and rental window the customer named in chat, not an invented fleet match. */
  requestedCar: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  /** Assigned salesperson's name (for owner initials); null when unassigned. */
  ownerName: string | null;
  /** "Make Model" of any vehicle linked via a rental/lease; null otherwise. */
  vehicleLabel: string | null;
  /** One-line AI note from a name-matched board_item summary; null otherwise. */
  aiNote: string | null;
  /** Exact Bitrix funnel-stage name (e.g. "КП отправлено"); null for native deals. */
  stageDetail: string | null;
};

export type KanbanStageSummary = {
  stage: string;
  liveCount: number;
  archiveCount: number;
  /** Real values only — estimates are excluded from every total. */
  liveTotalValue: number;
};

// Days used when turning a linked vehicle's daily rate into a weekly estimate.
const ESTIMATE_DAYS = 7;

// Per-source floor estimate (weekly AED), keyed by deal.external_source.
// Intentionally EMPTY: the only external sources present are CRM origins
// (bitrix24 / kaiten), which say nothing about price — so we refuse to invent
// a number from them. Kept as a typed hook so a defensible per-source floor
// can be dropped in later without touching call sites.
const WEEKLY_ESTIMATE_BY_SOURCE: Record<string, number> = {};

function kanbanCutoffISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - KANBAN_LIVE_WINDOW_DAYS);
  return d.toISOString();
}

// "Live" for the board = touched within the window, OR a platform-native deal
// (no external source) not yet stamped with an activity time. Imported archive
// rows carry external_source='bitrix24' + an old last_activity_at, so they can
// never leak into the live set.
function kanbanLiveCond(cutoffISO: string): SQL {
  // Every branch is guarded so the result is strictly TRUE/FALSE (never NULL) —
  // otherwise a NULL last_activity_at would fall out of BOTH the live and the
  // `NOT(live)` FILTER counts in getKanbanSummary.
  return or(
    and(isNotNull(deal.lastActivityAt), sql`${deal.lastActivityAt} >= ${cutoffISO}`),
    and(
      isNull(deal.lastActivityAt),
      isNull(deal.externalSource),
      sql`${deal.createdAt} >= ${cutoffISO}`
    )
  ) as SQL;
}

// ─── HOT LANE — unowned new leads surfaced by wait-time ────────────────────
// "Hot" = status='new' AND assigned_to IS NULL. hotFirst puts those rows
// first (so a filtered/paginated list never buries them), oldest createdAt
// on top within the hot lane (longest-waiting = most urgent), everything
// else keeps the normal newest-first order.
const HOT_LEAD_COND = sql`(${lead.status} = 'new' AND ${lead.assignedTo} IS NULL)`;
const HOT_LEAD_ORDER = sql`
  ${HOT_LEAD_COND} DESC,
  CASE WHEN ${HOT_LEAD_COND} THEN ${lead.createdAt} END ASC NULLS LAST,
  ${lead.createdAt} DESC
`;

export async function getLeads(tenantId: string) {
  await canManageCRMForTenant(tenantId);
  return withDrizzleTenant(tenantId, (tx) => tx.select().from(lead).orderBy(desc(lead.createdAt)));
}

export async function getLeadById(tenantId: string, leadId: string) {
  // Non-member → null → the page renders a clean 404, not a Forbidden error.
  if (!(await canReadCRMForTenant(tenantId))) return null;
  return withDrizzleTenant(tenantId, async (tx) => {
    const [row] = await tx.select().from(lead).where(eq(lead.id, leadId)).limit(1);
    return row ?? null;
  });
}

export async function getLeadCountsByStatus(tenantId: string, scope: CrmScope = "live") {
  await canManageCRMForTenant(tenantId);
  return withDrizzleTenant(tenantId, (tx) =>
    tx.select({ status: lead.status, count: count() }).from(lead).where(leadScopeCond(scope)).groupBy(lead.status)
  );
}

export async function getDeals(tenantId: string, filters?: { status?: string; stage?: string }) {
  await canManageCRMForTenant(tenantId);
  return withDrizzleTenant(tenantId, (tx) => {
    const conds: SQL[] = [];
    if (filters?.status) conds.push(eq(deal.status, filters.status));
    if (filters?.stage) conds.push(eq(deal.stage, filters.stage));
    return tx.select().from(deal).where(conds.length ? and(...conds) : undefined).orderBy(desc(deal.createdAt));
  });
}

export async function getDealById(tenantId: string, dealId: string) {
  if (!(await canReadCRMForTenant(tenantId))) return null;
  return withDrizzleTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        deal: getTableColumns(deal),
        // The car-finder attachment, if any — resolved to a display label so
        // the deal page and kanban card can show "offering plate 46423 EE".
        vehicle: {
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          plate: vehicle.plate,
          status: vehicle.status,
        },
        // Responsible person's display name (the deal card shows the human,
        // not a UUID).
        ownerName: user.name,
      })
      .from(deal)
      .leftJoin(vehicle, eq(deal.vehicleId, vehicle.id))
      .leftJoin(user, eq(deal.ownerId, user.id))
      .where(eq(deal.id, dealId))
      .limit(1);
    if (!row) return null;
    return { ...row.deal, vehicle: row.vehicle?.id ? row.vehicle : null, ownerName: row.ownerName ?? null };
  });
}

export async function getDealPipelineSummary(
  tenantId: string,
  opts?: { scope?: CrmScope; dealType?: DealTypeLens }
) {
  await canManageCRMForTenant(tenantId);
  const scope = opts?.scope ?? "live";
  const conds: SQL[] = [eq(deal.status, "open")];
  const sc = dealScopeCond(scope);
  if (sc) conds.push(sc);
  const tc = dealTypeCond(opts?.dealType);
  if (tc) conds.push(tc);
  return withDrizzleTenant(tenantId, (tx) =>
    tx
      .select({ stage: deal.stage, count: count(), totalValue: sql<number>`COALESCE(SUM(${deal.value}), 0)` })
      .from(deal)
      .where(and(...conds))
      .groupBy(deal.stage)
  );
}

export async function getCrmDashboardStats(
  tenantId: string,
  opts?: { scope?: CrmScope; dealType?: DealTypeLens }
) {
  await canManageCRMForTenant(tenantId);
  const scope = opts?.scope ?? "live";
  const tc = dealTypeCond(opts?.dealType);
  const openConds: SQL[] = [eq(deal.status, "open")];
  const dc = dealScopeCond(scope);
  if (dc) openConds.push(dc);
  if (tc) openConds.push(tc);
  const closedConds: SQL[] = [];
  if (dc) closedConds.push(dc);
  if (tc) closedConds.push(tc);
  return withDrizzleTenant(tenantId, async (tx) => {
    const [{ newLeads }] = await tx.select({ newLeads: count() }).from(lead).where(and(eq(lead.status, "new"), leadScopeCond(scope)));
    const [{ openDeals }] = await tx.select({ openDeals: count() }).from(deal).where(and(...openConds));
    const [{ pipelineValue }] = await tx.select({ pipelineValue: sql<number>`COALESCE(SUM(${deal.value}), 0)` }).from(deal).where(and(...openConds));
    const [{ won }] = await tx.select({ won: count() }).from(deal).where(and(eq(deal.status, "won"), ...closedConds));
    const [{ closed }] = await tx.select({ closed: count() }).from(deal).where(and(sql`${deal.status} IN ('won', 'lost')`, ...closedConds));
    const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0;
    return { newLeads, openDeals, pipelineValue, winRate };
  });
}

export async function getDealsPaginated(
  tenantId: string,
  opts: { page: number; pageSize: number; status?: string; stage?: string; ownerId?: string; scope?: CrmScope; dealType?: DealTypeLens }
) {
  await canManageCRMForTenant(tenantId);
  const { page, pageSize, status, stage, ownerId, scope = "live", dealType } = opts;
  const offset = (page - 1) * pageSize;
  return withDrizzleTenant(tenantId, async (tx) => {
    const conds: SQL[] = [];
    if (status) conds.push(eq(deal.status, status));
    if (stage) conds.push(eq(deal.stage, stage));
    if (ownerId) conds.push(eq(deal.ownerId, ownerId));
    const sc = dealScopeCond(scope);
    if (sc) conds.push(sc);
    const tc = dealTypeCond(dealType);
    if (tc) conds.push(tc);
    const where = conds.length ? and(...conds) : undefined;
    const [{ total }] = await tx.select({ total: count() }).from(deal).where(where);
    const rows = await tx.select().from(deal).where(where).orderBy(desc(deal.createdAt)).limit(pageSize).offset(offset);
    return { rows, total };
  });
}

export async function getLeadsPaginated(
  tenantId: string,
  opts: {
    page: number;
    pageSize: number;
    search?: string;
    scope?: CrmScope;
    /** HOT LANE — unassigned+new leads first, oldest createdAt on top. */
    hotFirst?: boolean;
    /** Filter toggle: only status='new' AND assigned_to IS NULL. */
    onlyUnassigned?: boolean;
    /** Person chip — restrict to these owner ids (grouped duplicate accounts). */
    ownerIds?: string[];
  }
) {
  await canManageCRMForTenant(tenantId);
  const { page, pageSize, search, scope = "live", hotFirst = false, onlyUnassigned = false, ownerIds } = opts;
  const offset = (page - 1) * pageSize;
  return withDrizzleTenant(tenantId, async (tx) => {
    const searchCond = search ? or(ilike(lead.customerName, `%${search}%`), ilike(lead.phone, `%${search}%`)) : undefined;
    const unassignedCond = onlyUnassigned ? and(eq(lead.status, "new"), isNull(lead.assignedTo)) : undefined;
    const ownerCond = ownerIds?.length ? inArray(lead.assignedTo, ownerIds) : undefined;
    const where = and(searchCond, leadScopeCond(scope), unassignedCond, ownerCond);
    const [{ total }] = await tx.select({ total: count() }).from(lead).where(where);
    const rows = await tx
      .select({ ...getTableColumns(lead), ownerName: user.name })
      .from(lead)
      .leftJoin(user, eq(user.id, lead.assignedTo))
      .where(where)
      .orderBy(hotFirst ? HOT_LEAD_ORDER : desc(lead.createdAt))
      .limit(pageSize)
      .offset(offset);
    return { rows, total };
  });
}

export async function getCrmFunnel(
  tenantId: string,
  opts?: { ownerId?: string; scope?: CrmScope; dealType?: DealTypeLens }
) {
  await canManageCRMForTenant(tenantId);
  const { ownerId, scope = "live", dealType } = opts ?? {};
  const owner = ownerId === "me" ? await requireAuth() : ownerId;
  return withDrizzleTenant(tenantId, async (tx) => {
    const leadConds: SQL[] = [];
    if (owner) leadConds.push(eq(lead.assignedTo, owner));
    const lsc = leadScopeCond(scope);
    if (lsc) leadConds.push(lsc);
    const [leadRow] = await tx
      .select({
        newLeads: sql<number>`(COUNT(*) FILTER (WHERE ${lead.status} = 'new'))::int`,
        qualified: sql<number>`(COUNT(*) FILTER (WHERE ${lead.status} IN ('contacted', 'qualified')))::int`,
      })
      .from(lead)
      .where(leadConds.length ? and(...leadConds) : undefined);
    const dealConds: SQL[] = [];
    if (owner) dealConds.push(eq(deal.ownerId, owner));
    const dsc = dealScopeCond(scope);
    if (dsc) dealConds.push(dsc);
    const tc = dealTypeCond(dealType);
    if (tc) dealConds.push(tc);
    const [dealRow] = await tx
      .select({
        offersSent: sql<number>`(COUNT(*) FILTER (WHERE ${deal.stage} = 'quote'))::int`,
        won: sql<number>`(COUNT(*) FILTER (WHERE ${deal.status} = 'won'))::int`,
        lost: sql<number>`(COUNT(*) FILTER (WHERE ${deal.status} = 'lost'))::int`,
      })
      .from(deal)
      .where(dealConds.length ? and(...dealConds) : undefined);
    let archivedLeads = 0, archivedDeals = 0;
    if (scope === "live") {
      const [la] = await tx.select({ n: count() }).from(lead).where(not(liveLeadCond()));
      const [da] = await tx.select({ n: count() }).from(deal).where(not(liveDealCond()));
      archivedLeads = la?.n ?? 0;
      archivedDeals = da?.n ?? 0;
    }
    const newLeads = leadRow?.newLeads ?? 0;
    const qualified = leadRow?.qualified ?? 0;
    const offersSent = dealRow?.offersSent ?? 0;
    const won = dealRow?.won ?? 0;
    const lost = dealRow?.lost ?? 0;
    const closed = won + lost;
    const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0;
    return { newLeads, qualified, offersSent, won, lost, winRate, archivedLeads, archivedDeals };
  });
}

// ─── Kanban board (pipeline) ───────────────────────────────────────────────
// Per-stage live/archive counts + real-only value totals. Estimates are never
// summed here. Scope is the activity window (kanbanLiveCond), NOT CrmScope, so
// the funnel/deals-list math is untouched.
//
// The board has two column layouts:
//   • "detail"  — Azat's exact Bitrix category-6 funnel (8 open columns), used
//                 whenever the scope holds any Bitrix deal with a stage_detail.
//                 Cards group by stage_detail; a null/foreign-funnel deal is
//                 bucketed by its coarse stage so nothing vanishes.
//   • "coarse"  — RMA's six-stage rental flow, or the legacy five-stage board
//                 for other platform-native tenants.
export type KanbanMode = "detail" | "coarse";
// `coarse` is the legacy stage a column maps into — used as the CreateDealModal
// default and to keep won/lost math intact. In coarse mode it equals the key.
export type KanbanColumn = { key: string; label: string; coarse: string };
export type KanbanBoardConfig = { mode: KanbanMode; columns: KanbanColumn[] };

const COARSE_COLUMN_LABELS: Record<string, string> = {
  inquiry: "New inquiry",
  quote: "Needs assessment",
  contract: "Quote sent",
  handover: "Nurturing",
  closed: "Meeting scheduled",
};
const COARSE_COLUMN_KEYS = ["inquiry", "quote", "contract", "handover", "closed"] as const;

// SQL that maps a deal row → its detail-board column KEY (a category-6 stage
// name). Built from the shared constants so board columns and this expression
// can never drift. Exact stage_detail match wins; otherwise the coarse stage
// picks a bucket (so platform-native / other-funnel deals still show).
function detailColumnExpr(): SQL {
  const whens = FUNNEL_C6_COLUMNS.map(
    (c) => sql`WHEN ${deal.stageDetail} = ${c.name} THEN ${c.name}`
  );
  const coarseWhens = Object.entries(COARSE_TO_DETAIL_COLUMN).map(
    ([coarse, col]) => sql`WHEN ${deal.stage} = ${coarse} THEN ${col}`
  );
  return sql`CASE ${sql.join(whens, sql` `)} ELSE (CASE ${sql.join(
    coarseWhens,
    sql` `
  )} ELSE ${COARSE_TO_DETAIL_COLUMN.inquiry} END) END`;
}

// The GROUP BY / column key expression for a given mode.
function columnKeyExpr(mode: KanbanMode): SQL {
  return mode === "detail" ? detailColumnExpr() : (sql`${deal.stage}` as SQL);
}
// WHERE condition selecting one column's deals.
function columnCond(mode: KanbanMode, key: string): SQL {
  return mode === "detail" ? (sql`(${detailColumnExpr()}) = ${key}` as SQL) : eq(deal.stage, key);
}

function kanbanVisibleCond(): SQL {
  return or(eq(deal.status, "open"), eq(deal.stage, "closed")) as SQL;
}

// Decide the board layout + ordered columns for this tenant/owner scope.
export async function getKanbanBoardConfig(
  tenantId: string,
  opts?: { ownerId?: string; ownerIds?: string[] }
): Promise<KanbanBoardConfig> {
  await canManageCRMForTenant(tenantId);
  const owners = await resolveOwners(opts);
  const { tenantSlug, hasDetail } = await withDrizzleTenant(tenantId, async (tx) => {
    const [t] = await tx.select({ slug: tenant.slug }).from(tenant).where(eq(tenant.id, tenantId)).limit(1);
    if (t?.slug === "rma") return { tenantSlug: t.slug, hasDetail: false };
    const conds: SQL[] = [eq(deal.status, "open"), isNotNull(deal.stageDetail)];
    if (owners) conds.push(inArray(deal.ownerId, owners));
    const [{ n }] = await tx.select({ n: count() }).from(deal).where(and(...conds));
    return { tenantSlug: t?.slug, hasDetail: (n ?? 0) > 0 };
  });
  if (tenantSlug === "rma") {
    return {
      mode: "coarse",
      columns: RMA_RENTAL_STAGES.map(({ key, label }) => ({ key, label, coarse: key })),
    };
  }
  if (hasDetail) {
    return {
      mode: "detail",
      columns: FUNNEL_C6_COLUMNS.map((c) => ({ key: c.name, label: c.label, coarse: c.coarse })),
    };
  }
  return {
    mode: "coarse",
    columns: COARSE_COLUMN_KEYS.map((k) => ({ key: k, label: COARSE_COLUMN_LABELS[k] ?? k, coarse: k })),
  };
}

type KanbanAttention = "new" | "stale";

type KanbanFilters = {
  ownerId?: string;
  ownerIds?: string[];
  mode?: KanbanMode;
  query?: string;
  attention?: KanbanAttention;
};

function kanbanFilterCond(query?: string, attention?: KanbanAttention): SQL | undefined {
  const conds: SQL[] = [];
  const q = query?.trim();
  if (q) {
    const pattern = `%${q}%`;
    conds.push(or(
      ilike(deal.ref, pattern),
      ilike(lead.customerName, pattern),
      ilike(lead.phone, pattern),
      ilike(deal.vouchedCar, pattern),
      ilike(deal.notes, pattern),
    )!);
  }
  if (attention === "new") conds.push(eq(deal.stage, "inquiry"));
  if (attention === "stale") {
    conds.push(ne(deal.stage, "inquiry"));
    conds.push(sql`(${deal.lastActivityAt} IS NULL OR ${deal.lastActivityAt} < now() - interval '3 days')`);
  }
  return conds.length > 0 ? and(...conds) : undefined;
}

export async function getKanbanSummary(
  tenantId: string,
  opts?: KanbanFilters
): Promise<KanbanStageSummary[]> {
  await canManageCRMForTenant(tenantId);
  const liveCond = kanbanLiveCond(kanbanCutoffISO());
  const mode: KanbanMode = opts?.mode ?? "coarse";
  const keyExpr = columnKeyExpr(mode);
  // "My line" — a salesperson sees only their own deals. "me" resolves to the
  // signed-in user; concrete ids filter to those owners; undefined = everyone.
  const owners = await resolveOwners(opts);
  const conds: SQL[] = [kanbanVisibleCond()];
  if (owners) conds.push(inArray(deal.ownerId, owners));
  const filter = kanbanFilterCond(opts?.query, opts?.attention);
  if (filter) conds.push(filter);
  return withDrizzleTenant(tenantId, (tx) =>
    tx
      .select({
        stage: sql<string>`${keyExpr}`,
        liveCount: sql<number>`(COUNT(*) FILTER (WHERE ${liveCond}))::int`,
        archiveCount: sql<number>`(COUNT(*) FILTER (WHERE NOT (${liveCond})))::int`,
        liveTotalValue: sql<number>`COALESCE(SUM(${deal.value}) FILTER (WHERE ${liveCond}), 0)::bigint`,
      })
      .from(deal)
      .leftJoin(lead, eq(lead.id, deal.leadId))
      .where(and(...conds))
      // Parameterized CASE gets different placeholder numbers in SELECT vs
      // GROUP BY, so Postgres can't prove they match and rejects with
      // "stage_detail must appear in GROUP BY". Grouping by the two source
      // columns is equivalent (the CASE maps 1:1) and always valid.
      .groupBy(...(mode === "detail" ? [deal.stageDetail, deal.stage] : [keyExpr]))
  );
}

// ── Card enrichment (shared by the kanban board + the coordinator inbox) ───
// For a page of deal rows, resolve three presentation-only extras in a bounded
// number of queries (never per-row): a value ESTIMATE, a linked VEHICLE label,
// and a one-line AI NOTE. Everything here is display sugar — nothing is summed,
// nothing is invented.
type DealRowForEnrich = {
  id: string;
  value: number | null;
  leadId: string | null;
  customerName: string | null;
  externalSource: string | null;
};
type DealEnrichment = {
  estValue: number | null;
  vehicleLabel: string | null;
  aiNote: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

async function enrichDeals(
  tx: Parameters<Parameters<typeof withDrizzleTenant>[1]>[0],
  rows: DealRowForEnrich[]
): Promise<Map<string, DealEnrichment>> {
  const out = new Map<string, DealEnrichment>();
  for (const r of rows) out.set(r.id, { estValue: null, vehicleLabel: null, aiNote: null, dateFrom: null, dateTo: null });
  if (rows.length === 0) return out;

  // ── Vehicle + daily rate via any rental/lease bound to the deal (or its
  // lead thread, rental only). First match wins; rate × 7 = weekly estimate. ─
  const dealIds = rows.map((r) => r.id);
  const leadIds = rows.map((r) => r.leadId).filter((x): x is string => !!x);
  const vehByDeal = new Map<string, { label: string; rate: number }>();
  const vehByLead = new Map<string, { label: string; rate: number }>();
  for (const tbl of [rental, lease] as const) {
    // lease has no lead_id column — lead-thread matching exists only on rental.
    const hasLeadCol = tbl === rental;
    const idConds: SQL[] = [inArray(tbl.dealId, dealIds)];
    if (hasLeadCol && leadIds.length) idConds.push(inArray(rental.leadId, leadIds));
    const links = await tx
      .select({
        dealId: tbl.dealId,
        leadId: hasLeadCol ? rental.leadId : sql<string | null>`null`,
        rate: vehicle.dailyRate,
        make: vehicle.make,
        model: vehicle.model,
      })
      .from(tbl)
      .innerJoin(vehicle, eq(vehicle.id, tbl.vehicleId))
      .where(or(...idConds));
    for (const l of links) {
      const label = `${l.make ?? ""} ${l.model ?? ""}`.trim();
      const rate = l.rate ?? 0;
      if (l.dealId && !vehByDeal.has(l.dealId)) vehByDeal.set(l.dealId, { label, rate });
      if (l.leadId && !vehByLead.has(l.leadId)) vehByLead.set(l.leadId, { label, rate });
    }
  }

  const datesByLead = new Map<string, { from: string | null; to: string | null }>();
  if (leadIds.length > 0) {
    const dateRows = await tx
      .select({
        leadId: message.relatedEntityId,
        from: message.extractedDateFrom,
        to: message.extractedDateTo,
      })
      .from(message)
      .where(and(
        eq(message.relatedEntityType, "lead"),
        inArray(message.relatedEntityId, leadIds),
        or(isNotNull(message.extractedDateFrom), isNotNull(message.extractedDateTo))
      ))
      .orderBy(desc(message.createdAt));
    for (const d of dateRows) {
      if (d.leadId && !datesByLead.has(d.leadId)) datesByLead.set(d.leadId, { from: d.from, to: d.to });
    }
  }

  // ── AI note: cheapest defensible link from a deal to an AI-read thread is a
  // case-insensitive customer-NAME match against board_item (the classifier's
  // per-thread summary). Real, but coarse — names collide and threads with a
  // different display name won't match. A phone/JID-based link is the proper
  // follow-up; until then only the name-matched subset carries a note, and the
  // rest are simply left blank (never invented). ────────────────────────────
  const names = Array.from(
    new Set(
      rows
        .map((r) => r.customerName?.trim().toLowerCase())
        .filter((x): x is string => !!x)
    )
  );
  const aiByName = new Map<string, string>();
  if (names.length > 0) {
    const notes = await tx
      .select({ name: boardItem.customerName, summary: boardItem.summary, createdAt: boardItem.createdAt })
      .from(boardItem)
      .where(and(inArray(sql`lower(${boardItem.customerName})`, names), ne(boardItem.summary, "")))
      .orderBy(desc(boardItem.createdAt));
    for (const n of notes) {
      const k = n.name?.trim().toLowerCase();
      if (k && n.summary && !aiByName.has(k)) aiByName.set(k, n.summary);
    }
  }

  for (const r of rows) {
    const e = out.get(r.id)!;
    const veh = vehByDeal.get(r.id) ?? (r.leadId ? vehByLead.get(r.leadId) : undefined);
    if (veh) {
      e.vehicleLabel = veh.label || null;
      if ((r.value == null || r.value === 0) && veh.rate > 0) e.estValue = veh.rate * ESTIMATE_DAYS;
    }
    if (e.estValue == null && (r.value == null || r.value === 0)) {
      const weekly = r.externalSource ? WEEKLY_ESTIMATE_BY_SOURCE[r.externalSource] : undefined;
      if (weekly && weekly > 0) e.estValue = weekly;
    }
    const nk = r.customerName?.trim().toLowerCase();
    if (nk && aiByName.has(nk)) e.aiNote = aiByName.get(nk)!;
    if (r.leadId) {
      const dates = datesByLead.get(r.leadId);
      e.dateFrom = dates?.from ?? null;
      e.dateTo = dates?.to ?? null;
    }
  }
  return out;
}

// The columns every card-bearing query selects, joined to the lead (customer
// name) and the owner (name → initials). Kept as one object so the kanban board
// and the coordinator inbox render identical cards.
const dealCardCols = {
  id: deal.id,
  ref: deal.ref,
  type: deal.type,
  stage: deal.stage,
  status: deal.status,
  value: deal.value,
  balanceDue: deal.balanceDue,
  leadId: deal.leadId,
  notes: deal.notes,
  externalSource: deal.externalSource,
  lastActivityAt: deal.lastActivityAt,
  stageDetail: deal.stageDetail,
  customerName: lead.customerName,
  phone: lead.phone,
  requestedCar: deal.vouchedCar,
  ownerName: user.name,
} as const;

// Shape a raw joined row + its enrichment into a KanbanDeal card.
function toKanbanDeal(
  r: {
    id: string;
    ref: string;
    type: string;
    stage: string;
    status: string;
    value: number | null;
    balanceDue: number;
    leadId: string | null;
    notes: string | null;
    lastActivityAt: Date | string | null;
    stageDetail: string | null;
    customerName: string | null;
    phone: string | null;
    requestedCar: string | null;
    ownerName: string | null;
  },
  enr: DealEnrichment | undefined
): KanbanDeal {
  return {
    id: r.id,
    ref: r.ref,
    type: r.type as KanbanDeal["type"],
    stage: r.stage,
    status: r.status,
    value: r.value,
    balanceDue: r.balanceDue,
    leadId: r.leadId,
    notes: r.notes,
    lastActivityAt: r.lastActivityAt,
    stageDetail: r.stageDetail,
    customerName: r.customerName,
    phone: r.phone,
    requestedCar: r.requestedCar,
    dateFrom: enr?.dateFrom ?? null,
    dateTo: enr?.dateTo ?? null,
    ownerName: r.ownerName,
    estValue: r.value == null || r.value === 0 ? enr?.estValue ?? null : null,
    vehicleLabel: enr?.vehicleLabel ?? null,
    aiNote: enr?.aiNote ?? null,
  };
}

// One stage's cards, hottest-first (last_activity_at DESC), paginated so the
// inquiry stage never loads its ~25k archive at once.
export async function getKanbanStageDeals(
  tenantId: string,
  opts: { stage: string; scope: KanbanScope; page: number; pageSize: number } & KanbanFilters
): Promise<{ rows: KanbanDeal[]; total: number }> {
  await canManageCRMForTenant(tenantId);
  const { stage, scope, page, pageSize } = opts;
  const mode: KanbanMode = opts.mode ?? "coarse";
  const owners = await resolveOwners(opts);
  const liveCond = kanbanLiveCond(kanbanCutoffISO());
  const scopeCond = scope === "live" ? liveCond : (not(liveCond) as SQL);
  const offset = (page - 1) * pageSize;
  return withDrizzleTenant(tenantId, async (tx) => {
    const where = and(
      kanbanVisibleCond(),
      columnCond(mode, stage),
      scopeCond,
      owners ? inArray(deal.ownerId, owners) : undefined,
      kanbanFilterCond(opts.query, opts.attention),
    );
    const [{ total }] = await tx
      .select({ total: count() })
      .from(deal)
      .leftJoin(lead, eq(lead.id, deal.leadId))
      .where(where);
    const rows = await tx
      .select(dealCardCols)
      .from(deal)
      .leftJoin(lead, eq(lead.id, deal.leadId))
      .leftJoin(user, eq(user.id, deal.ownerId))
      .where(where)
      // Hottest on top; deals with no activity time sink to the bottom.
      .orderBy(sql`${deal.lastActivityAt} DESC NULLS LAST`, desc(deal.createdAt))
      .limit(pageSize)
      .offset(offset);

    const enr = await enrichDeals(tx, rows);
    return { rows: rows.map((r) => toKanbanDeal(r, enr.get(r.id))), total };
  });
}

// ─── Coordinator inbox — unassigned live deals awaiting a salesperson ───────
// The "girls" (lead coordinators/validators) work this queue: every live, open
// deal with no owner, newest activity first. One assign sets deal.owner_id (and
// the linked lead's assignee), so the row leaves this queue and appears in that
// salesperson's "My" funnel.
export async function getUnassignedDeals(
  tenantId: string,
  opts: { page: number; pageSize: number }
): Promise<{ rows: KanbanDeal[]; total: number }> {
  await canManageCRMForTenant(tenantId);
  const { page, pageSize } = opts;
  const liveCond = kanbanLiveCond(kanbanCutoffISO());
  const offset = (page - 1) * pageSize;
  return withDrizzleTenant(tenantId, async (tx) => {
    const where = and(eq(deal.status, "open"), isNull(deal.ownerId), liveCond);
    const [{ total }] = await tx.select({ total: count() }).from(deal).where(where);
    const rows = await tx
      .select(dealCardCols)
      .from(deal)
      .leftJoin(lead, eq(lead.id, deal.leadId))
      .leftJoin(user, eq(user.id, deal.ownerId))
      .where(where)
      .orderBy(sql`${deal.lastActivityAt} DESC NULLS LAST`, desc(deal.createdAt))
      .limit(pageSize)
      .offset(offset);
    const enr = await enrichDeals(tx, rows);
    return { rows: rows.map((r) => toKanbanDeal(r, enr.get(r.id))), total };
  });
}

// ─── Watchers board — live demand grouped by customer INTENT ───────────────
// The owner's guiding-star view: every live, open deal placed in exactly one
// intent column (rent | lease_6m | lease_12m | lease_to_own | sale), each card
// carrying the owner's initials and days-since-touch so a stalled watcher is
// obvious at a glance. Intent is deal.intent when a manager tagged it, else a
// derived provisional value (see modules/crm/intent.ts) so the board is never
// empty on day one. Read-only; nothing is written.

export type WatcherCard = {
  id: string;
  /** Customer name from the linked lead; falls back to the deal ref. */
  headline: string;
  ref: string;
  ownerName: string | null;
  /** 1–2 char initials for the owner avatar; "—" when unassigned. */
  ownerInitials: string;
  /** Whole days since last touch = greatest(deal.updated_at, newest linked WA
   *  message); falls back to created_at. null if unknown. */
  daysSinceTouch: number | null;
  /** True when a human explicitly set the intent (vs. derived). */
  intentExplicit: boolean;
  stageDetail: string | null;
  value: number | null;
};

export type WatcherColumn = {
  key: Intent;
  label: string;
  full: string;
  cards: WatcherCard[];
  count: number;
};

// Board caps the pull so the ~25k archive can never load; live-open is ~225.
const WATCHERS_MAX = 600;

function initialsFrom(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "—";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function daysSince(ts: Date | string | null): number | null {
  if (!ts) return null;
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export async function getWatchersBoard(
  tenantId: string,
  opts?: { ownerId?: string }
): Promise<WatcherColumn[]> {
  await canManageCRMForTenant(tenantId);
  const owner = opts?.ownerId === "me" ? await requireAuth() : opts?.ownerId;
  const liveCond = kanbanLiveCond(kanbanCutoffISO());
  const rows = await withDrizzleTenant(tenantId, (tx) =>
    tx
      .select({
        id: deal.id,
        ref: deal.ref,
        type: deal.type,
        notes: deal.notes,
        intent: deal.intent,
        stageDetail: deal.stageDetail,
        value: deal.value,
        // Honest freshness: the deal's own update time OR the newest WhatsApp
        // message stitched to its lead — whichever is later. This is what kills
        // the false-dead board: a deal Bitrix hasn't touched in weeks but whose
        // client is actively messaging on WhatsApp now reads as fresh (the
        // stitching that populates related_entity_type='lead' is migration 0052 +
        // scripts/backfill-stitch.ts). GREATEST degrades to updated_at when the
        // lead has no linked messages (subquery is NULL) — exactly right.
        // coalesce(source_modified_at, updated_at): Bitrix's own DATE_MODIFY
        // when we have it (0053) — our updated_at lies after every nightly
        // reconcile pass (rewrites rows wholesale, 61k "updates"/night).
        lastTouchAt: sql<Date>`greatest(coalesce(${deal.sourceModifiedAt}, ${deal.updatedAt}), (
          select max(m.created_at) from message m
          where m.tenant_id = ${deal.tenantId}
            and m.related_entity_type = 'lead'
            and m.related_entity_id = ${deal.leadId}
        ))`,
        createdAt: deal.createdAt,
        customerName: lead.customerName,
        ownerName: user.name,
      })
      .from(deal)
      .leftJoin(lead, eq(lead.id, deal.leadId))
      .leftJoin(user, eq(user.id, deal.ownerId))
      .where(and(eq(deal.status, "open"), liveCond, owner ? eq(deal.ownerId, owner) : undefined))
      .orderBy(
        // Newest real touch on top — owner directive 2026-07-23.
        sql`greatest(coalesce(${deal.sourceModifiedAt}, ${deal.updatedAt}), (
          select max(m.created_at) from message m
          where m.tenant_id = ${deal.tenantId}
            and m.related_entity_type = 'lead'
            and m.related_entity_id = ${deal.leadId}
        )) DESC NULLS LAST`,
        desc(deal.createdAt)
      )
      .limit(WATCHERS_MAX)
  );

  const byIntent = new Map<Intent, WatcherCard[]>();
  for (const k of INTENT_ORDER) byIntent.set(k, []);
  for (const r of rows) {
    const key = effectiveIntent({
      intent: r.intent,
      ref: r.ref,
      notes: r.notes,
      stageDetail: r.stageDetail,
      type: r.type,
    });
    byIntent.get(key)!.push({
      id: r.id,
      headline: (r.customerName?.trim() || r.ref || "—").slice(0, 60),
      ref: r.ref,
      ownerName: r.ownerName,
      ownerInitials: initialsFrom(r.ownerName),
      daysSinceTouch: daysSince(r.lastTouchAt ?? r.createdAt),
      intentExplicit: isExplicit(r.intent),
      stageDetail: r.stageDetail,
      value: r.value,
    });
  }

  return INTENT_ORDER.map((key) => ({
    key,
    label: INTENT_LABELS[key].short,
    full: INTENT_LABELS[key].full,
    cards: byIntent.get(key)!,
    count: byIntent.get(key)!.length,
  }));
}

// The salespeople a coordinator can hand a deal to: tenant members carrying a
// 'sales' or 'sales_manager' role (demo accounts excluded), alphabetical.
export type AssignableMember = { userId: string; name: string };
export async function getAssignableMembers(tenantId: string): Promise<AssignableMember[]> {
  await canManageCRMForTenant(tenantId);
  // MUST run inside withDrizzleTenant (architecture rule #1): tenant_member is
  // FORCE-RLS'd, so on the raw `db` handle under DB_APP_ROLE=app_runtime this
  // returns ZERO rows — the assign dropdown goes empty and no deal can be handed
  // to anyone, with no error on screen. Verified live: FORCE RLS on, 0 rows
  // without app.tenant_id.
  const members = await withDrizzleTenant(tenantId, (tx) =>
    tx
      .select({ userId: tenantMember.userId, roles: tenantMember.roles, name: user.name })
      .from(tenantMember)
      .innerJoin(user, eq(user.id, tenantMember.userId))
      .where(eq(tenantMember.tenantId, tenantId)),
  );
  return members
    .filter((m) => {
      const rs = m.roles ?? [];
      return (
        (rs.includes("sales") || rs.includes("sales_manager")) &&
        !(m.name ?? "").toLowerCase().includes("demo")
      );
    })
    .map((m) => ({ userId: m.userId, name: m.name ?? "—" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

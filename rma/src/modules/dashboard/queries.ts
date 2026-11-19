"use server";

import { lead, deal, message, vehicle, rental, payment, customer, lease, leasePayment, leaseInstallment } from "@/platform/db/schema";
import { boardItem } from "@/platform/db/board-schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { getUserScope, getActiveCompany } from "@/platform/auth/scope";
import { requireAuth, getTenantRoles } from "@/platform/auth/authorization";
import { eq, desc, sql, gte, lte, and, inArray } from "drizzle-orm";

export async function getDashboardStats(tenantId: string) {
  // AUTHZ: tenantId is caller-supplied ("use server" exports are directly
  // POSTable), so require a membership in THAT tenant before RLS scopes to it.
  // The overview is visible to every role, so membership is the right bar.
  const userId = await requireAuth();
  const memberRoles = await getTenantRoles(userId, tenantId);
  if (memberRoles.length === 0) throw new Error("Forbidden: not a member of this tenant");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const nextThreeDays = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4, 0, 0, 0, 0);

  // Company scoping. A user pinned to one company sees that company's numbers;
  // cross-branch users (CEO, security) and unscoped ones (tenant_admin) keep the
  // holding-wide view, exactly as companyScope() behaves everywhere else.
  //
  // Only vehicle / rental / customer / lease carry a company_id. Leads, deals,
  // messages and the board have no company dimension at all, so those tiles stay
  // tenant-wide — `scopedTiles` tells the UI which numbers are actually filtered,
  // so it can label the rest honestly instead of implying a split that isn't there.
  const scope = await getUserScope(tenantId);
  // Shared physical fleet: fleet / rentals / leases (+ the revenue derived from
  // them) are HOLDING-WIDE for every member now — a company is a car's current
  // hand, not its owner. Dropping the company predicate here fixes the
  // zero-fleet dashboards a manager saw when pinned to a company with few
  // cars/rentals. Tenant RLS is unchanged; undefined = no company filter.
  const vehicleCo = undefined;
  const rentalCo = undefined;
  const leaseCo = undefined;
  // Branding only — the member's company, if any. Since every tile is now
  // holding-wide, the payload reports scoped=false and labels nothing as "this
  // company's numbers".
  const memberScoped = !scope.crossBranch && scope.companyIds.length > 0;
  const activeCompany = memberScoped ? await getActiveCompany(tenantId) : null;

  return withDrizzleTenant(tenantId, async (tx) => {
    const [leadsToday] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(lead)
      .where(gte(lead.createdAt, today));

    // "Open deals" means the live pipeline, not the archive. The Bitrix import
    // brought four years of history in as status='open' — 25k deals summing to
    // AED 2bn, of which 24k had not been touched in over 90 days and half carry
    // no value at all. Counting those as pipeline made the headline number
    // meaningless, so the tile counts deals with real recent activity and the
    // dormant ones are reported separately rather than quietly dropped.
    const PIPELINE_WINDOW_DAYS = 90;
    const activeSince = new Date(now.getTime() - PIPELINE_WINDOW_DAYS * 86400000);

    const [openDeals] = await tx
      .select({ count: sql<number>`count(*)`, value: sql<number>`coalesce(sum(${deal.value}), 0)` })
      .from(deal)
      .where(and(eq(deal.status, "open"), gte(deal.lastActivityAt, activeSince)));

    const [dormantDeals] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(deal)
      .where(and(eq(deal.status, "open"), lte(deal.lastActivityAt, activeSince)));

    const [newMessages] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(message)
      .where(eq(message.status, "new"));

    const fleetCounts = await tx
      .select({ status: vehicle.status, count: sql<number>`count(*)` })
      .from(vehicle)
      .where(vehicleCo)
      .groupBy(vehicle.status);

    const fleet = { available: 0, onRent: 0, inService: 0, overdue: 0, reserved: 0, total: 0 };
    for (const row of fleetCounts) {
      const n = Number(row.count);
      fleet.total += n;
      if (row.status === "available") fleet.available = n;
      if (row.status === "on_rent") fleet.onRent = n;
      if (row.status === "in_service") fleet.inService = n;
      if (row.status === "overdue") fleet.overdue = n;
      if (row.status === "reserved") fleet.reserved = n;
    }

    const [rentalsToday] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(rental)
      .where(and(gte(rental.startDate, today), lte(rental.startDate, tomorrow), rentalCo));

    const [returnsToday] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(rental)
      .where(and(gte(rental.returnDate, today), lte(rental.returnDate, tomorrow), rentalCo));

    const [activeRentals] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(rental)
      .where(and(eq(rental.status, "active"), rentalCo));

    const [outstandingBalance] = await tx
      .select({ value: sql<number>`coalesce(sum(${rental.balanceDue}), 0)` })
      .from(rental)
      .where(and(inArray(rental.status, ["reserved", "active", "returned"]), gte(rental.balanceDue, 0), rentalCo));

    // Revenue is the number a company owner actually looks at, and payment has
    // no company_id — it inherits one through its rental (rental_id is NOT NULL,
    // so this join drops nothing).
    const [rentalRevenue] = await tx
      .select({ value: sql<number>`coalesce(sum(${payment.amount}), 0)::float8` })
      .from(payment)
      .innerJoin(rental, eq(payment.rentalId, rental.id))
      .where(and(gte(payment.createdAt, monthStart), rentalCo));

    const [activeLeases] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(lease)
      .where(and(eq(lease.status, "active"), leaseCo));

    const [leaseOutstandingBalance] = await tx
      .select({ value: sql<number>`coalesce(sum(${lease.balanceDue}), 0)` })
      .from(lease)
      .where(and(inArray(lease.status, ["active", "defaulted"]), leaseCo));

    const [leasePaymentsThisMonth] = await tx
      .select({ value: sql<number>`coalesce(sum(${leasePayment.amount}), 0)` })
      .from(leasePayment)
      .innerJoin(lease, eq(leasePayment.leaseId, lease.id))
      .where(and(gte(leasePayment.createdAt, monthStart), leaseCo));

    const [leasesWithOverdue] = await tx
      .select({ count: sql<number>`count(distinct ${leaseInstallment.leaseId})` })
      .from(leaseInstallment)
      .innerJoin(lease, eq(leaseInstallment.leaseId, lease.id))
      .where(
        and(
          eq(leaseInstallment.status, "pending"),
          lte(leaseInstallment.dueDate, today),
          eq(lease.status, "active"),
          leaseCo
        )
      );

    // ── 6-gate control room counts ─────────────────────────────────────────

    // Gate 1: Board cards where AI drafted a reply and a human must approve before sending
    const [boardAwaitingApproval] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(boardItem)
      .where(eq(boardItem.status, "approved"));

    // Gate 2: Board cards with SLA breached (open + awaiting reply + past deadline)
    const [boardSlaBreached] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(boardItem)
      .where(
        and(
          eq(boardItem.status, "open"),
          eq(boardItem.awaitingReply, true),
          sql`${boardItem.slaDueAt} < now()`,
        ),
      );

    // Gate 3: Payments pending manager confirmation (two-step flow)
    const [bookingsPendingConfirm] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(payment)
      .where(eq(payment.status, "pending"));

    // Gate 4: Open deals without an assigned owner
    const [dealsWithoutOwner] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(deal)
      .where(and(eq(deal.status, "open"), sql`${deal.ownerId} is null`));

    // Gate 5: Today's events — new leads + board cards first seen today
    const [todayLeadCount] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(lead)
      .where(gte(lead.createdAt, today));

    const [todayBoardCount] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(boardItem)
      .where(gte(boardItem.firstSeenAt, today));

    const todayEvents = Number(todayLeadCount.count) + Number(todayBoardCount.count);

    // ── List data ──────────────────────────────────────────────────────────

    const recentLeasePayments = await tx
      .select({
        payment: { id: leasePayment.id, amount: leasePayment.amount, createdAt: leasePayment.createdAt },
        contractRef: lease.contractRef,
        customerName: customer.name,
      })
      .from(leasePayment)
      .innerJoin(lease, eq(leasePayment.leaseId, lease.id))
      .innerJoin(customer, eq(lease.customerId, customer.id))
      .where(leaseCo)
      .orderBy(desc(leasePayment.createdAt))
      .limit(5);

    const upcomingReturns = await tx
      .select({
        rental: { id: rental.id, returnDate: rental.returnDate, status: rental.status },
        customerName: customer.name,
        vehiclePlate: vehicle.plate,
      })
      .from(rental)
      .innerJoin(customer, eq(rental.customerId, customer.id))
      .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
      .where(
        and(
          inArray(rental.status, ["active", "reserved"]),
          gte(rental.returnDate, today),
          lte(rental.returnDate, nextThreeDays),
          rentalCo
        )
      )
      .orderBy(rental.returnDate);

    const recentRentals = await tx
      .select({
        rental: { id: rental.id, status: rental.status, total: rental.total, createdAt: rental.createdAt },
        customerName: customer.name,
        vehiclePlate: vehicle.plate,
      })
      .from(rental)
      .innerJoin(customer, eq(rental.customerId, customer.id))
      .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
      .where(rentalCo)
      .orderBy(desc(rental.createdAt))
      .limit(5);

    const recentMessages = await tx.select().from(message).orderBy(desc(message.createdAt)).limit(5);
    const recentLeads = await tx.select().from(lead).orderBy(desc(lead.createdAt)).limit(5);
    const recentDeals = await tx.select().from(deal).orderBy(desc(deal.createdAt)).limit(5);

    return {
      // Which company's numbers these are, and which tiles the filter reached.
      // Leads / deals / messages / board have no company_id, so they are
      // holding-wide even for a scoped user — the UI must say so.
      scope: {
        companyId: activeCompany?.id ?? null,
        companyName: activeCompany?.name ?? null,
        // Shared fleet: every tile is holding-wide, so nothing is company-scoped.
        scoped: false,
        scopedTiles: [] as string[],
        unscopedTiles: [
          "fleet",
          "rentals",
          "revenue",
          "leases",
          "customers",
          "leads",
          "deals",
          "messages",
          "board",
        ],
      },
      leadsToday: leadsToday.count,
      openDeals: openDeals.count,
      openDealsValue: openDeals.value,
      /** Open deals with no activity in the pipeline window — imported archive. */
      dormantDeals: Number(dormantDeals.count),
      pipelineWindowDays: PIPELINE_WINDOW_DAYS,
      newMessages: newMessages.count,
      fleet,
      rentalsToday: rentalsToday.count,
      returnsToday: returnsToday.count,
      activeRentals: activeRentals.count,
      outstandingBalance: outstandingBalance.value,
      monthlyRevenue: (rentalRevenue.value ?? 0) + (leasePaymentsThisMonth.value ?? 0),
      rentalRevenue: rentalRevenue.value,
      leasePaymentsThisMonth: leasePaymentsThisMonth.value,
      activeLeases: activeLeases.count,
      leaseOutstandingBalance: leaseOutstandingBalance.value,
      leasesWithOverdue: leasesWithOverdue.count,
      boardAwaitingApproval: Number(boardAwaitingApproval.count),
      boardSlaBreached: Number(boardSlaBreached.count),
      bookingsPendingConfirm: Number(bookingsPendingConfirm.count),
      dealsWithoutOwner: Number(dealsWithoutOwner.count),
      todayEvents,
      recentLeasePayments,
      upcomingReturns,
      recentRentals,
      recentMessages,
      recentLeads,
      recentDeals,
    };
  });
}

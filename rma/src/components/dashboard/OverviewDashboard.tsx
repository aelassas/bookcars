"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  StatCard,
  Badge,
} from "@/components/ui";
import {
  AlertTriangle,
  Car,
  MessageCircle,
  Calendar,
  Banknote,
  RotateCcw,
  FileText,
  ChevronRight,
  Users,
  Handshake,
  Undo2,
  CheckCircle,
  Clock,
  UserX,
  Activity,
  ShieldAlert,
  FileSearch,
  Wrench,
  Receipt,
  PowerOff,
  MailQuestion,
} from "lucide-react";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

/* ─── Colour look-up maps ────────────────────────────────────────────────── */

const STATUS_BADGE: Record<string, string> = {
  new: "bg-danger-soft text-danger",
  contacted: "bg-info-soft text-info",
  qualified: "bg-success-soft text-success",
  lost: "bg-sunken text-ink-3",
  open: "bg-info-soft text-info",
  won: "bg-success-soft text-success",
  reserved: "bg-warn-soft text-warn",
  active: "bg-success-soft text-success",
  returned: "bg-info-soft text-info",
  completed: "bg-sunken text-ink-3",
  cancelled: "bg-sunken text-ink-3 line-through",
};

const CHANNEL: Record<string, string> = {
  whatsapp: "bg-success-soft text-success",
  instagram: "bg-pink-50 text-pink-600",
  facebook: "bg-blue-50 text-blue-600",
  email: "bg-sunken text-ink-2",
  sms: "bg-brand-50 text-brand-700",
  localrent: "bg-warn-soft text-warn",
  yango: "bg-info-soft text-info",
};

/* ─── GateCard ───────────────────────────────────────────────────────────── */
/**
 * One gate in the 6-gate control room. Active (coloured) when count > 0.
 * Dimmed to neutral when there is nothing to action — honest empty state.
 */
function GateCard({
  href,
  icon,
  count,
  label,
  sub,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  count: number;
  label: string;
  sub: string;
  tone: "danger" | "warn" | "info" | "brand" | "success";
}) {
  const active = count > 0;
  const TONE: Record<string, { box: string; icon: string }> = {
    danger:  { box: "border-danger-line bg-danger-soft",   icon: "text-danger"    },
    warn:    { box: "border-warn-line bg-warn-soft",       icon: "text-warn"      },
    info:    { box: "border-info-line bg-info-soft",       icon: "text-info"      },
    brand:   { box: "border-brand-200 bg-brand-50",        icon: "text-brand-700" },
    success: { box: "border-success-line bg-success-soft", icon: "text-success"   },
  };
  const t = TONE[tone];
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-field border p-3 transition hover:shadow-lifted ${
        active ? t.box : "border-line bg-surface opacity-60"
      }`}
    >
      <span className={`shrink-0 ${active ? t.icon : "text-ink-3"}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-semibold ${active ? "text-ink" : "text-ink-3"}`}>
          {formatNumber(count)} {label}
        </div>
        <div className="truncate text-xs text-ink-3">{sub}</div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/* ─── Main dashboard ─────────────────────────────────────────────────────── */

export default function OverviewDashboard({
  stats,
  tenantSlug,
}: {
  stats: Awaited<ReturnType<typeof import("@/modules/dashboard/queries").getDashboardStats>>;
  tenantSlug: string;
}) {
  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  const weekday = now.toLocaleDateString("en-GB", { weekday: "long" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{greeting}</h1>
          {stats.scope?.scoped && stats.scope.companyName ? (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              {stats.scope.companyName}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-ink-2">
          {weekday}, {formatDate(now)} — here&apos;s where the business stands.
        </p>
        {/* Say plainly which numbers are this company's and which are not, rather
            than letting a holding-wide lead count read as the company's own. */}
        {stats.scope?.scoped ? (
          <p className="mt-1 text-xs text-ink-3">
            Fleet, rentals, revenue, leasing and customers — for {stats.scope.companyName}.
            Leads, deals and messages are still shared across the holding.
          </p>
        ) : null}
      </div>

      {/* Primary KPIs — real counts only, no fake sparklines */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="New leads today"
          value={formatNumber(stats.leadsToday)}
          tone="brand"
          href={`/${tenantSlug}/crm`}
        />
        <StatCard
          label="Open deals"
          value={formatNumber(stats.openDeals)}
          hint={
            stats.dormantDeals
              ? `${formatCurrency(stats.openDealsValue)} · ${formatNumber(stats.dormantDeals)} more idle ${stats.pipelineWindowDays}+ days`
              : formatCurrency(stats.openDealsValue)
          }
          tone="brand"
          href={`/${tenantSlug}/crm`}
        />
        <StatCard
          label="Unread messages"
          value={formatNumber(stats.newMessages)}
          tone={Number(stats.newMessages) > 0 ? "rose" : "slate"}
          href={`/${tenantSlug}/messages`}
        />
        <StatCard
          label="Fleet available"
          value={formatNumber(stats.fleet.available)}
          hint={`of ${formatNumber(stats.fleet.total)} vehicles`}
          tone="emerald"
          href={`/${tenantSlug}/fleet`}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Active rentals"
          value={formatNumber(stats.activeRentals)}
          hint={`${formatNumber(stats.fleet.onRent)} vehicles on rent`}
          tone="emerald"
          icon={<Car className="h-4 w-4" />}
        />
        <StatCard
          label="Pick-ups today"
          value={formatNumber(stats.rentalsToday)}
          hint="Rentals starting today"
          tone="sky"
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatCard
          label="Returns today"
          value={formatNumber(stats.returnsToday)}
          hint="Drop-offs due today"
          tone="amber"
          icon={<RotateCcw className="h-4 w-4" />}
        />
        <StatCard
          label="Outstanding balance"
          value={formatCurrency(stats.outstandingBalance)}
          hint={`${formatCurrency(stats.monthlyRevenue)} revenue this month`}
          tone="rose"
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Active leases"
          value={formatNumber(stats.activeLeases)}
          hint={`${formatCurrency(stats.leaseOutstandingBalance)} balance due`}
          tone="violet"
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      {/* ── 6-Gate Control Room ──────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader
          title="6-Gate control room"
          icon={<ShieldAlert className="h-4 w-4 text-warn" />}
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Gate 1: Replies awaiting human approval before send */}
          <GateCard
            href={`/${tenantSlug}/board`}
            icon={<CheckCircle className="h-5 w-5" />}
            count={stats.boardAwaitingApproval}
            label="cards awaiting reply approval"
            sub="AI drafted — human must approve before sending"
            tone="brand"
          />
          {/* Gate 2: SLA-breached board cards */}
          <GateCard
            href={`/${tenantSlug}/board`}
            icon={<Clock className="h-5 w-5" />}
            count={stats.boardSlaBreached}
            label="SLA-breached cards"
            sub="Open & awaiting reply past deadline"
            tone="danger"
          />
          {/* Gate 3: Payments needing manager confirmation */}
          <GateCard
            href={`/${tenantSlug}/rentals`}
            icon={<Calendar className="h-5 w-5" />}
            count={stats.bookingsPendingConfirm}
            label="payments pending confirmation"
            sub="Two-step: sales recorded — confirm to post"
            tone="warn"
          />
          {/* Gate 4: Open deals without an owner */}
          <GateCard
            href={`/${tenantSlug}/deals`}
            icon={<UserX className="h-5 w-5" />}
            count={stats.dealsWithoutOwner}
            label="open deals without owner"
            sub="Assign before they go cold"
            tone="warn"
          />
          {/* Gate 5: Today's total activity */}
          <GateCard
            href={`/${tenantSlug}/crm`}
            icon={<Activity className="h-5 w-5" />}
            count={stats.todayEvents}
            label="events today"
            sub="New leads + board cards opened today"
            tone="success"
          />
          {/* Gate 6: Overdue rentals (collections) */}
          <GateCard
            href={`/${tenantSlug}/collections`}
            icon={<AlertTriangle className="h-5 w-5" />}
            count={stats.fleet.overdue}
            label="overdue rentals"
            sub="Past return date — collect now"
            tone="danger"
          />
        </div>
      </Card>

      {/* ── Rental operations (meeting 2026-11-17) ───────────────────────────
          Surfaces the nine rental-ops items (customer docs, mileage, fines,
          Salik, service, extension, blocks, parking) so the manager sees them
          without drilling into /operations and /charges. */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Rental operations"
          icon={<Activity className="h-4 w-4 text-brand-600" />}
          action={
            <Link href={`/${tenantSlug}/operations`} className="text-xs font-medium text-brand-700 hover:underline">
              Open per-car board →
            </Link>
          }
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* #1 — docs OCR'd and waiting for staff review. */}
          <GateCard
            href={`/${tenantSlug}/customers`}
            icon={<FileSearch className="h-5 w-5" />}
            count={stats.docsAwaitingReview}
            label="customer docs awaiting review"
            sub="OCR done — staff must verify before saving"
            tone="brand"
          />
          {/* #7 — 48h reminder sent, no reply yet. */}
          <GateCard
            href={`/${tenantSlug}/operations`}
            icon={<MailQuestion className="h-5 w-5" />}
            count={stats.returnsAwaitingReply}
            label="returns awaiting a reply"
            sub="Reminder sent — customer hasn't answered"
            tone="info"
          />
          {/* #7 — customer wants to extend; manager confirms new dates. */}
          <GateCard
            href={`/${tenantSlug}/operations`}
            icon={<Handshake className="h-5 w-5" />}
            count={stats.extensionsPendingConfirm}
            label="extensions to confirm"
            sub="Customer asked to extend — manager approves"
            tone="warn"
          />
          {/* #6 — service due (soft warning) and overdue (hard limit). */}
          <GateCard
            href={`/${tenantSlug}/operations`}
            icon={<Wrench className="h-5 w-5" />}
            count={stats.vehiclesServiceDueSoon + stats.vehiclesServiceOverdue}
            label="vehicles at service limit"
            sub={
              stats.vehiclesServiceOverdue > 0
                ? `${formatNumber(stats.vehiclesServiceOverdue)} past 10,000 km limit`
                : "8,000 km+ since last service"
            }
            tone={stats.vehiclesServiceOverdue > 0 ? "danger" : "warn"}
          />
          {/* #4 + #5 + #9 — outstanding fines, Salik, Parkin, Parkonic. */}
          <GateCard
            href={`/${tenantSlug}/charges`}
            icon={<Receipt className="h-5 w-5" />}
            count={stats.outstandingChargesCount}
            label="unpaid fines, Salik, parking"
            sub={
              stats.outstandingChargesCount > 0
                ? `${formatCurrency(stats.outstandingChargesValue)} outstanding`
                : "No outstanding charges"
            }
            tone={stats.outstandingChargesCount > 0 ? "warn" : "info"}
          />
          {/* #4 — engine blocks currently in force. */}
          <GateCard
            href={`/${tenantSlug}/charges`}
            icon={<PowerOff className="h-5 w-5" />}
            count={stats.activeEngineBlocks}
            label="active engine blocks"
            sub="Unblock after payment confirmed"
            tone="danger"
          />
        </div>
      </Card>

      {/* Upcoming returns + recent rentals */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader
            title="Upcoming returns"
            count={stats.upcomingReturns.length}
            icon={<Undo2 className="h-4 w-4" />}
          />
          {stats.upcomingReturns.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-3">
              No returns in the next 3 days.
            </div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {stats.upcomingReturns.map((r) => (
                <li key={r.rental.id} className="transition hover:bg-sunken/50">
                  <Link
                    href={`/${tenantSlug}/rentals/${r.rental.id}`}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink">
                        {r.customerName ?? "—"}
                      </div>
                      <div className="text-xs text-ink-3">
                        {r.vehiclePlate} · {formatDate(r.rental.returnDate)}
                      </div>
                    </div>
                    <Badge cls={STATUS_BADGE[r.rental.status] ?? "bg-sunken text-ink-2"}>
                      {r.rental.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Recent rentals"
            count={stats.recentRentals.length}
            icon={<Calendar className="h-4 w-4" />}
          />
          {stats.recentRentals.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-3">No rentals yet.</div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {stats.recentRentals.map((r) => (
                <li key={r.rental.id} className="transition hover:bg-sunken/50">
                  <Link
                    href={`/${tenantSlug}/rentals/${r.rental.id}`}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink">
                        {r.customerName ?? "—"}
                      </div>
                      <div className="text-xs text-ink-3">
                        {r.vehiclePlate} · {formatDate(r.rental.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-ink tnum">
                        {formatCurrency(r.rental.total)}
                      </div>
                      <Badge cls={STATUS_BADGE[r.rental.status] ?? "bg-sunken text-ink-2"}>
                        {r.rental.status}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Lease payments */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Recent lease payments"
          count={stats.recentLeasePayments.length}
          icon={<Banknote className="h-4 w-4" />}
        />
        {stats.recentLeasePayments.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-3">
            No lease payments this month.
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {stats.recentLeasePayments.map((p) => (
              <li key={p.payment.id} className="px-4 py-3 transition hover:bg-sunken/50">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">
                      {p.customerName ?? "—"}
                    </div>
                    <div className="text-xs text-ink-3">
                      {p.contractRef} · {formatDate(p.payment.createdAt)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-success tnum">
                    {formatCurrency(p.payment.amount)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader
            title="Recent messages"
            count={stats.recentMessages.length}
            icon={<MessageCircle className="h-4 w-4" />}
          />
          <ul className="divide-y divide-line-soft">
            {stats.recentMessages.map((m) => (
              <li key={m.id} className="px-4 py-3 transition hover:bg-sunken/50">
                <div className="flex items-center gap-2">
                  <Badge cls={CHANNEL[m.channel] ?? "bg-sunken text-ink-2"}>{m.channel}</Badge>
                  <span className="truncate text-xs text-ink-3">{m.from}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-ink-2">{m.body}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Recent leads"
            count={stats.recentLeads.length}
            icon={<Users className="h-4 w-4" />}
          />
          <ul className="divide-y divide-line-soft">
            {stats.recentLeads.map((l) => (
              <li key={l.id} className="px-4 py-3 transition hover:bg-sunken/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">
                    {l.customerName ?? "(no name)"}
                  </span>
                  <Badge cls={STATUS_BADGE[l.status] ?? "bg-sunken text-ink-2"}>{l.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-ink-3">{l.phone ?? l.email ?? "—"}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Recent deals"
            count={stats.recentDeals.length}
            icon={<Handshake className="h-4 w-4" />}
          />
          <ul className="divide-y divide-line-soft">
            {stats.recentDeals.map((d) => (
              <li key={d.id} className="px-4 py-3 transition hover:bg-sunken/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{d.ref}</span>
                  <Badge cls={STATUS_BADGE[d.status] ?? "bg-sunken text-ink-2"}>{d.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-ink-3">
                  {d.type} · {d.stage} · {d.value ? formatCurrency(d.value) : "—"}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

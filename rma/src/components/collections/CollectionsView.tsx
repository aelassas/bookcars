"use client";

import { PageHeader, Card, CardHeader, Badge, Table, TH, TD, EmptyState, cx } from "@/components/ui";
import { AlertTriangle, PhoneCall, CheckCircle2 } from "lucide-react";

// NOTE: engine-block / GPS-immobilise was intentionally removed. Pilot is
// read-only (location/status). Collections is a read-only worklist of overdue
// accounts; escalation (call → SMS → security) is handled by the collections
// ladder, never by remotely disabling a vehicle.

// Whole days a rental is past its return date (0 when no date is set).
function daysOverdueFrom(returnDate: Date | null): number {
  if (!returnDate) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(returnDate).getTime()) / (1000 * 60 * 60 * 24)));
}

type CollectionsRow = {
  rental: {
    id: string;
    returnDate: Date | null;
    balanceDue: number;
    total: number;
    dailyRate: number;
  };
  customerName: string | null;
  customerPhone: string | null;
  vehiclePlate: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleImei: string | null;
  gpsBlocked: boolean;
};

export default function CollectionsView({
  rentals,
}: {
  rentals: CollectionsRow[];
  tenantSlug: string;
  tenantId: string;
}) {
  return (
    <div>
      <PageHeader
        title="Collections"
        subtitle={`${rentals.length} overdue rental${rentals.length === 1 ? "" : "s"} with unpaid balance`}
        icon={<AlertTriangle className="h-4.5 w-4.5" />}
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-field border border-danger-line bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
        <PhoneCall className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Escalation ladder only: call → SMS → security. GPS is read-only — no remote engine
          block from this screen.
        </span>
      </div>

      {rentals.length > 0 ? (
        <Card className="overflow-hidden">
          <CardHeader
            title="Overdue accounts"
            count={rentals.length}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
          />
          <Table>
            <thead>
              <tr>
                <TH>Customer</TH>
                <TH>Vehicle</TH>
                <TH>Overdue</TH>
                <TH>Balance</TH>
              </tr>
            </thead>
            <tbody>
              {rentals.map((r, idx) => {
                const isTop = idx === 0;
                const daysOverdue = daysOverdueFrom(r.rental.returnDate);

                return (
                  <tr
                    key={r.rental.id}
                    className={cx("transition-colors hover:bg-sunken/60", isTop && "bg-danger-soft/60")}
                  >
                    <TD>
                      <div className="font-medium text-ink">{r.customerName ?? "—"}</div>
                      {r.customerPhone ? (
                        <a
                          href={`tel:${r.customerPhone}`}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          {r.customerPhone}
                        </a>
                      ) : (
                        <div className="text-xs text-ink-3">—</div>
                      )}
                    </TD>
                    <TD>
                      <div className="text-ink-2">{r.vehiclePlate}</div>
                      <div className="text-[11px] text-ink-3">
                        {r.vehicleMake} {r.vehicleModel}
                      </div>
                    </TD>
                    <TD>
                      <Badge tone="danger">
                        <AlertTriangle className="h-3 w-3" />
                        {daysOverdue} days
                      </Badge>
                    </TD>
                    <TD>
                      <div className="font-medium text-danger tnum">
                        {r.rental.balanceDue.toLocaleString()} AED
                      </div>
                      <div className="text-[11px] text-ink-3 tnum">
                        of {r.rental.total.toLocaleString()} AED
                      </div>
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      ) : (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="No overdue rentals"
          description="Every rental with a balance is paid up. Great job!"
        />
      )}
    </div>
  );
}

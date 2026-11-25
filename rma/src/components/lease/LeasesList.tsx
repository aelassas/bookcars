"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  Button,
  Table,
  TH,
  TD,
  EmptyState,
  cx,
  type BadgeTone,
} from "@/components/ui";
import { CreateLeaseModal } from "@/components/modals/CreateLeaseModal";
import { startLease, completeLease, defaultLease, cancelLease } from "@/modules/lease/actions";
import { getLeaseVehiclesAndCustomers } from "@/modules/lease/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { Play, CheckCircle2, AlertTriangle, XCircle, FileSignature, Plus } from "lucide-react";

type Lease = {
  id: string;
  contractRef: string;
  startDate: Date | null;
  endDate: Date | null;
  termMonths: number;
  downPayment: number;
  monthlyPayment: number;
  residualValue: number;
  totalAmount: number;
  balanceDue: number;
  status: string;
};

type LeaseRow = {
  lease: Lease;
  customerName: string | null;
  vehiclePlate: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
};

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  active: "success",
  completed: "neutral",
  defaulted: "danger",
  cancelled: "neutral",
};

const ICON_BTN = "rounded-field p-1.5 transition-colors disabled:opacity-50";

export default function LeasesList({
  leases,
  tenantSlug,
  tenantId,
  actorId,
}: {
  leases: LeaseRow[];
  tenantSlug: string;
  tenantId: string;
  actorId?: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [options, setOptions] = useState<{ vehicles: { id: string; make: string; model: string; plate: string }[]; customers: { id: string; name: string; phone: string | null }[] }>({ vehicles: [], customers: [] });
  const [rows, setRows] = useState<LeaseRow[]>(leases);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Server refresh delivered a new `leases` prop — drop optimistic rows and
  // resync (render-time adjustment instead of a setState-in-effect).
  const [prevLeases, setPrevLeases] = useState(leases);
  if (prevLeases !== leases) {
    setPrevLeases(leases);
    setRows(leases);
  }

  useEffect(() => {
    if (showModal) {
      getLeaseVehiclesAndCustomers(tenantId)
        .then(setOptions)
        .catch(console.error);
    }
  }, [showModal, tenantId]);

  async function handleStart(r: LeaseRow) {
    setBusy(`start-${r.lease.id}`);
    setError(null);
    try {
      await startLease(tenantId, actorId, r.lease.id, tenantSlug);
      setRows((prev) => prev.map((x) => (x.lease.id === r.lease.id ? { ...x, lease: { ...x.lease, status: "active" } } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleComplete(r: LeaseRow) {
    if (!confirm("Complete this lease and clear balance due?")) return;
    setBusy(`complete-${r.lease.id}`);
    setError(null);
    try {
      await completeLease(tenantId, actorId, r.lease.id, tenantSlug);
      setRows((prev) => prev.map((x) => (x.lease.id === r.lease.id ? { ...x, lease: { ...x.lease, status: "completed", balanceDue: 0 } } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Complete failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleDefault(r: LeaseRow) {
    if (!confirm("Mark this lease as defaulted?")) return;
    setBusy(`default-${r.lease.id}`);
    setError(null);
    try {
      await defaultLease(tenantId, actorId, r.lease.id, tenantSlug);
      setRows((prev) => prev.map((x) => (x.lease.id === r.lease.id ? { ...x, lease: { ...x.lease, status: "defaulted" } } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Default failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel(r: LeaseRow) {
    if (!confirm("Cancel this lease?")) return;
    setBusy(`cancel-${r.lease.id}`);
    setError(null);
    try {
      await cancelLease(tenantId, actorId, r.lease.id, tenantSlug);
      setRows((prev) => prev.map((x) => (x.lease.id === r.lease.id ? { ...x, lease: { ...x.lease, status: "cancelled" } } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(null);
    }
  }

  function ActionButtons({ r }: { r: LeaseRow }) {
    const id = r.lease.id;
    if (r.lease.status === "draft") {
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStart(r)}
            disabled={busy === `start-${id}`}
            className={cx(ICON_BTN, "text-success hover:bg-success-soft")}
            title="Start lease"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleCancel(r)}
            disabled={busy === `cancel-${id}`}
            className={cx(ICON_BTN, "text-ink-3 hover:bg-sunken hover:text-ink-2")}
            title="Cancel"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      );
    }
    if (r.lease.status === "active") {
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleComplete(r)}
            disabled={busy === `complete-${id}`}
            className={cx(ICON_BTN, "text-success hover:bg-success-soft")}
            title="Complete"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDefault(r)}
            disabled={busy === `default-${id}`}
            className={cx(ICON_BTN, "text-danger hover:bg-danger-soft")}
            title="Mark defaulted"
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Leases"
        subtitle={`${rows.length} lease-to-own contract${rows.length === 1 ? "" : "s"} on record`}
        icon={<FileSignature className="h-4.5 w-4.5" />}
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Create lease
          </Button>
        }
      />

      {showModal && (
        <CreateLeaseModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          actorId={actorId}
          vehicles={options.vehicles}
          customers={options.customers}
          onClose={() => setShowModal(false)}
          onCreated={() => window.location.reload()}
        />
      )}

      {error && (
        <div className="mb-4 rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileSignature className="h-5 w-5" />}
          title="No leases yet"
          description="Create your first lease-to-own contract to get started."
          action={
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> Create lease
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader title="Lease contracts" count={rows.length} />
          <Table>
            <thead>
              <tr>
                <TH>Contract</TH>
                <TH>Customer</TH>
                <TH>Vehicle</TH>
                <TH>Term</TH>
                <TH className="text-right">Monthly</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Balance</TH>
                <TH>Status</TH>
                <TH>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.lease.id} className="transition-colors hover:bg-sunken/50">
                  <TD className="font-medium text-ink">
                    <Link
                      href={`/${tenantSlug}/leases/${r.lease.id}`}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {r.lease.contractRef}
                    </Link>
                  </TD>
                  <TD>{r.customerName ?? "—"}</TD>
                  <TD>
                    <span className="font-medium text-ink">{r.vehiclePlate ?? "—"}</span>
                    <div className="text-[11px] text-ink-3">
                      {r.vehicleMake} {r.vehicleModel}
                    </div>
                  </TD>
                  <TD className="whitespace-nowrap tnum">
                    {formatDate(r.lease.startDate)}
                    <span className="text-ink-3"> → </span>
                    {formatDate(r.lease.endDate)}
                    <div className="text-[11px] text-ink-3">{r.lease.termMonths} months</div>
                  </TD>
                  <TD className="whitespace-nowrap text-right tnum">{formatCurrency(r.lease.monthlyPayment)}</TD>
                  <TD className="whitespace-nowrap text-right font-medium text-ink tnum">
                    {formatCurrency(r.lease.totalAmount)}
                  </TD>
                  <TD className="whitespace-nowrap text-right tnum">
                    {r.lease.balanceDue > 0 ? (
                      <span className="font-medium text-danger">{formatCurrency(r.lease.balanceDue)}</span>
                    ) : (
                      <span className="text-success">Paid</span>
                    )}
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[r.lease.status] ?? "neutral"}>
                      <span className={r.lease.status === "cancelled" ? "line-through" : undefined}>
                        {r.lease.status}
                      </span>
                    </Badge>
                  </TD>
                  <TD>
                    <ActionButtons r={r} />
                  </TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}

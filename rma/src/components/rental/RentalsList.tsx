"use client";

import { useEffect, useState } from "react";
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
import { CreateRentalModal } from "@/components/modals/CreateRentalModal";
import { RecordPaymentModal } from "@/components/modals/RecordPaymentModal";
import { ProcessReturnModal } from "@/components/modals/ProcessReturnModal";
import { DocumentPanel } from "@/components/documents/DocumentPanel";
import { Paperclip, Play, RotateCcw, CheckCircle2, XCircle, Banknote, KeyRound, Plus } from "lucide-react";
import Link from "next/link";
import { getRentVehicles } from "@/modules/rental/queries";
import { startRental, completeRental, cancelRental } from "@/modules/rental/actions";
import { formatCurrency, formatDate } from "@/lib/format";

type Rental = {
  id: string;
  startDate: Date | null;
  returnDate: Date | null;
  actualReturnDate: Date | null;
  dailyRate: number;
  totalDays: number;
  deposit: number;
  total: number;
  balanceDue: number;
  status: string;
  notes: string | null;
};

type RentalRow = {
  rental: Rental;
  customerName: string | null;
  vehiclePlate: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
};

type VehicleOption = { id: string; make: string; model: string; plate: string; dailyRate?: number };

const STATUS_TONE: Record<string, BadgeTone> = {
  reserved: "warning",
  active: "success",
  returned: "info",
  completed: "neutral",
  cancelled: "neutral",
};

export default function RentalsList({
  rentals,
  tenantSlug,
  tenantId,
  actorId,
}: {
  rentals: RentalRow[];
  tenantSlug: string;
  tenantId: string;
  actorId?: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [docRental, setDocRental] = useState<RentalRow | null>(null);
  const [paymentRental, setPaymentRental] = useState<RentalRow | null>(null);
  const [returnRental, setReturnRental] = useState<RentalRow | null>(null);
  const [rows, setRows] = useState<RentalRow[]>(rentals);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Server refresh delivered a new `rentals` prop — drop optimistic rows and
  // resync (render-time adjustment instead of a setState-in-effect).
  const [prevRentals, setPrevRentals] = useState(rentals);
  if (prevRentals !== rentals) {
    setPrevRentals(rentals);
    setRows(rentals);
  }

  useEffect(() => {
    if (showModal) {
      getRentVehicles(tenantId)
        .then((v) => {
          setVehicles(v as VehicleOption[]);
        })
        .catch((e) =>
          setError(e instanceof Error ? e.message : "Failed to load vehicles.")
        );
    }
  }, [showModal, tenantId]);

  async function handleStart(r: RentalRow) {
    setBusy(`start-${r.rental.id}`);
    setError(null);
    try {
      await startRental(tenantId, actorId, r.rental.id, tenantSlug);
      setRows((prev) =>
        prev.map((x) => (x.rental.id === r.rental.id ? { ...x, rental: { ...x.rental, status: "active" } } : x))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start failed");
    } finally {
      setBusy(null);
    }
  }

  function handleReturn(r: RentalRow) {
    setReturnRental(r);
  }

  async function handleComplete(r: RentalRow) {
    const balanceDue = Number(r.rental.balanceDue) || 0;
    const confirmMsg =
      balanceDue > 0
        ? `This rental still owes ${balanceDue}. Completing will write off the outstanding balance. Continue?`
        : "Complete this rental?";
    if (!confirm(confirmMsg)) return;
    setBusy(`complete-${r.rental.id}`);
    setError(null);
    try {
      await completeRental(tenantId, actorId, r.rental.id, tenantSlug, balanceDue > 0);
      setRows((prev) =>
        prev.map((x) =>
          x.rental.id === r.rental.id
            ? { ...x, rental: { ...x.rental, status: "completed", balanceDue: 0 } }
            : x
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Complete failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel(r: RentalRow) {
    if (!confirm("Cancel this rental?")) return;
    setBusy(`cancel-${r.rental.id}`);
    setError(null);
    try {
      await cancelRental(tenantId, actorId, r.rental.id, tenantSlug);
      setRows((prev) =>
        prev.map((x) => (x.rental.id === r.rental.id ? { ...x, rental: { ...x.rental, status: "cancelled" } } : x))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(null);
    }
  }

  const ICON_BTN = "rounded-field p-1.5 transition-colors disabled:opacity-50";

  function ActionButtons({ r }: { r: RentalRow }) {
    const id = r.rental.id;
    if (r.rental.status === "reserved") {
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStart(r)}
            disabled={busy === `start-${id}`}
            className={cx(ICON_BTN, "text-success hover:bg-success-soft")}
            title="Start rental"
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
    if (r.rental.status === "active") {
      return (
        <div className="flex items-center gap-1">
          {r.rental.balanceDue > 0 && (
            <button
              onClick={() => setPaymentRental(r)}
              className={cx(ICON_BTN, "text-success hover:bg-success-soft")}
              title="Record payment"
            >
              <Banknote className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => handleReturn(r)}
            className={cx(ICON_BTN, "text-info hover:bg-info-soft")}
            title="Process return"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      );
    }
    if (r.rental.status === "returned") {
      return (
        <div className="flex items-center gap-1">
          {r.rental.balanceDue > 0 && (
            <button
              onClick={() => setPaymentRental(r)}
              className={cx(ICON_BTN, "text-success hover:bg-success-soft")}
              title="Record payment"
            >
              <Banknote className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => handleComplete(r)}
            disabled={busy === `complete-${id}`}
            className={cx(ICON_BTN, "text-success hover:bg-success-soft")}
            title="Complete"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Rentals"
        subtitle={`${rows.length} rental${rows.length === 1 ? "" : "s"} on record`}
        icon={<KeyRound className="h-4.5 w-4.5" />}
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Create rental
          </Button>
        }
      />

      {showModal && (
        <CreateRentalModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          actorId={actorId}
          vehicles={vehicles}
          onClose={() => setShowModal(false)}
          onCreated={() => window.location.reload()}
        />
      )}

      {docRental && (
        <div className="mb-6">
          <DocumentPanel
            tenantId={tenantId}
            entityType="rental"
            entityId={docRental.rental.id}
            entityLabel={`Rental — ${docRental.customerName}`}
            onClose={() => setDocRental(null)}
          />
        </div>
      )}

      {paymentRental && (
        <RecordPaymentModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          rentalId={paymentRental.rental.id}
          customerName={paymentRental.customerName}
          maxAmount={paymentRental.rental.balanceDue}
          onClose={() => setPaymentRental(null)}
          onRecorded={() => window.location.reload()}
        />
      )}

      {returnRental && (
        <ProcessReturnModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          actorId={actorId}
          rental={{
            id: returnRental.rental.id,
            returnDate: returnRental.rental.returnDate,
            dailyRate: returnRental.rental.dailyRate,
            balanceDue: returnRental.rental.balanceDue,
          }}
          onClose={() => setReturnRental(null)}
          onReturned={() => window.location.reload()}
        />
      )}

      {error && (
        <div className="mb-4 rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<KeyRound className="h-5 w-5" />}
          title="No rentals yet"
          description="Create your first rental to get started."
          action={
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> Create rental
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader title="Rental history" count={rows.length} />
          <Table>
            <thead>
              <tr>
                <TH>Customer</TH>
                <TH>Vehicle</TH>
                <TH>Period</TH>
                <TH className="text-right">Rate</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Balance</TH>
                <TH>Status</TH>
                <TH>Actions</TH>
                <TH>Docs</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rental.id} className="transition-colors hover:bg-sunken/50">
                  <TD className="font-medium text-ink">
                    <Link
                      href={`/${tenantSlug}/rentals/${r.rental.id}`}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {r.customerName ?? "—"}
                    </Link>
                  </TD>
                  <TD>
                    <span className="font-medium text-ink">{r.vehiclePlate ?? "—"}</span>
                    <div className="text-[11px] text-ink-3">
                      {r.vehicleMake} {r.vehicleModel}
                    </div>
                  </TD>
                  <TD className="whitespace-nowrap tnum">
                    {formatDate(r.rental.startDate)}
                    <span className="text-ink-3"> → </span>
                    {formatDate(r.rental.returnDate)}
                    <div className="text-[11px] text-ink-3">{r.rental.totalDays} days</div>
                  </TD>
                  <TD className="whitespace-nowrap text-right tnum">{formatCurrency(r.rental.dailyRate)}</TD>
                  <TD className="whitespace-nowrap text-right font-medium text-ink tnum">
                    {formatCurrency(r.rental.total)}
                  </TD>
                  <TD className="whitespace-nowrap text-right tnum">
                    {r.rental.balanceDue > 0 ? (
                      <span className="font-medium text-danger">{formatCurrency(r.rental.balanceDue)}</span>
                    ) : (
                      <span className="text-success">Paid</span>
                    )}
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[r.rental.status] ?? "neutral"}>
                      <span className={r.rental.status === "cancelled" ? "line-through" : undefined}>
                        {r.rental.status}
                      </span>
                    </Badge>
                  </TD>
                  <TD>
                    <ActionButtons r={r} />
                  </TD>
                  <TD>
                    <button
                      onClick={() => setDocRental(r)}
                      className={cx(
                        ICON_BTN,
                        docRental?.rental.id === r.rental.id
                          ? "bg-brand-50 text-brand-700"
                          : "text-ink-3 hover:bg-sunken hover:text-ink-2"
                      )}
                      aria-label="Documents"
                      title="Documents"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
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

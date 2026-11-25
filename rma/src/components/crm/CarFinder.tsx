"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { findVehiclesForDeal, type FinderVehicle } from "@/modules/fleet/finder-queries";
import { attachVehicleToDeal } from "@/modules/crm/actions";
import { Button, Input, Label, Badge, cx, type BadgeTone } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { Search, Car, Check } from "lucide-react";

// Vehicle status → RU badge. Text carries the meaning; the tone just supports it.
const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  available: { label: "Available", tone: "success" },
  on_rent: { label: "On rent", tone: "warning" },
  reserved: { label: "Reserved", tone: "warning" },
  in_service: { label: "In service", tone: "info" },
  overdue: { label: "Overdue", tone: "danger" },
};

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtDate(d: Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/**
 * "Подобрать авто" — the deal-side car finder. A salesperson on a live deal
 * ("customer wants a Nissan Patrol, ~250k") searches the real fleet by
 * make/model, sees which cars are actually free in the requested window (read
 * from the same calendar the availability board uses), reads the Kaiten sales
 * spec, and attaches one to the deal in a single tap.
 */
export function CarFinder({
  tenantId,
  tenantSlug,
  dealId,
  defaultQuery = "",
  attachedVehicleId,
  onClose,
}: {
  tenantId: string;
  tenantSlug: string;
  dealId: string;
  defaultQuery?: string;
  attachedVehicleId?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const today = new Date();
  const weekOut = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [start, setStart] = useState(toDateInput(today));
  const [end, setEnd] = useState(toDateInput(weekOut));

  const [results, setResults] = useState<FinderVehicle[] | null>(null);
  // The first search fires on mount, so the modal opens in the loading state.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attaching, startAttach] = useTransition();
  const [attachingId, setAttachingId] = useState<string | null>(null);

  async function runSearch() {
    setError(null);
    setLoading(true);
    try {
      const res = await findVehiclesForDeal(tenantId, {
        query,
        start: new Date(start + "T00:00:00"),
        end: new Date(end + "T23:59:59"),
      });
      setResults(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  // First open: search immediately with whatever the deal seeded. `loading`
  // starts true, so state is only written from the promise callbacks.
  useEffect(() => {
    findVehiclesForDeal(tenantId, {
      query,
      start: new Date(start + "T00:00:00"),
      end: new Date(end + "T23:59:59"),
    })
      .then((res) => setResults(res))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Search failed."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAttach(v: FinderVehicle) {
    setError(null);
    setAttachingId(v.id);
    startAttach(async () => {
      try {
        await attachVehicleToDeal(tenantId, dealId, v.id);
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't attach the car.");
        setAttachingId(null);
      }
    });
  }

  return (
    <Modal
      title="Find a car"
      subtitle="Search the fleet by real availability for the requested dates"
      onClose={onClose}
      width="xl"
    >
      {/* Search controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <Label htmlFor="cf-q">Make / model</Label>
          <Input
            id="cf-q"
            className="w-full"
            placeholder="e.g. patrol"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch();
            }}
          />
        </div>
        <div>
          <Label htmlFor="cf-start">From</Label>
          <Input id="cf-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cf-end">To</Label>
          <Input id="cf-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={() => void runSearch()} disabled={loading} className="w-full">
            <Search className="h-4 w-4" /> {loading ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* Results */}
      <div className="mt-4 space-y-2">
        {loading && !results && <p className="py-8 text-center text-sm text-ink-3">Loading…</p>}
        {results && results.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-3">
            Nothing found for that query. Try a different make or model.
          </p>
        )}
        {results?.map((v) => {
          const st = STATUS[v.status] ?? { label: v.status, tone: "neutral" as BadgeTone };
          const isAttached = attachedVehicleId === v.id;
          return (
            <div
              key={v.id}
              className={cx(
                "flex gap-3 rounded-card border p-3",
                v.available ? "border-line bg-surface" : "border-line-soft bg-sunken/40"
              )}
            >
              {/* Photo / placeholder */}
              <a
                href={`/${tenantSlug}/fleet/${v.id}`}
                target="_blank"
                rel="noreferrer"
                className="relative h-16 w-24 shrink-0 overflow-hidden rounded-field bg-sunken"
              >
                {v.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.photo} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-ink-3">
                    <Car className="h-5 w-5" />
                  </span>
                )}
                {v.photoCount > 1 && (
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-ink/70 px-1 text-[10px] font-medium text-white tnum">
                    {v.photoCount}
                  </span>
                )}
              </a>

              {/* Detail */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/${tenantSlug}/fleet/${v.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-ink hover:underline"
                  >
                    {`${v.make} ${v.model}`.trim()}
                    {v.year ? ` · ${v.year}` : ""}
                  </a>
                  {v.plate ? (
                    <span className="font-mono text-xs text-ink-3">{v.plate}</span>
                  ) : (
                    <span className="text-xs text-ink-3">no plate</span>
                  )}
                  <Badge tone={st.tone}>{st.label}</Badge>
                  {v.kaitenColumn && (
                    <span className="text-[11px] text-ink-3">· {v.kaitenColumn}</span>
                  )}
                </div>

                {/* Availability + hand + rate */}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                  {v.available ? (
                    <span className="font-medium text-success">Available on these dates</span>
                  ) : (
                    <span className="font-medium text-warn">
                      Booked{v.freeFrom ? ` until ${fmtDate(v.freeFrom)}` : ""}
                    </span>
                  )}
                  {v.dailyRate > 0 && (
                    <span className="text-ink-3 tnum">{v.dailyRate} AED / day</span>
                  )}
                  {v.companyName && <span className="text-ink-3">· at {v.companyName}</span>}
                </div>

                {v.kaitenNotes && (
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-ink-2">
                    {v.kaitenNotes}
                  </p>
                )}
              </div>

              {/* Attach */}
              <div className="flex shrink-0 items-center">
                {isAttached ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                    <Check className="h-4 w-4" /> Attached
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAttach(v)}
                    disabled={attaching}
                  >
                    {attaching && attachingId === v.id ? "…" : "Attach"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

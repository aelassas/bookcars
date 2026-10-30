import { Badge } from "@/components/ui";
import { Images, FileText, CalendarClock, Building2 } from "lucide-react";
import type { VehicleAvailabilitySummary } from "@/modules/fleet/finder-queries";

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * The Kaiten side of a car's profile — everything the sync now carries through
 * from the fleet's source-of-truth board: showroom photos, the verbatim sales
 * spec, the board column it lives in, the hand currently holding it, and a live
 * "free / booked" line read from the same calendar the availability board uses.
 *
 * Server component: photos are public files.kaiten.ru URLs, so a plain <img>
 * loads them and no client JS is needed.
 */
export function VehicleKaitenPanel({
  photos,
  notes,
  kaitenColumn,
  companyName,
  availability,
}: {
  photos: { url: string; name: string }[] | null;
  notes: string | null;
  kaitenColumn: string | null;
  companyName: string | null;
  availability: VehicleAvailabilitySummary;
}) {
  const hasPhotos = !!photos?.length;
  const hasNotes = !!notes?.trim();
  if (!hasPhotos && !hasNotes && !kaitenColumn) return null;

  return (
    <section className="mt-6 rounded-card border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
          Car finder · Kaiten
        </span>
        {kaitenColumn && <Badge tone="neutral">{kaitenColumn}</Badge>}
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {companyName && (
            <span className="inline-flex items-center gap-1 text-ink-3">
              <Building2 className="h-3.5 w-3.5" /> with {companyName}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5 text-ink-3" />
            {availability.busyNow ? (
              <span className="font-medium text-warn">
                Booked{availability.freeFrom ? ` until ${fmt(availability.freeFrom)}` : ""}
              </span>
            ) : (
              <span className="font-medium text-success">
                Available
                {availability.nextBookingStart
                  ? ` · next booking ${fmt(availability.nextBookingStart)}`
                  : ""}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-5">
        {/* Photos */}
        <div className="lg:col-span-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
            <Images className="h-4 w-4" /> Photos
            {hasPhotos && (
              <span className="rounded-full bg-sunken px-1.5 py-px text-[11px] tnum">
                {photos!.length}
              </span>
            )}
          </div>
          {hasPhotos ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos!.map((p) => (
                <a
                  key={p.url}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-[4/3] overflow-hidden rounded-field bg-sunken"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-3">No photos on the Kaiten card.</p>
          )}
        </div>

        {/* Sales spec */}
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
            <FileText className="h-4 w-4" /> Description
          </div>
          {hasNotes ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{notes}</p>
          ) : (
            <p className="text-sm text-ink-3">No description on the Kaiten card.</p>
          )}
        </div>
      </div>
    </section>
  );
}

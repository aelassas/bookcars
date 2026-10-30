/* eslint-disable @next/next/no-img-element */
import { brandLogoPath } from "@/lib/brand-logos";
import { normalizePilotVehicle } from "@/platform/integrations/pilot/normalize";

// Small manufacturer brand mark for a vehicle, rendered as a plain <img> from
// the vendored car-logos-dataset PNGs. When `name` is a generic placeholder
// ("Car"/"Машина"/empty), the optional `fallback` (typically the plate line)
// is sniffed for a brand keyword. Renders nothing when no brand resolves.
export function BrandLogo({
  name,
  fallback,
  size = 44,
  className = "",
}: {
  name: string;
  fallback?: string;
  size?: number;
  className?: string;
}) {
  const { make } = normalizePilotVehicle({ name, plate: fallback });
  const src = make ? brandLogoPath(make) : null;
  if (!src || !make) return null;
  return (
    <img
      src={src}
      alt={make}
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}

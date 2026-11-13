"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { Badge, Button, Input, Label } from "@/components/ui";
import { addWebsitePhoto, removeWebsitePhoto, setWebsiteListing } from "@/modules/fleet/website-actions";
import type { WebsiteCarPhoto } from "@/modules/fleet/website";

export interface WebsiteVehicle {
  id: string;
  make: string;
  model: string;
  plate: string;
  dailyRate: number;
  published: boolean;
  category: string | null;
  photos: WebsiteCarPhoto[];
}

export function WebsiteFleetManager({ tenantId, vehicles }: { tenantId: string; vehicles: WebsiteVehicle[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(id: string, action: () => Promise<void>) {
    setBusy(id);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Website update failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {error && <p role="alert" className="text-sm text-danger xl:col-span-2">{error}</p>}
      {vehicles.map((car) => (
        <section key={car.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-ink">{car.make} {car.model}</h2>
              <p className="font-mono text-xs text-ink-3">{car.plate}</p>
            </div>
            <Badge tone={car.published ? "success" : "neutral"}>{car.published ? "On website" : "Hidden"}</Badge>
          </div>

          {car.photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {car.photos.map((photo) => (
                <div key={photo.url} className="relative overflow-hidden rounded-field border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.name} className="aspect-4/3 w-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Remove ${photo.name}`}
                    disabled={busy !== null}
                    onClick={() => run(`${car.id}:photo`, () => removeWebsitePhoto(tenantId, car.id, photo.url))}
                    className="absolute right-1 top-1 rounded-field bg-black/70 p-1.5 text-white hover:bg-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            className="mt-4 grid grid-cols-2 gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const fd = new FormData(event.currentTarget);
              return run(car.id, () => setWebsiteListing(tenantId, car.id, {
                published: fd.get("published") === "on",
                category: String(fd.get("category") ?? ""),
                dailyRate: Number(fd.get("dailyRate")),
              }));
            }}
          >
            <div>
              <Label>Website category</Label>
              <Input name="category" defaultValue={car.category ?? ""} placeholder="Premium SUV" className="w-full" maxLength={80} />
            </div>
            <div>
              <Label>Daily rate (AED)</Label>
              <Input name="dailyRate" type="number" min={0} step={1} required defaultValue={car.dailyRate} className="w-full" />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" name="published" defaultChecked={car.published} />
              Show on public website
            </label>
            <Button type="submit" disabled={busy !== null}>{busy === car.id ? "Saving…" : "Save listing"}</Button>
          </form>

          <form
            className="mt-4 flex flex-wrap items-end gap-2 border-t border-line-soft pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              return run(`${car.id}:photo`, async () => {
                await addWebsitePhoto(tenantId, car.id, new FormData(form));
                form.reset();
              });
            }}
          >
            <div className="min-w-0 flex-1">
              <Label>Add photo</Label>
              <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="w-full text-xs text-ink-2" />
            </div>
            <Button type="submit" variant="secondary" disabled={busy !== null}>
              <ImagePlus className="h-4 w-4" /> Upload
            </Button>
          </form>
        </section>
      ))}
    </div>
  );
}

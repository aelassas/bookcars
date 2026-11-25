"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { uploadDocumentForEntity } from "@/modules/documents/actions";
import { formatDate } from "@/lib/format";
import type { RentalOdometerPhoto } from "@/modules/rental/queries";

export function OdometerPhotoPanel({ tenantId, rentalId, photos, canManage }: {
  tenantId: string;
  rentalId: string;
  photos: RentalOdometerPhoto[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [odometer, setOdometer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadDocumentForEntity(tenantId, {
        entityType: "rental",
        entityId: rentalId,
        category: "odometer",
        file,
        odometer: Number(odometer),
      });
      setFile(null);
      setOdometer("");
      form.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to upload the odometer photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {photos.length === 0 ? (
        <p className="text-sm text-ink-3">No odometer photos yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <a key={photo.id} href={`/api/files/${photo.id}`} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-field border border-line-soft bg-sunken">
              <Image src={`/api/files/${photo.id}`} alt={`Odometer ${photo.odometer ?? "reading"} km`} width={320} height={180} unoptimized className="h-36 w-full object-cover" />
              <div className="p-2 text-xs">
                <div className="font-semibold text-ink tnum">{photo.odometer === null ? "Reading not recorded" : `${photo.odometer.toLocaleString()} km`}</div>
                <div className="mt-0.5 truncate text-ink-3" title={photo.filename}>{formatDate(photo.createdAt)} · {photo.filename}</div>
              </div>
            </a>
          ))}
        </div>
      )}
      {canManage && <form onSubmit={upload} className="flex flex-wrap items-end gap-2 border-t border-line-soft pt-3">
        <div><Label>Odometer reading (km)</Label><Input type="number" min={0} step={1} required value={odometer} onChange={(event) => setOdometer(event.target.value)} placeholder="e.g. 8115" /></div>
        <div><Label>Actual odometer photo</Label><Input type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div>
        <Button type="submit" size="sm" disabled={busy || !file || !odometer}>{busy ? "Uploading…" : "Add reading & photo"}</Button>
      </form>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

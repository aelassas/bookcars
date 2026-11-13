import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant, vehicle } from "@/platform/db/schema";
import { publicPhotoUrl, type WebsiteCarPhoto } from "@/modules/fleet/website";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { clientIp, rateLimit } from "@/platform/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limit = rateLimit({ key: `public-site-cars:${clientIp(req)}`, limit: 120, windowMs: 60_000 });
  if (!limit.ok) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Access-Control-Allow-Origin": "*" } });
  const [rma] = await db.select({ id: tenant.id }).from(tenant).where(eq(tenant.slug, "rma")).limit(1);
  if (!rma) return Response.json({ cars: [] }, { status: 404 });

  const rows = await withDrizzleTenant(rma.id, async (tx) => tx
    .select({
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      plate: vehicle.plate,
      dailyRate: vehicle.dailyRate,
      category: vehicle.websiteCategory,
      photos: vehicle.photos,
    })
    .from(vehicle)
    .where(and(
      eq(vehicle.tenantId, rma.id),
      eq(vehicle.websitePublished, true),
      ne(vehicle.status, "sold"),
    ))
    .orderBy(asc(vehicle.make), asc(vehicle.model), asc(vehicle.plate)));

  const cars = rows.map((car) => ({
    id: car.id,
    name: `${car.make} ${car.model}`.trim(),
    plate: car.plate,
    price: car.dailyRate,
    category: car.category || "Premium",
    photo: (car.photos ?? []).map((photo: WebsiteCarPhoto) => publicPhotoUrl(photo.url)).find(Boolean) ?? null,
  }));

  return Response.json(
    { cars },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } },
  );
}

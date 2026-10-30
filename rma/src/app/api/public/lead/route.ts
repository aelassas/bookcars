// Public lead ingestion from onwheelsrent.ae landing.
// POST /api/public/lead
// Body: { tenantSlug, name, phone, carPlate?, startDate?, endDate?, note? }

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant, customer, message } from "@/platform/db/schema";

const ORIGIN = "*";

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return cors(NextResponse.json({ error: "bad json" }, { status: 400 })); }

  const tenantSlug = String(body.tenantSlug || "").trim();
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  if (!tenantSlug || !name || !phone) {
    return cors(NextResponse.json({ error: "tenantSlug, name, phone required" }, { status: 400 }));
  }

  const t = await db.select().from(tenant).where(eq(tenant.slug, tenantSlug)).limit(1).then((r) => r[0] ?? null);
  if (!t) return cors(NextResponse.json({ error: "tenant not found" }, { status: 404 }));

  // Dedupe by phone — reuse existing customer if phone matches
  const existing = await db.select().from(customer)
    .where(and(eq(customer.tenantId, t.id), eq(customer.phone, phone)))
    .limit(1).then((r) => r[0] ?? null);

  let custId: string;
  if (existing) {
    custId = existing.id;
  } else {
    const insertedRes: any = await db.insert(customer).values({
      tenantId: t.id, name, phone, division: "rent", source: "website",
    }).returning();
    const inserted = Array.isArray(insertedRes) ? insertedRes : insertedRes.rows; custId = inserted[0].id;
  }

  // Also drop a message into the inbox so sales sees it
  const carPlate = String(body.carPlate || "").trim();
  const startDate = String(body.startDate || "").trim();
  const endDate = String(body.endDate || "").trim();
  const note = String(body.note || "").trim();
  const text = [
    `Lead from website (onwheelsrent.ae)`,
    carPlate ? `Car: ${carPlate}` : null,
    (startDate || endDate) ? `Dates: ${startDate || "?"} → ${endDate || "?"}` : null,
    note ? `Note: ${note}` : null,
  ].filter(Boolean).join("\n");

  await db.insert(message).values({
    tenantId: t.id,
    channel: "website" as any,
    from: phone,
    body: text,
    status: "new" as any,
    customerName: name,
  });

  return cors(NextResponse.json({ ok: true, customerId: custId }, { status: 201 }));
}

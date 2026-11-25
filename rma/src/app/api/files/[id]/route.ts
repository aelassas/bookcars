import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { document } from "@/platform/db/schema";
import { auth } from "@/platform/auth";
import { getTenantRoles, isPlatformAdmin } from "@/platform/auth/authorization";

// Authenticated document serving. Files live in the private .private-uploads dir
// (never under public/). Only a member of the document's tenant — or a platform
// admin — may fetch it. Replaces the previous public/uploads direct links.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [doc] = await db.select().from(document).where(eq(document.id, id)).limit(1);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorize: member of the document's tenant, or platform admin.
  const roles = await getTenantRoles(session.user.id, doc.tenantId);
  if (roles.length === 0 && !(await isPlatformAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const filePath = path.join(process.cwd(), ".private-uploads", "documents", doc.storageKey);
    const buf = await readFile(filePath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${(doc.filename || "file").replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}

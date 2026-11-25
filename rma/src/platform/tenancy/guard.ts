import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";

export async function assertNotPreviewMode(tenantId: string) {
  const [row] = await db
    .select({ migrationStatus: tenant.migrationStatus })
    .from(tenant)
    .where(eq(tenant.id, tenantId))
    .limit(1);

  if (row?.migrationStatus === "preview") {
    throw new Error(
      "Editing is disabled in Preview Mode. Cut over to TAKE Auto to start editing."
    );
  }
}

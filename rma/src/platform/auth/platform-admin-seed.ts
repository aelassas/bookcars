// SPEC §3.1 — seed platform admins from PLATFORM_ADMIN_EMAILS.
//
// On boot, any existing user whose email is listed (comma-separated) in
// PLATFORM_ADMIN_EMAILS gets a platform_admin row. Idempotent. Users who
// don't have an account yet are skipped — re-running after they sign up
// promotes them. Never throws into the boot path.

import { inArray } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { user, platformAdmin } from "@/platform/db/schema";

export async function ensurePlatformAdmins(): Promise<{ promoted: number; skipped: string[] }> {
  const raw = process.env.PLATFORM_ADMIN_EMAILS;
  if (!raw) return { promoted: 0, skipped: [] };

  const emails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return { promoted: 0, skipped: [] };

  const users = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.email, emails));

  const foundEmails = new Set(users.map((u) => u.email.toLowerCase()));
  const skipped = emails.filter((e) => !foundEmails.has(e));

  let promoted = 0;
  for (const u of users) {
    const res = await db
      .insert(platformAdmin)
      .values({ userId: u.id })
      .onConflictDoNothing();
    // rowCount is 1 when a new row was inserted, 0 when it already existed.
    if ((res as { rowCount?: number }).rowCount) promoted++;
  }

  return { promoted, skipped };
}

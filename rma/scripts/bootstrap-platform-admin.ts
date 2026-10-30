// Create (or update) the first platform admin on a fresh database.
// For on-prem bring-up where no users exist yet.
//
//   ADMIN_EMAIL=you@co.com ADMIN_PASSWORD='strong-pass' \
//     npx tsx scripts/bootstrap-platform-admin.ts
//
// Creates the user with a hashed password and a platform_admin row, so you
// can log in with email+password and reach /admin immediately.

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../src/platform/db/client";
import { user, platformAdmin } from "../src/platform/db/schema";

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !password) {
    console.error(
      "Usage: ADMIN_EMAIL=you@co.com ADMIN_PASSWORD='...' npx tsx scripts/bootstrap-platform-admin.ts"
    );
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);

  let [u] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (!u) {
    const ins = await db
      .insert(user)
      .values({ email, name: "Platform Admin", password: hash })
      .returning();
    u = Array.isArray(ins) ? ins[0] : ins;
    console.log(`[bootstrap] created user ${email}`);
  } else {
    await db.update(user).set({ password: hash, updatedAt: new Date() }).where(eq(user.id, u.id));
    console.log(`[bootstrap] updated password for ${email}`);
  }
  await db.insert(platformAdmin).values({ userId: u.id }).onConflictDoNothing();
  console.log(`[bootstrap] platform_admin ensured for ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[bootstrap] failed:", e.message);
    process.exit(1);
  });

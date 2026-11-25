// Manual runner for platform-admin seeding (SPEC §3.1).
//   PLATFORM_ADMIN_EMAILS="founder@x.com,support@x.com" npx tsx scripts/seed-platform-admins.ts
// Boot also runs this automatically (instrumentation.ts).

import { config } from "dotenv";
config({ path: ".env.local" });

import { ensurePlatformAdmins } from "../src/platform/auth/platform-admin-seed";

async function main() {
  const { promoted, skipped } = await ensurePlatformAdmins();
  console.log(`[seed-platform-admins] promoted ${promoted} admin(s).`);
  if (skipped.length) {
    console.log(
      `[seed-platform-admins] skipped (no user account yet): ${skipped.join(", ")}`
    );
  }
  if (!process.env.PLATFORM_ADMIN_EMAILS) {
    console.log("[seed-platform-admins] PLATFORM_ADMIN_EMAILS is not set — nothing to do.");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[seed-platform-admins] failed:", e.message);
  process.exit(1);
});

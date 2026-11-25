import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./src/platform/db/schema.ts",
    "./src/platform/db/rental-extras.ts",
    "./src/platform/db/board-schema.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});

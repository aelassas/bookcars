import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    // The WhatsApp observer lives outside src/ (it is a standalone pm2 script,
    // not part of the Next app) but its message reader is pure and MUST be
    // covered by the same `npm test` — an orphan test file is a test nobody
    // runs. See wa-observer/text-of.js.
    include: ["./src/**/*.test.ts", "../wa-observer/**/*.test.js"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

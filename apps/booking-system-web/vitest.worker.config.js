import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      main: "./src/nonProductionWorker.js",
      wrangler: {
        configPath: "./wrangler.jsonc",
      },
      miniflare: {
        bindings: {
          BETTER_AUTH_SECRET:
            "local-worker-tests-only-not-a-production-secret-value",
          GOOGLE_CLIENT_ID:
            "local-worker-google-client-id-not-a-real-credential",
          GOOGLE_CLIENT_SECRET:
            "local-worker-google-client-secret-not-a-real-credential",
          BOOKING_TEST_NOW: "2026-08-28T10:00:00.000Z",
          TEST_MIGRATIONS: await readD1Migrations(
            new URL("./migrations", import.meta.url).pathname,
          ),
        },
      },
    })),
  ],
  test: {
    include: ["src/**/*.worker.test.js"],
  },
});

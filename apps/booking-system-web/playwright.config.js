import { defineConfig, devices } from "@playwright/test";

const chromiumExecutablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./test/e2e",
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(chromiumExecutablePath === undefined
          ? {}
          : { launchOptions: { executablePath: chromiumExecutablePath } }),
      },
    },
  ],
  webServer: {
    command: "corepack pnpm run e2e:serve",
    url: "http://127.0.0.1:4173/admin",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

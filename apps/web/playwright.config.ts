import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end journeys against the real stack: Postgres (docker compose), the API, and the
 * production build of the web app. Run `pnpm build` first, then `pnpm e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], channel: process.env.PW_CHANNEL ?? "msedge" }, testIgnore: /responsive\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: process.env.PW_CHANNEL ?? "msedge" }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: [
    {
      // A disposable database per run, so journeys never touch development data.
      command: "node --env-file=.env src/scripts/reset-db.ts && node --env-file=.env src/main.ts",
      cwd: "../api",
      url: "http://localhost:4000/health/ready",
      reuseExistingServer: false,
      env: {
        DATABASE_URL: "postgres://postgres:postgres@localhost:5433/carrental_e2e",
        // Many sign-ups from one IP would trip the registration limit during a run.
        RATE_LIMIT_ENABLED: "false",
        LOG_LEVEL: "warn",
      },
      timeout: 60_000,
    },
    {
      command: "pnpm start --port 3000",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});

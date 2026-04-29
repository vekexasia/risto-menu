import { defineConfig, devices } from "@playwright/test";

/**
 * Config for live integration tests that hit the real chat worker.
 * Requires dev server (npm run dev) and chat worker (npm run worker:dev) running.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "chat-live*",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

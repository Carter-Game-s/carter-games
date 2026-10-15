import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  testMatch: "app.spec.ts",
  workers: 1,
  timeout: 240000,
  expect: { timeout: 30000 },
  outputDir: "test-results/regression",
  use: {
    baseURL: process.env.CARTER_TEST_URL || "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.PW_BROWSER_PATH,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});

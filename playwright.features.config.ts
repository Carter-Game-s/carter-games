import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  testMatch: "features.spec.ts",
  workers: 1,
  timeout: 120000,
  expect: { timeout: 20000 },
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

import { defineConfig, devices } from "@playwright/test";

// Synthetic harness controls only: no application, backend or Auth fixtures.
export default defineConfig({
  testDir: ".", testMatch: "*.spec.ts", workers: 1, retries: 0,
  expect: { timeout: 1500 }, use: { trace: "off" },
  reporter: "list",
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "ios", use: { ...devices["iPhone 13"] } },
  ],
});

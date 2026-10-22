import { defineConfig, devices } from "@playwright/test";

if (
  process.env.HCA_E2E !== "true" ||
  process.env.HCA_E2E_LOCAL !== "1" ||
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321"
) {
  throw new Error(
    "Use npm run e2e: browser tests require the verified local development backend.",
  );
}
const port = process.env.HCA_E2E_PORT ?? "3100";
if (!["3000", "3100"].includes(port))
  throw new Error("Unsupported local E2E application port.");
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "ios", use: { ...devices["iPhone 13"] } },
  ],
});

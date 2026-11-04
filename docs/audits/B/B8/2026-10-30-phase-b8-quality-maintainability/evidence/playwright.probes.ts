import { defineConfig } from "@playwright/test";
import path from "node:path";
export default defineConfig({
  testDir: ".",
  testMatch: "quality.probe.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 10000,
  expect: { timeout: 1500 },
  outputDir: path.join(process.cwd(), ".private/b8-quality/browser"),
  reporter: [["json", { outputFile: path.join(process.cwd(), "docs/audits/2026-10-30-phase-b8-quality-maintainability/evidence/browser-results.json") }]],
  use: { browserName: "chromium", headless: true, trace: "off", screenshot: "off" },
});

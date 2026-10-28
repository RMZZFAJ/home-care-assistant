import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["docs/audits/2026-10-25-production-readiness/evidence/backend-probes.test.ts"] },
  resolve: { alias: { "@": path.resolve(process.cwd(), "src") } },
});

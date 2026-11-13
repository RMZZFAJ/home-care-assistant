import { spawnSync } from "node:child_process";
import { getE2EEnvironment } from "./e2e-environment.mjs";

// Keep compilation outside Playwright's HTTP-readiness deadline. This command
// still verifies the one local stack and performs a fresh production build.
const env = getE2EEnvironment();
await import("./build-pdf-verifier.mjs");
await import("./build-pwa.mjs");
if (!(env.HCA_E2E_DIAGNOSTIC === "true" && !env.CI)) {
  const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env, stdio: "inherit" });
  if (build.error) console.error("E2E production build could not start:", build.error.message);
  process.exitCode = build.status ?? 1;
}

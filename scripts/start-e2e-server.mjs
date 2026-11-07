import { spawnSync } from "node:child_process";
import { getE2EEnvironment } from "./e2e-environment.mjs";

// Verify the actual project/container before building or starting any server.
// This also supports the VS Code extension without trusting its inherited env.
const env = getE2EEnvironment();
await import("./build-pdf-verifier.mjs");
await import("./build-legacy-test-renderer.mjs");
// Faster local diagnosis uses the same guarded stack and fictional identities.
// It never substitutes for production-build acceptance; CI always builds fresh.
const diagnostic = env.HCA_E2E_DIAGNOSTIC === "true" && !env.CI;
if (diagnostic) console.log("LOCAL DIAGNOSTIC MODE: Next dev; not production-build acceptance evidence.");
for (const args of [
  ...(!diagnostic ? [["node_modules/next/dist/bin/next", "build"]] : []),
  ["node_modules/next/dist/bin/next", diagnostic ? "dev" : "start", "--hostname", "127.0.0.1", "--port", env.HCA_E2E_PORT],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

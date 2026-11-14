import { spawnSync } from "node:child_process";
import { getE2EEnvironment } from "./e2e-environment.mjs";

// Verify the actual project/container before building or starting any server.
// This also supports the VS Code extension without trusting its inherited env.
const env = getE2EEnvironment();
// The official runner clears inherited completion flags, builds once, and only
// then starts Playwright. Direct editor launches retain the build prerequisite.
if (env.HCA_E2E_BUILD_COMPLETE !== "true") {
  const build = spawnSync(process.execPath, ["scripts/build-e2e-application.mjs"], { env, stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
// Faster local diagnosis uses the same guarded stack and fictional identities.
// It never substitutes for production-build acceptance; CI always builds fresh.
const diagnostic = env.HCA_E2E_DIAGNOSTIC === "true" && !env.CI;
if (diagnostic) console.log("LOCAL DIAGNOSTIC MODE: Next dev; not production-build acceptance evidence.");
for (const args of [
  ["node_modules/next/dist/bin/next", diagnostic ? "dev" : "start", "--hostname", "127.0.0.1", "--port", env.HCA_E2E_PORT],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

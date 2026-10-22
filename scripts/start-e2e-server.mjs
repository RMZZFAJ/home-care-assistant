import { spawnSync } from "node:child_process";
import { getE2EEnvironment } from "./e2e-environment.mjs";

// Verify the actual project/container before building or starting any server.
// This also supports the VS Code extension without trusting its inherited env.
const env = getE2EEnvironment();
for (const args of [
  ["node_modules/next/dist/bin/next", "build"],
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", env.HCA_E2E_PORT],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

import { spawnSync } from "node:child_process";
import { getE2EEnvironment } from "./e2e-environment.mjs";

const result = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
  { env: getE2EEnvironment(), stdio: "inherit" },
);
process.exit(result.status ?? 1);

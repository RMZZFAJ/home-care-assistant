// Reproducible audit-only runner. No production configuration is loaded here.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getE2EEnvironment } from "../../../../scripts/e2e-environment.mjs";
import { fixturePassword } from "../../../../scripts/test-constants.mjs";

const root = process.cwd();
const directory = resolve(root, "docs/audits/2026-10-25-production-readiness/evidence");
const [label, executable, ...args] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(label ?? "") || !executable) throw new Error("Provide a safe evidence label and executable.");
const environment = getE2EEnvironment();
if (label === "build") environment.HCA_E2E = "false";
// Unit requests deliberately use care.example; they must not inherit the E2E origin.
if (label.startsWith("unit-clean")) {
  delete environment.NEXT_PUBLIC_APP_URL;
  delete environment.VERCEL_ENV;
  delete environment.VERCEL_URL;
  delete environment.VERCEL_BRANCH_URL;
}
const secrets = [environment.NEXT_PUBLIC_SUPABASE_ANON_KEY, environment.SUPABASE_SERVICE_ROLE_KEY, fixturePassword];
const startedAt = new Date().toISOString();
let output = "";
const child = spawn(executable === "node" ? process.execPath : executable, args, { env: environment, cwd: root, stdio: ["ignore", "pipe", "pipe"] });
for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { output += chunk.toString(); });
child.on("error", (error) => { output += `\nLaunch failed: ${error.message}\n`; });
child.on("close", (exitCode) => {
  for (const secret of secrets) if (secret) output = output.replaceAll(secret, "[REDACTED]");
  output = output.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]");
  const result = { command: [executable, ...args], node: process.version, startedAt, endedAt: new Date().toISOString(), exitCode, localApi: environment.NEXT_PUBLIC_SUPABASE_URL, appOrigin: environment.NEXT_PUBLIC_APP_URL, externalSending: false, log: `${label}.log` };
  writeFileSync(resolve(directory, `${label}.log`), output);
  writeFileSync(resolve(directory, `${label}.json`), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
  console.log(output.slice(-3500));
  process.exitCode = exitCode ?? 1;
});

import { spawnSync } from "node:child_process";
import { getE2EEnvironment } from "./e2e-environment.mjs";
import { testSigningIdentity } from "../tests/support/test-signing-identity.mjs";

const environment = getE2EEnvironment();
const args = [
  "node_modules/@playwright/test/cli.js",
  "test",
  ...process.argv.slice(2),
];
const testEnv = {
  ...environment,
  HCA_PDF_TRUST_POLICY: "",
  HCA_PDF_SIGNING_SECRET: "",
  HCA_PDF_TRUST_POLICY_FILE: "",
  HCA_PDF_SIGNING_SECRET_FILE: "",
};
// Collect before an expensive application build or ephemeral key provisioning.
// A collection error cannot accidentally become a successful browser run.
const collection = spawnSync(
  process.execPath,
  process.argv.includes("--list") ? args : [...args, "--list"],
  { env: testEnv, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
);
if (collection.error || collection.status !== 0) {
  process.stderr.write(collection.stderr ?? "");
  process.stdout.write(collection.stdout ?? "");
  if (collection.error) console.error("E2E collection could not start.");
  process.exit(collection.status ?? 1);
}
if (process.argv.includes("--list")) {
  process.stdout.write(collection.stdout ?? "");
  process.exit(0);
}
console.log(
  "E2E collection passed before application build; no browser case was executed by this preflight.",
);
const identity = await testSigningIdentity();
try {
  const result = spawnSync(process.execPath, args, {
    env: {
      ...testEnv,
      HCA_PDF_TRUST_POLICY: "",
      HCA_PDF_SIGNING_SECRET: "",
      HCA_PDF_TRUST_POLICY_FILE: identity.trustFile,
      HCA_PDF_SIGNING_SECRET_FILE: identity.secretFile,
    },
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
} finally {
  await identity.dispose();
}

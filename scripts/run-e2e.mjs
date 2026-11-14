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
  HCA_E2E_BUILD_COMPLETE: "",
  HCA_PDF_TRUST_POLICY: "",
  HCA_PDF_SIGNING_SECRET: "",
  HCA_PDF_TRUST_POLICY_FILE: "",
  HCA_PDF_SIGNING_SECRET_FILE: "",
  HCA_WEB_PUSH_SECRET: "",
  HCA_WEB_PUSH_SECRET_FILE: "",
  WEB_PUSH_EXTERNAL_ENABLED: "false",
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
  const applicationEnv = {
    ...testEnv,
    HCA_PDF_TRUST_POLICY: "",
    HCA_PDF_SIGNING_SECRET: "",
    HCA_PDF_TRUST_POLICY_FILE: identity.trustFile,
    HCA_PDF_SIGNING_SECRET_FILE: identity.secretFile,
    HCA_WEB_PUSH_SECRET_FILE: identity.pushFile,
  };
  const build = spawnSync(process.execPath, ["scripts/build-e2e-application.mjs"], {
    env: applicationEnv,
    stdio: "inherit",
  });
  if (build.error || build.status !== 0) {
    if (build.error) console.error("E2E production build could not start.");
    process.exitCode = build.status ?? 1;
  } else {
    console.log(applicationEnv.HCA_E2E_DIAGNOSTIC === "true" && !applicationEnv.CI
      ? "Diagnostic E2E assets prepared; this is not production-build acceptance."
      : "Fresh E2E production build passed before HTTP-readiness checks.");
    const result = spawnSync(process.execPath, args, {
      env: { ...applicationEnv, HCA_E2E_BUILD_COMPLETE: "true" },
      stdio: "inherit",
    });
    process.exitCode = result.status ?? 1;
  }
} finally {
  await identity.dispose();
}

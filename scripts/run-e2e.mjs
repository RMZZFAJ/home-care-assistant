import { spawnSync } from "node:child_process";
import { getE2EEnvironment } from "./e2e-environment.mjs";
import { testSigningIdentity } from "../tests/support/test-signing-identity.mjs";

const environment = getE2EEnvironment();
const identity = await testSigningIdentity();
try {
  const result = spawnSync(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    {
      env: {
        ...environment,
        HCA_PDF_TRUST_POLICY: "",
        HCA_PDF_SIGNING_SECRET: "",
        HCA_PDF_TRUST_POLICY_FILE: identity.trustFile,
        HCA_PDF_SIGNING_SECRET_FILE: identity.secretFile,
      },
      stdio: "inherit",
    },
  );
  process.exitCode = result.status ?? 1;
} finally {
  await identity.dispose();
}

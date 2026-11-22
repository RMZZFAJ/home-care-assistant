import { beforeAll, afterAll, afterEach, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { testSigningIdentity } from "./support/test-signing-identity.mjs";
import {
  loadPdfSigningProvider,
  loadPdfTrust,
  issuanceTrust,
} from "@/lib/server/pdf-signing/providers";
let identity: Awaited<ReturnType<typeof testSigningIdentity>>;
const names = [
  "HCA_PDF_TRUST_POLICY",
  "HCA_PDF_TRUST_POLICY_FILE",
  "HCA_PDF_SIGNING_SECRET",
  "HCA_PDF_SIGNING_SECRET_FILE",
  "VERCEL_ENV",
];
const original = names.map((name) => process.env[name]);
beforeAll(async () => {
  identity = await testSigningIdentity();
}, 30000);
afterEach(() => {
  names.forEach((name, i) => {
    if (original[i] === undefined) delete process.env[name];
    else process.env[name] = original[i];
  });
});
afterAll(async () => {
  await identity?.dispose();
});
function configure() {
  delete process.env.VERCEL_ENV;
  delete process.env.HCA_PDF_TRUST_POLICY;
  delete process.env.HCA_PDF_SIGNING_SECRET;
  process.env.HCA_PDF_TRUST_POLICY_FILE = identity.trustFile;
  process.env.HCA_PDF_SIGNING_SECRET_FILE = identity.secretFile;
}
it("loads distinct protected local keys and preserves public historical trust without the signing secret", async () => {
  configure();
  expect((await loadPdfSigningProvider()).keyVersion).toBe("ephemeral-test-v1");
  delete process.env.HCA_PDF_SIGNING_SECRET_FILE;
  const trust = await loadPdfTrust();
  expect(issuanceTrust(trust, "ephemeral-test-v1").roots).toHaveLength(1);
  await expect(loadPdfSigningProvider()).rejects.toMatchObject({
    code: "SIGNING_UNAVAILABLE",
  });
});
it("refuses cross-environment custody and files inside the workspace", async () => {
  configure();
  process.env.VERCEL_ENV = "production";
  await expect(loadPdfTrust()).rejects.toMatchObject({
    code: "SIGNING_UNAVAILABLE",
  });
  delete process.env.VERCEL_ENV;
  process.env.HCA_PDF_TRUST_POLICY_FILE = process.cwd() + "/package.json";
  await expect(loadPdfTrust()).rejects.toMatchObject({
    code: "SIGNING_UNAVAILABLE",
  });
});
it("accepts the value adapter but refuses a revoked active key or ambiguous configuration", async () => {
  configure();
  const trust = JSON.parse(await readFile(identity.trustFile, "utf8"));
  delete process.env.HCA_PDF_TRUST_POLICY_FILE;
  delete process.env.HCA_PDF_SIGNING_SECRET_FILE;
  process.env.HCA_PDF_TRUST_POLICY = JSON.stringify(trust);
  process.env.HCA_PDF_SIGNING_SECRET = await readFile(
    identity.secretFile,
    "utf8",
  );
  expect((await loadPdfSigningProvider()).trustRevision).toBe(
    "ephemeral-test-v1",
  );
  trust.revokedFingerprints = [trust.issuers[0].signerFingerprint];
  process.env.HCA_PDF_TRUST_POLICY = JSON.stringify(trust);
  await expect(loadPdfSigningProvider()).rejects.toMatchObject({
    code: "SIGNING_UNAVAILABLE",
  });
  process.env.HCA_PDF_TRUST_POLICY_FILE = identity.trustFile;
  await expect(loadPdfTrust()).rejects.toMatchObject({
    code: "SIGNING_UNAVAILABLE",
  });
});

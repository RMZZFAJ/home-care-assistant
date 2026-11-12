import { beforeAll, afterAll, afterEach, it, expect, vi } from "vitest";
import { mkdir, readFile, readdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash, randomBytes, X509Certificate } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { testSigningIdentity } from "./support/test-signing-identity.mjs";
import { sealBackup, verifyBackup, extractBackup } from "../scripts/backup-archive.mjs";
import { loadPdfSigningProvider, loadPdfTrust, issuanceTrust, type PdfTrustConfiguration } from "@/lib/server/pdf-signing/providers";
import { signTechnicalPdf } from "@/lib/server/pdf-signing/sign";
import { verifyTechnicalPdf } from "@/lib/server/pdf-signing/verify";

type Identity = Awaited<ReturnType<typeof testSigningIdentity>>;
let original: Identity, renewed: Identity, rotated: Identity;
let policy: PdfTrustConfiguration, unsigned: Uint8Array, historical: Uint8Array, current: Uint8Array;
const environmentNames = ["VERCEL_ENV", "HCA_PDF_TRUST_POLICY", "HCA_PDF_TRUST_POLICY_FILE", "HCA_PDF_SIGNING_SECRET", "HCA_PDF_SIGNING_SECRET_FILE"];
const previousEnvironment = environmentNames.map(name => process.env[name]);
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function activate(identity: Pick<Identity, "secretFile">, trust: PdfTrustConfiguration) {
  environmentNames.forEach(name => { delete process.env[name]; });
  process.env.HCA_PDF_SIGNING_SECRET = await readFile(identity.secretFile, "utf8");
  process.env.HCA_PDF_TRUST_POLICY = JSON.stringify(trust);
}
async function sign() { return signTechnicalPdf(unsigned, await loadPdfSigningProvider()); }

beforeAll(async () => {
  original = await testSigningIdentity({ keyVersion: "lifecycle-original" });
  renewed = await testSigningIdentity({ keyVersion: "lifecycle-renewed", authority: original.authority });
  rotated = await testSigningIdentity({ keyVersion: "lifecycle-rotated" });
  const policies: PdfTrustConfiguration[] = await Promise.all([original, renewed, rotated].map(async identity => JSON.parse(await readFile(identity.trustFile, "utf8"))));
  policy = { environment: "local", revision: "lifecycle-policy-3", roots: [policies[0].roots[0], policies[2].roots[0]], revokedFingerprints: [], issuers: policies.flatMap(item => item.issuers) };
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText("Synthetic custody lifecycle - no patient data", { x: 40, y: 750, size: 12, font });
  unsigned = await pdf.save();
  await activate(original, policy); historical = (await sign()).bytes;
  await activate(rotated, policy); current = (await sign()).bytes;
}, 90000);
afterEach(() => {
  vi.useRealTimers();
  environmentNames.forEach((name, index) => {
    if (previousEnvironment[index] === undefined) delete process.env[name];
    else process.env[name] = previousEnvironment[index];
  });
});
afterAll(async () => {
  // Renewal depends on the original CA only while provisioning; dispose children first.
  await renewed?.dispose(); await rotated?.dispose(); await original?.dispose();
});

it("renews under the same CA and rotates to another CA while historical files retain their pinned identities", async () => {
  expect(renewed.root).toBe(original.root);
  expect(rotated.root).not.toBe(original.root);
  const old = await verifyTechnicalPdf(historical, issuanceTrust(policy, "lifecycle-original"));
  await activate(renewed, policy);
  const replacement = await sign();
  expect(replacement.verification.accepted).toBe(true);
  expect(replacement.verification.certificateFingerprint).not.toBe(old.certificateFingerprint);
  expect(replacement.verification.timestampCertificateFingerprint).not.toBe(old.timestampCertificateFingerprint);
  expect((await verifyTechnicalPdf(current, issuanceTrust(policy, "lifecycle-rotated"))).accepted).toBe(true);
  expect((await verifyTechnicalPdf(historical, issuanceTrust(policy, "lifecycle-original"))).accepted).toBe(true);
  await expect(verifyTechnicalPdf(replacement.bytes, issuanceTrust(policy, "lifecycle-original"))).rejects.toMatchObject({ code: "UNEXPECTED_DOCUMENT_CERTIFICATE" });
  // An old version cannot be reused for the new key pair, even with genuine P12 files.
  const substituted = JSON.parse(process.env.HCA_PDF_SIGNING_SECRET!);
  substituted.keyVersion = "lifecycle-original";
  process.env.HCA_PDF_SIGNING_SECRET = JSON.stringify(substituted);
  await expect(loadPdfSigningProvider()).rejects.toMatchObject({ code: "SIGNING_UNAVAILABLE" });
}, 30000);

it("re-evaluates signer, TSA and CA incidents without rewriting intact cryptography or disabling an unrelated active pair", async () => {
  const before = digest(historical), old = policy.issuers[0];
  const rootFingerprint = digest(new X509Certificate(original.root).raw);
  for (const [fingerprint, signerTrust, timestampTrust, code] of [
    [old.signerFingerprint, "revoked", "internal", "SIGNING_UNAVAILABLE"],
    [old.timestampFingerprint, "internal", "revoked", "SIGNING_UNAVAILABLE"],
    [rootFingerprint, "revoked", "revoked", "SIGNED_FILE_NOT_ACCEPTED"],
  ] as const) {
    const incident = { ...policy, revision: "lifecycle-incident", revokedFingerprints: [fingerprint] };
    const result = await verifyTechnicalPdf(historical, issuanceTrust(incident, "lifecycle-original"));
    expect(result).toMatchObject({ cryptographicIntegrity: true, wholeFile: true, accepted: false, signerTrust, timestampTrust });
    await activate(original, incident);
    await expect(sign()).rejects.toMatchObject({ code });
    await activate(rotated, incident);
    expect((await sign()).verification.accepted).toBe(true);
    expect((await verifyTechnicalPdf(current, issuanceTrust(incident, "lifecycle-rotated"))).accepted).toBe(true);
  }
  expect(digest(historical)).toBe(before);
}, 30000);

it("keeps timestamped historical verification after expiry while refusing an expired pair for a new issuance", async () => {
  const certificate = new X509Certificate(original.signer.certificate), afterExpiry = new Date(certificate.validToDate.getTime() + 86400000);
  expect((await verifyTechnicalPdf(historical, { ...issuanceTrust(policy, "lifecycle-original"), now: afterExpiry })).accepted).toBe(true);
  await activate(original, policy);
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(afterExpiry);
  await expect(loadPdfSigningProvider()).rejects.toMatchObject({ code: "SIGNING_UNAVAILABLE" });
}, 30000);

it("restores runtime and CA custody from an authenticated encrypted archive, then signs and renews without the active original secret", async () => {
  const folder = dirname(original.secretFile), source = join(folder, "runtime-capture"), archive = join(folder, "encrypted-runtime"), destination = join(folder, "restored-runtime");
  await mkdir(source, { mode: 0o700 });
  const secret = await readFile(original.secretFile);
  await writeFile(join(source, "runtime-secret.json"), secret, { mode: 0o600, flag: "wx" });
  await writeFile(join(source, "trust.json"), JSON.stringify(policy), { mode: 0o600, flag: "wx" });
  for (const [name, sourceFile] of [["root.crt", original.authority.certificateFile], ["root.key", original.authority.keyFile], ["root-password", original.authority.passwordFile]])
    await writeFile(join(source, name), await readFile(sourceFile), { mode: 0o600, flag: "wx" });
  const key = randomBytes(32); // Independent recovery key, never a member of the archive.
  await sealBackup({ source, destination: archive, key, metadata: { kind: "pdf-runtime-custody", environment: "local", keyVersion: "lifecycle-original", trustRevision: policy.revision } });
  for (const name of await readdir(archive)) expect((await readFile(join(archive, name))).includes(secret)).toBe(false);
  await expect(extractBackup({ directory: archive, destination: join(folder, "wrong-key-restore"), key: randomBytes(32) })).rejects.toThrow();
  await expect(access(join(folder, "wrong-key-restore"))).rejects.toThrow();
  expect((await verifyBackup({ directory: archive, key, includeMetadata: true })).metadata).toMatchObject({ kind: "pdf-runtime-custody", keyVersion: "lifecycle-original" });
  await extractBackup({ directory: archive, destination, key });
  expect((await readFile(join(destination, "runtime-secret.json"))).equals(secret)).toBe(true);
  environmentNames.forEach(name => { delete process.env[name]; });
  process.env.HCA_PDF_SIGNING_SECRET_FILE = join(destination, "runtime-secret.json");
  process.env.HCA_PDF_TRUST_POLICY_FILE = join(destination, "trust.json");
  const restored = await sign();
  expect(restored.verification.accepted).toBe(true);
  expect((await loadPdfSigningProvider()).keyVersion).toBe("lifecycle-original");
  expect((await verifyTechnicalPdf(historical, issuanceTrust(await loadPdfTrust(), "lifecycle-original"))).accepted).toBe(true);
  const recoveredRenewal = await testSigningIdentity({ keyVersion: "lifecycle-after-restore", authority: { certificateFile: join(destination, "root.crt"), keyFile: join(destination, "root.key"), passwordFile: join(destination, "root-password") } });
  try {
    expect(recoveredRenewal.root).toBe(original.root);
    const newIssuer: PdfTrustConfiguration = JSON.parse(await readFile(recoveredRenewal.trustFile, "utf8"));
    await activate(recoveredRenewal, { ...policy, revision: "lifecycle-after-restore", issuers: [...policy.issuers, ...newIssuer.issuers] });
    expect((await sign()).verification.accepted).toBe(true);
  } finally { await recoveredRenewal.dispose(); }
  delete process.env.HCA_PDF_SIGNING_SECRET;
  delete process.env.HCA_PDF_SIGNING_SECRET_FILE;
  await expect(loadPdfSigningProvider()).rejects.toMatchObject({ code: "SIGNING_UNAVAILABLE" });
  expect((await verifyTechnicalPdf(historical, issuanceTrust(await loadPdfTrust(), "lifecycle-original"))).accepted).toBe(true);
}, 30000);

import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { X509Certificate, createHash } from "node:crypto";
import { P12Signer, type Signer, type TimestampAuthority } from "@libpdf/core";
import { z } from "zod";
import { ApiError } from "../api";
import { InternalTimestampAuthority } from "./internal-tsa";
import type { SignatureTrustPolicy } from "./verify";

const environment = z.enum(["local", "preview", "production"]);
const revision = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/);
const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
const trustSchema = z
  .object({
    environment,
    revision,
    roots: z
      .array(
        z
          .object({
            pem: z.string().max(16384),
            trust: z.enum(["internal", "external"]),
          })
          .strict(),
      )
      .min(1)
      .max(32),
    revokedFingerprints: z.array(fingerprint).max(4096),
    issuers: z
      .array(
        z
          .object({
            keyVersion: revision,
            signerFingerprint: fingerprint,
            timestampFingerprint: fingerprint,
          })
          .strict(),
      )
      .min(1)
      .max(128),
  })
  .strict();
const secretSchema = z
  .object({
    environment,
    keyVersion: revision,
    signerP12: z.string().min(100).max(131072),
    signerPassword: z.string().min(24).max(1024),
    timestampP12: z.string().min(100).max(131072),
    timestampPassword: z.string().min(24).max(1024),
  })
  .strict();
export type PdfTrustConfiguration = z.infer<typeof trustSchema>;
export type PdfSigningProvider = {
  signer: Signer;
  timestampAuthority: TimestampAuthority;
  trust: SignatureTrustPolicy;
  keyVersion: string;
  trustRevision: string;
};
const unavailable = () =>
  new ApiError(
    "SIGNING_UNAVAILABLE",
    "A assinatura documental está temporariamente indisponível. A intenção de emissão foi preservada.",
    503,
    true,
  );
export function pdfRuntimeEnvironment() {
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  return "local";
}
async function configuration(name: string) {
  const value = process.env[name],
    file = process.env[name + "_FILE"];
  if (Boolean(value) === Boolean(file)) throw unavailable();
  if (value) {
    if (value.length > 524288) throw unavailable();
    return JSON.parse(value);
  }
  // File custody is a local adapter, never a dependency on a Vercel filesystem.
  if (pdfRuntimeEnvironment() !== "local" || !path.isAbsolute(file!))
    throw unavailable();
  const target = await realpath(file!),
    workspace = await realpath(process.cwd());
  const relative = path.relative(workspace, target);
  if (
    !relative.startsWith(".." + path.sep) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  )
    throw unavailable();
  const bytes = await readFile(target);
  if (bytes.length > 524288) throw unavailable();
  return JSON.parse(bytes.toString("utf8"));
}
/** Public certificates and incident policy remain usable without the signing keys. */
export async function loadPdfTrust(): Promise<PdfTrustConfiguration> {
  try {
    const trust = trustSchema.parse(
      await configuration("HCA_PDF_TRUST_POLICY"),
    );
    if (trust.environment !== pdfRuntimeEnvironment()) throw unavailable();
    for (const root of trust.roots) {
      if (!new X509Certificate(root.pem).ca) throw unavailable();
    }
    if (
      new Set(trust.issuers.map((i) => i.keyVersion)).size !==
      trust.issuers.length
    )
      throw unavailable();
    return trust;
  } catch {
    throw unavailable();
  }
}
export function issuanceTrust(
  trust: PdfTrustConfiguration,
  keyVersion: string,
): SignatureTrustPolicy {
  const issuer = trust.issuers.find((i) => i.keyVersion === keyVersion);
  if (!issuer) throw unavailable();
  return {
    roots: trust.roots,
    revokedFingerprints: trust.revokedFingerprints,
    expectedSignerFingerprint: issuer.signerFingerprint,
    expectedTimestampFingerprint: issuer.timestampFingerprint,
  };
}
/** Replaceable provider boundary: no request parameter selects a key or policy. */
export async function loadPdfSigningProvider(): Promise<PdfSigningProvider> {
  try {
    const trust = await loadPdfTrust(),
      secret = secretSchema.parse(
        await configuration("HCA_PDF_SIGNING_SECRET"),
      );
    if (secret.environment !== pdfRuntimeEnvironment()) throw unavailable();
    const policy = issuanceTrust(trust, secret.keyVersion);
    const signer = await P12Signer.create(
      Buffer.from(secret.signerP12, "base64"),
      secret.signerPassword,
    );
    const tsa = await P12Signer.create(
      Buffer.from(secret.timestampP12, "base64"),
      secret.timestampPassword,
    );
    for (const [provider, expected] of [
      [signer, policy.expectedSignerFingerprint],
      [tsa, policy.expectedTimestampFingerprint],
    ] as const) {
      const cert = new X509Certificate(provider.certificate),
        now = new Date();
      if (
        createHash("sha256").update(cert.raw).digest("hex") !== expected ||
        now < cert.validFromDate ||
        now > cert.validToDate ||
        trust.revokedFingerprints.includes(expected!)
      )
        throw unavailable();
    }
    if (
      policy.expectedSignerFingerprint === policy.expectedTimestampFingerprint
    )
      throw unavailable();
    return {
      signer,
      timestampAuthority: new InternalTimestampAuthority(tsa),
      trust: policy,
      keyVersion: secret.keyVersion,
      trustRevision: trust.revision,
    };
  } catch {
    throw unavailable();
  }
}

import { PDF, type Signer, type TimestampAuthority } from "@libpdf/core";
import { requireSignature } from "./cms";
import { verifyTechnicalPdf, type SignatureTrustPolicy } from "./verify";

/** The caller supplies server-owned providers and pins. No B-B/unsigned fallback. */
export async function signTechnicalPdf(
  bytes: Uint8Array,
  provider: {
    signer: Signer;
    timestampAuthority: TimestampAuthority;
    trust: SignatureTrustPolicy;
  },
) {
  const pdf = await PDF.load(bytes),
    signed = await pdf.sign({
      signer: provider.signer,
      timestampAuthority: provider.timestampAuthority,
      level: "B-T",
      reason: "Assinatura técnica do Home Care Assistant",
      fieldName: "HCA_TechnicalSignature",
      digestAlgorithm: "SHA-256",
    });
  requireSignature(signed.warnings.length === 0, "SIGNATURE_PROVIDER_WARNING");
  const verification = await verifyTechnicalPdf(signed.bytes, provider.trust);
  requireSignature(verification.accepted, "SIGNED_FILE_NOT_ACCEPTED");
  return { bytes: signed.bytes, verification };
}

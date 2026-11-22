import { X509Certificate } from "node:crypto";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFSignature,
} from "pdf-lib";
import * as asn from "asn1js";
import * as pki from "pkijs";
import {
  arrayBuffer,
  attribute,
  cmsCertificates,
  decodeCms,
  equal,
  nativeCertificate,
  octets,
  oid,
  requireSignature,
  sequence,
  sha256,
  SignatureValidationError,
  verifyCms,
} from "./cms";
import { internalTimestampPolicy } from "./internal-tsa";

export type CertificateTrust =
  | "internal"
  | "external"
  | "unknown_chain"
  | "invalid_chain"
  | "revoked"
  | "expired";
export type SignatureTrustPolicy = {
  roots: readonly { pem: string; trust: "internal" | "external" }[];
  revokedFingerprints?: readonly string[];
  expectedSignerFingerprint?: string;
  expectedTimestampFingerprint?: string;
  now?: Date;
};
export type TechnicalPdfVerification = {
  profile: "PAdES-B-T";
  cryptographicIntegrity: true;
  wholeFile: boolean;
  signerTrust: CertificateTrust;
  timestampTrust: CertificateTrust;
  certificateFingerprint: string;
  timestampCertificateFingerprint: string;
  timestampAt: string;
  timestampPolicy: string;
  externalTimeIndependence: false;
  revocationEvidence: "configured_internal_denylist_only";
  accepted: boolean;
};
const fingerprint = (cert: X509Certificate) => sha256(cert.raw).toString("hex");
function usage(cert: pki.Certificate, timestamp: boolean) {
  const basic = cert.extensions?.find(
    (e) => e.extnID === "2.5.29.19",
  )?.parsedValue;
  requireSignature(
    !(basic instanceof pki.BasicConstraints && basic.cA),
    "SIGNING_LEAF_IS_CA",
  );
  const keyUsage = cert.extensions?.find(
    (e) => e.extnID === "2.5.29.15",
  )?.parsedValue;
  requireSignature(
    keyUsage instanceof asn.BitString &&
      (keyUsage.valueBlock.valueHexView[0] & 0x80) !== 0,
    "SIGNING_KEY_USAGE_REQUIRED",
  );
  const eku = cert.extensions?.find((e) => e.extnID === "2.5.29.37");
  if (timestamp)
    requireSignature(
      eku?.critical &&
        eku.parsedValue instanceof pki.ExtKeyUsage &&
        eku.parsedValue.keyPurposes.length === 1 &&
        eku.parsedValue.keyPurposes[0] === oid.timeStamping,
      "INVALID_TSA_EKU",
    );
  else
    requireSignature(
      !(eku?.parsedValue instanceof pki.ExtKeyUsage) ||
        !eku.parsedValue.keyPurposes.includes(oid.timeStamping),
      "TSA_KEY_CANNOT_SIGN_DOCUMENT",
    );
}
function trustPath(
  leaf: pki.Certificate,
  embedded: pki.Certificate[],
  policy: SignatureTrustPolicy,
  at: Date,
): CertificateTrust {
  const anchors = policy.roots.map((root) => ({
      ...root,
      cert: new X509Certificate(root.pem),
    })),
    pool = [...embedded.map(nativeCertificate), ...anchors.map((a) => a.cert)],
    visited: X509Certificate[] = [];
  let current = nativeCertificate(leaf);
  for (let depth = 0; depth < 8; depth++) {
    const hash = fingerprint(current);
    if (visited.some((c) => fingerprint(c) === hash)) return "invalid_chain";
    if (policy.revokedFingerprints?.includes(hash)) return "revoked";
    if (at < current.validFromDate || at > current.validToDate)
      return "expired";
    const anchor = anchors.find((a) => equal(a.cert.raw, current.raw));
    if (anchor) return current.ca ? anchor.trust : "invalid_chain";
    visited.push(current);
    const candidates = pool.filter(
      (c) => !equal(c.raw, current.raw) && current.checkIssued(c),
    );
    if (!candidates.length) return "unknown_chain";
    const issuer = candidates.find((c) => c.ca && current.verify(c.publicKey));
    if (!issuer) return "invalid_chain";
    const decoded = new pki.Certificate({
        schema: asn.fromBER(arrayBuffer(issuer.raw)).result,
      }),
      constraints = decoded.extensions?.find(
        (e) => e.extnID === "2.5.29.19",
      )?.parsedValue;
    if (!(constraints instanceof pki.BasicConstraints) || !constraints.cA)
      return "invalid_chain";
    const limit =
      constraints.pathLenConstraint instanceof asn.Integer
        ? constraints.pathLenConstraint.valueBlock.valueDec
        : constraints.pathLenConstraint;
    if (
      limit !== undefined &&
      (!Number.isSafeInteger(limit) ||
        limit < visited.filter((c) => c.ca).length)
    )
      return "invalid_chain";
    current = issuer;
  }
  return "invalid_chain";
}
/** Verifies the actual AcroForm signature, its exact byte gap, CMS and RFC3161 token.
 * No network, signer, key custody, renderer or issuance side effect is involved. */
export async function verifyTechnicalPdf(
  bytes: Uint8Array,
  policy: SignatureTrustPolicy,
): Promise<TechnicalPdfVerification> {
  let stage: "container" | "document" | "timestamp" = "container";
  try {
    requireSignature(
      bytes.byteLength > 100 && bytes.byteLength <= 10 * 1024 * 1024,
      "PDF_SIZE_LIMIT",
    );
    const pdf = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
    requireSignature(!pdf.isEncrypted, "ENCRYPTED_PDF_UNSUPPORTED");
    const signatures = pdf
      .getForm()
      .getFields()
      .filter((field) => field instanceof PDFSignature);
    requireSignature(signatures.length > 0, "UNSIGNED_PDF");
    requireSignature(
      signatures.length === 1,
      "EXPECTED_ONE_EMBEDDED_SIGNATURE",
    );
    const dict = signatures[0].acroField.dict.lookup(PDFName.of("V"), PDFDict),
      filter = dict.lookup(PDFName.of("SubFilter"), PDFName);
    requireSignature(
      filter.toString() === "/ETSI.CAdES.detached",
      "UNSUPPORTED_PDF_SIGNATURE_PROFILE",
    );
    const range = dict.lookup(PDFName.of("ByteRange"), PDFArray);
    requireSignature(range.size() === 4, "INVALID_BYTE_RANGE");
    const values = Array.from({ length: 4 }, (_, i) =>
      range.lookup(i, PDFNumber).asNumber(),
    );
    requireSignature(
      values.every(Number.isSafeInteger) &&
        values[0] === 0 &&
        values[1] > 0 &&
        values[2] > values[1] &&
        values[3] > 0 &&
        values[2] + values[3] <= bytes.byteLength,
      "INVALID_BYTE_RANGE",
    );
    const gap = Buffer.from(bytes.subarray(values[1], values[2])).toString(
      "ascii",
    );
    requireSignature(
      /^<[0-9a-fA-F]+>$/.test(gap) && gap.length % 2 === 0,
      "INVALID_SIGNATURE_GAP",
    );
    const contents = dict
      .lookup(PDFName.of("Contents"), PDFHexString)
      .asBytes();
    requireSignature(
      equal(contents, Buffer.from(gap.slice(1, -1), "hex")),
      "SIGNATURE_GAP_MISMATCH",
    );
    const signedBytes = Buffer.concat([
      bytes.subarray(0, values[1]),
      bytes.subarray(values[2], values[2] + values[3]),
    ]);
    stage = "document";
    const cms = decodeCms(contents, true);
    requireSignature(
      !cms.encapContentInfo.eContent,
      "PDF_SIGNATURE_MUST_BE_DETACHED",
    );
    const document = verifyCms(cms, signedBytes, oid.data, true);
    usage(document.cert, false);
    stage = "timestamp";
    const token = attribute(document.signerInfo, oid.timestamp, true),
      tokenCms = decodeCms(new Uint8Array(token.toBER(false)));
    const content = octets(tokenCms.encapContentInfo.eContent),
      timestamp = verifyCms(tokenCms, content, oid.tstInfo);
    usage(timestamp.cert, true);
    const parsed = asn.fromBER(arrayBuffer(content));
    requireSignature(parsed.offset === content.byteLength, "INVALID_TST_INFO");
    const info = new pki.TSTInfo({ schema: parsed.result }),
      now = policy.now ?? new Date();
    requireSignature(
      info.version === 1 &&
        info.messageImprint.hashAlgorithm.algorithmId === oid.sha256,
      "UNSUPPORTED_TIMESTAMP_PROFILE",
    );
    requireSignature(
      equal(
        octets(info.messageImprint.hashedMessage),
        sha256(
          new Uint8Array(document.signerInfo.signature.valueBlock.valueHexView),
        ),
      ),
      "TIMESTAMP_IMPRINT_MISMATCH",
    );
    requireSignature(
      Number.isFinite(info.genTime.getTime()) &&
        info.genTime.getTime() <= now.getTime() + 300_000,
      "TIMESTAMP_FROM_FUTURE",
    );
    const certificateFingerprint = fingerprint(document.native),
      timestampCertificateFingerprint = fingerprint(timestamp.native);
    requireSignature(
      !policy.expectedSignerFingerprint ||
        certificateFingerprint === policy.expectedSignerFingerprint,
      "UNEXPECTED_DOCUMENT_CERTIFICATE",
    );
    requireSignature(
      !policy.expectedTimestampFingerprint ||
        timestampCertificateFingerprint === policy.expectedTimestampFingerprint,
      "UNEXPECTED_TIMESTAMP_CERTIFICATE",
    );
    const signerTrust = trustPath(
        document.cert,
        cmsCertificates(cms),
        policy,
        info.genTime,
      ),
      timestampTrust = trustPath(
        timestamp.cert,
        cmsCertificates(tokenCms),
        policy,
        info.genTime,
      ),
      wholeFile = values[2] + values[3] === bytes.byteLength;
    // ASN1js displays large UUID OID arcs as hex; compare their DER representation.
    const policyValue = sequence(parsed.result).valueBlock.value[1],
      knownPolicy = new asn.ObjectIdentifier({
        value: internalTimestampPolicy,
      });
    const timestampPolicy = equal(
      new Uint8Array(policyValue.toBER(false)),
      new Uint8Array(knownPolicy.toBER(false)),
    )
      ? internalTimestampPolicy
      : "other";
    return {
      profile: "PAdES-B-T",
      cryptographicIntegrity: true,
      wholeFile,
      signerTrust,
      timestampTrust,
      certificateFingerprint,
      timestampCertificateFingerprint,
      timestampAt: info.genTime.toISOString(),
      timestampPolicy,
      externalTimeIndependence: false,
      revocationEvidence: "configured_internal_denylist_only",
      accepted:
        wholeFile &&
        [signerTrust, timestampTrust].every(
          (t) => t === "internal" || t === "external",
        ),
    };
  } catch (error) {
    const failure =
      error instanceof SignatureValidationError
        ? error
        : new SignatureValidationError("UNREADABLE_SIGNATURE");
    failure.stage = stage;
    throw failure;
  }
}

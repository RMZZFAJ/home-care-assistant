import {
  createHash,
  timingSafeEqual,
  verify,
  X509Certificate,
} from "node:crypto";
import * as asn from "asn1js";
import * as pki from "pkijs";

export const oid = {
  data: "1.2.840.113549.1.7.1",
  signedData: "1.2.840.113549.1.7.2",
  sha256: "2.16.840.1.101.3.4.2.1",
  rsa: "1.2.840.113549.1.1.1",
  rsaSha256: "1.2.840.113549.1.1.11",
  contentType: "1.2.840.113549.1.9.3",
  digest: "1.2.840.113549.1.9.4",
  signingTime: "1.2.840.113549.1.9.5",
  certificateV2: "1.2.840.113549.1.9.16.2.47",
  timestamp: "1.2.840.113549.1.9.16.2.14",
  tstInfo: "1.2.840.113549.1.9.16.1.4",
  timeStamping: "1.3.6.1.5.5.7.3.8",
} as const;
export const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest();
export const arrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  Uint8Array.from(bytes).buffer;
export const equal = (a: Uint8Array, b: Uint8Array) =>
  a.byteLength === b.byteLength && timingSafeEqual(a, b);
export class SignatureValidationError extends Error {
  stage: "container" | "document" | "timestamp" = "container";
  constructor(readonly code: string) {
    super("O arquivo não passou pela validação técnica da assinatura.");
    this.name = "SignatureValidationError";
  }
}
export function requireSignature(value: unknown, code: string): asserts value {
  if (!value) throw new SignatureValidationError(code);
}
export function sequence(value: unknown) {
  requireSignature(value instanceof asn.Sequence, "INVALID_ASN1_SEQUENCE");
  return value;
}
export function octets(value: unknown) {
  requireSignature(
    value instanceof asn.OctetString && !value.idBlock.isConstructed,
    "INVALID_ASN1_OCTETS",
  );
  return Buffer.from(value.valueBlock.valueHexView);
}
export function attribute(si: pki.SignerInfo, type: string, unsigned = false) {
  const matches =
    (unsigned ? si.unsignedAttrs : si.signedAttrs)?.attributes.filter(
      (a) => a.type === type,
    ) ?? [];
  requireSignature(
    matches.length === 1 && matches[0].values.length === 1,
    "MISSING_OR_DUPLICATED_ATTRIBUTE",
  );
  return matches[0].values[0];
}
export function decodeCms(bytes: Uint8Array, padded = false) {
  const parsed = asn.fromBER(arrayBuffer(bytes));
  requireSignature(parsed.offset > 0, "INVALID_CMS");
  requireSignature(
    padded
      ? bytes.subarray(parsed.offset).every((n) => n === 0)
      : parsed.offset === bytes.byteLength,
    "UNEXPECTED_CMS_BYTES",
  );
  const content = new pki.ContentInfo({ schema: parsed.result });
  requireSignature(
    content.contentType === oid.signedData,
    "INVALID_CMS_CONTENT_TYPE",
  );
  const cms = new pki.SignedData({ schema: content.content });
  requireSignature(cms.signerInfos.length === 1, "UNEXPECTED_SIGNER_COUNT");
  return cms;
}
export function cmsCertificates(cms: pki.SignedData) {
  requireSignature(
    cms.certificates &&
      cms.certificates.length > 0 &&
      cms.certificates.length <= 8,
    "INVALID_CERTIFICATE_COUNT",
  );
  return cms.certificates.map((cert) => {
    requireSignature(
      cert instanceof pki.Certificate,
      "UNSUPPORTED_CERTIFICATE",
    );
    return cert;
  });
}
export function nativeCertificate(cert: pki.Certificate) {
  const bytes = Buffer.from(cert.toSchema().toBER(false));
  requireSignature(
    bytes.length <= 16384,
    "UNSUPPORTED_CERTIFICATE_SIZE_BUDGET",
  );
  const native = new X509Certificate(bytes),
    key = native.publicKey,
    details = key.asymmetricKeyDetails;
  // Bound native OpenSSL work before verifying attacker-supplied keys. A worker
  // deadline alone cannot preempt every synchronous native operation.
  if (key.asymmetricKeyType === "rsa")
    requireSignature(
      (details?.modulusLength ?? 0) >= 2048 &&
        (details?.modulusLength ?? Infinity) <= 8192 &&
        typeof details?.publicExponent === "bigint" &&
        details.publicExponent > BigInt(1) &&
        details.publicExponent <= BigInt("0xffffffff"),
      "UNSUPPORTED_CERTIFICATE_KEY_BUDGET",
    );
  else if (key.asymmetricKeyType === "ec")
    requireSignature(
      ["prime256v1", "secp384r1", "secp521r1"].includes(
        details?.namedCurve ?? "",
      ),
      "UNSUPPORTED_CERTIFICATE_KEY_BUDGET",
    );
  else
    requireSignature(
      ["ed25519", "ed448"].includes(key.asymmetricKeyType ?? ""),
      "UNSUPPORTED_CERTIFICATE_KEY_BUDGET",
    );
  return native;
}
export function certificateForSigner(cms: pki.SignedData) {
  const si = cms.signerInfos[0];
  requireSignature(
    si.sid instanceof pki.IssuerAndSerialNumber,
    "UNSUPPORTED_SIGNER_IDENTIFIER",
  );
  const sid = si.sid,
    cert = cmsCertificates(cms).find(
      (c) =>
        c.issuer.isEqual(sid.issuer) &&
        c.serialNumber.isEqual(sid.serialNumber),
    );
  requireSignature(cert, "SIGNER_CERTIFICATE_MISSING");
  return cert;
}
export function signedAttributeBytes(attrs: pki.SignedAndUnsignedAttributes) {
  const encoded = Uint8Array.from(
    new Uint8Array(
      attrs.encodedValue.byteLength
        ? attrs.encodedValue
        : attrs.toSchema().toBER(false),
    ),
  );
  requireSignature(encoded.length > 2, "EMPTY_SIGNED_ATTRIBUTES");
  encoded[0] = 0x31;
  return encoded;
}
export function verifyCms(
  cms: pki.SignedData,
  data: Uint8Array,
  contentType: string,
  forbidSigningTime = false,
) {
  const si = cms.signerInfos[0],
    cert = certificateForSigner(cms),
    native = nativeCertificate(cert);
  requireSignature(
    cms.encapContentInfo.eContentType === contentType,
    "CMS_CONTENT_TYPE_MISMATCH",
  );
  requireSignature(
    si.digestAlgorithm.algorithmId === oid.sha256 &&
      (si.signatureAlgorithm.algorithmId === oid.rsa ||
        si.signatureAlgorithm.algorithmId === oid.rsaSha256),
    "UNSUPPORTED_SIGNATURE_ALGORITHM",
  );
  requireSignature(
    native.publicKey.asymmetricKeyType === "rsa" &&
      (native.publicKey.asymmetricKeyDetails?.modulusLength ?? 0) >= 2048,
    "WEAK_OR_UNSUPPORTED_PUBLIC_KEY",
  );
  requireSignature(si.signedAttrs, "MISSING_SIGNED_ATTRIBUTES");
  const type = attribute(si, oid.contentType);
  requireSignature(
    type instanceof asn.ObjectIdentifier &&
      type.valueBlock.toString() === contentType,
    "SIGNED_CONTENT_TYPE_MISMATCH",
  );
  requireSignature(
    equal(octets(attribute(si, oid.digest)), sha256(data)),
    "CONTENT_DIGEST_MISMATCH",
  );
  if (forbidSigningTime)
    requireSignature(
      !si.signedAttrs.attributes.some((a) => a.type === oid.signingTime),
      "PADES_FORBIDS_CMS_SIGNING_TIME",
    );
  const binding = sequence(
    sequence(sequence(attribute(si, oid.certificateV2)).valueBlock.value[0])
      .valueBlock.value[0],
  ).valueBlock.value;
  const explicit = binding[0] instanceof asn.Sequence;
  if (explicit) {
    const algorithm = sequence(binding[0]).valueBlock.value[0];
    requireSignature(
      algorithm instanceof asn.ObjectIdentifier &&
        algorithm.valueBlock.toString() === oid.sha256,
      "UNSUPPORTED_CERTIFICATE_HASH",
    );
  }
  requireSignature(
    equal(octets(binding[explicit ? 1 : 0]), sha256(native.raw)),
    "SIGNING_CERTIFICATE_MISMATCH",
  );
  requireSignature(
    verify(
      "sha256",
      signedAttributeBytes(si.signedAttrs),
      native.publicKey,
      Buffer.from(si.signature.valueBlock.valueHexView),
    ),
    "CMS_SIGNATURE_INVALID",
  );
  return { cert, native, signerInfo: si };
}

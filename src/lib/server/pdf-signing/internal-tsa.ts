import { randomBytes, X509Certificate } from "node:crypto";
import type { Signer, TimestampAuthority } from "@libpdf/core";
import * as asn from "asn1js";
import * as pki from "pkijs";
import {
  arrayBuffer,
  oid,
  sha256,
  requireSignature,
  signedAttributeBytes,
} from "./cms";

/** UUID d7d3bf04-708b-4499-9dfe-57f710981d6c; private policy, no external trust claim. */
export const internalTimestampPolicy =
  "2.25.286883468022885394573621170177492655468";
export class InternalTimestampAuthority implements TimestampAuthority {
  private readonly certificate: pki.Certificate;
  constructor(
    private readonly signer: Signer,
    private readonly clock: () => Date = () => new Date(),
  ) {
    requireSignature(
      signer.signatureAlgorithm === "RSASSA-PKCS1-v1_5" &&
        signer.keyType === "RSA",
      "UNSUPPORTED_TSA_KEY",
    );
    this.certificate = new pki.Certificate({
      schema: asn.fromBER(arrayBuffer(signer.certificate)).result,
    });
    const eku = this.certificate.extensions?.find(
      (e) => e.extnID === "2.5.29.37",
    );
    requireSignature(
      eku?.critical &&
        eku.parsedValue instanceof pki.ExtKeyUsage &&
        eku.parsedValue.keyPurposes.length === 1 &&
        eku.parsedValue.keyPurposes[0] === oid.timeStamping,
      "TSA_REQUIRES_EXCLUSIVE_CRITICAL_EKU",
    );
  }
  async timestamp(digest: Uint8Array, algorithm: string) {
    requireSignature(
      algorithm === "SHA-256" && digest.byteLength === 32,
      "UNSUPPORTED_TIMESTAMP_DIGEST",
    );
    const now = this.clock(),
      native = new X509Certificate(this.signer.certificate);
    requireSignature(
      Number.isFinite(now.getTime()) &&
        now >= native.validFromDate &&
        now <= native.validToDate,
      "TSA_CERTIFICATE_NOT_CURRENT",
    );
    const serial = randomBytes(16);
    serial[0] = (serial[0] & 0x3f) | 0x40;
    const info = new pki.TSTInfo({
      version: 1,
      policy: internalTimestampPolicy,
      serialNumber: new asn.Integer({ valueHex: arrayBuffer(serial) }),
      genTime: now,
      ordering: false,
      messageImprint: new pki.MessageImprint({
        hashAlgorithm: new pki.AlgorithmIdentifier({
          algorithmId: oid.sha256,
          algorithmParams: new asn.Null(),
        }),
        hashedMessage: new asn.OctetString({ valueHex: arrayBuffer(digest) }),
      }),
    });
    const content = info.toSchema().toBER(false),
      hash = sha256(new Uint8Array(content)),
      certHash = sha256(this.signer.certificate);
    const attributes = [
      new pki.Attribute({
        type: oid.contentType,
        values: [new asn.ObjectIdentifier({ value: oid.tstInfo })],
      }),
      new pki.Attribute({
        type: oid.digest,
        values: [new asn.OctetString({ valueHex: arrayBuffer(hash) })],
      }),
      new pki.Attribute({
        type: oid.certificateV2,
        values: [
          new asn.Sequence({
            value: [
              new asn.Sequence({
                value: [
                  new asn.Sequence({
                    value: [
                      new asn.OctetString({ valueHex: arrayBuffer(certHash) }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ].sort((a, b) =>
      Buffer.compare(
        Buffer.from(a.toSchema().toBER(false)),
        Buffer.from(b.toSchema().toBER(false)),
      ),
    );
    const attrs = new pki.SignedAndUnsignedAttributes({ type: 0, attributes });
    const signature = await this.signer.sign(
      signedAttributeBytes(attrs),
      "SHA-256",
    );
    const signer = new pki.SignerInfo({
      version: 1,
      sid: new pki.IssuerAndSerialNumber({
        issuer: this.certificate.issuer,
        serialNumber: this.certificate.serialNumber,
      }),
      digestAlgorithm: new pki.AlgorithmIdentifier({
        algorithmId: oid.sha256,
        algorithmParams: new asn.Null(),
      }),
      signedAttrs: attrs,
      signatureAlgorithm: new pki.AlgorithmIdentifier({
        algorithmId: oid.rsaSha256,
        algorithmParams: new asn.Null(),
      }),
      signature: new asn.OctetString({ valueHex: arrayBuffer(signature) }),
    });
    const certificates = [
      this.certificate,
      ...(this.signer.certificateChain ?? [])
        .filter(
          (c) => !Buffer.from(c).equals(Buffer.from(this.signer.certificate)),
        )
        .map(
          (c) =>
            new pki.Certificate({ schema: asn.fromBER(arrayBuffer(c)).result }),
        ),
    ];
    const encapsulated = new pki.EncapsulatedContentInfo({
      eContentType: oid.tstInfo,
    });
    // The constructor chunks supplied content as BER. RFC3161 tokens use DER.
    encapsulated.eContent = new asn.OctetString({ valueHex: content });
    const signed = new pki.SignedData({
      version: 3,
      digestAlgorithms: [
        new pki.AlgorithmIdentifier({
          algorithmId: oid.sha256,
          algorithmParams: new asn.Null(),
        }),
      ],
      encapContentInfo: encapsulated,
      certificates,
      signerInfos: [signer],
    });
    return new Uint8Array(
      new pki.ContentInfo({
        contentType: oid.signedData,
        content: signed.toSchema(true),
      })
        .toSchema()
        .toBER(false),
    );
  }
}

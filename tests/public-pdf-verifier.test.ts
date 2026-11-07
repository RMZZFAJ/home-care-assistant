import { beforeAll, afterAll, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  PDFDocument,
  PDFName,
  PDFHexString,
  PDFDict,
  PDFSignature,
  PDFArray,
  PDFNumber,
} from "pdf-lib";
import * as asn from "asn1js";
import * as pki from "pkijs";
import { testSigningIdentity } from "./support/test-signing-identity.mjs";
import { InternalTimestampAuthority } from "@/lib/server/pdf-signing/internal-tsa";
import { signTechnicalPdf } from "@/lib/server/pdf-signing/sign";
import { verifyPublicPdf } from "@/lib/server/pdf-signing/public-verifier";
import {
  arrayBuffer,
  decodeCms,
  nativeCertificate,
} from "@/lib/server/pdf-signing/cms";
import { composeIssuance } from "@/lib/server/pdf-content";
import { demoDocuments } from "@/lib/demo-documents";
let identity: Awaited<ReturnType<typeof testSigningIdentity>>,
  signed: Uint8Array,
  unsigned: Uint8Array;
const policy = () => ({
  roots: [{ pem: identity.root, trust: "internal" as const }],
});
beforeAll(async () => {
  identity = await testSigningIdentity();
  const source = {
    ...Object.values(demoDocuments).find((d) => d.type === "COM")!,
    demo: false,
  };
  unsigned = (
    await composeIssuance(source, "a".repeat(64), {
      id: "10000000-0000-4000-8000-000000000001",
      verificationCode: "A".repeat(32),
      requestedAt: new Date().toISOString(),
      requestedName: "Solicitante fictício",
      representation: "operational",
      verificationOrigin: "https://care.example",
    })
  ).bytes;
  signed = (
    await signTechnicalPdf(unsigned, {
      signer: identity.signer,
      timestampAuthority: new InternalTimestampAuthority(identity.tsa),
      trust: policy(),
    })
  ).bytes;
}, 30000);
afterAll(async () => {
  await identity?.dispose();
});
it("validates a real signed business PDF and distinguishes unknown internal anchors from damaged bytes", async () => {
  expect(await verifyPublicPdf(signed, policy())).toMatchObject({
    status: "verified",
    documentSignature: "valid",
    timestamp: "valid",
    verification: {
      accepted: true,
      wholeFile: true,
      signerTrust: "internal",
      timestampTrust: "internal",
    },
  });
  const unknown = await readFile(
    "docs/audits/D/D-B/d4-probe/test-root-public.pem",
    "utf8",
  );
  expect(
    await verifyPublicPdf(signed, {
      roots: [{ pem: unknown, trust: "internal" }],
    }),
  ).toMatchObject({
    status: "verified",
    documentSignature: "valid",
    verification: {
      accepted: false,
      signerTrust: "unknown_chain",
      timestampTrust: "unknown_chain",
    },
  });
});
it("rejects a covered-byte change with its legitimate QR unchanged, and distinguishes appended bytes", async () => {
  const altered = Uint8Array.from(signed);
  altered[8] ^= 1;
  expect(await verifyPublicPdf(altered, policy())).toMatchObject({
    status: "invalid_signature",
    documentSignature: "invalid",
  });
  expect(
    await verifyPublicPdf(
      Buffer.concat([signed, Buffer.from("\nappended bytes")]),
      policy(),
    ),
  ).toMatchObject({
    status: "verified",
    verification: {
      cryptographicIntegrity: true,
      wholeFile: false,
      accepted: false,
    },
  });
});
it("classifies a genuine PDF without embedded signature separately", async () => {
  expect(await verifyPublicPdf(unsigned, policy())).toMatchObject({
    status: "unsigned",
    documentSignature: "absent",
    timestamp: "not_assessed",
  });
});
it("retains the valid document signature when the embedded time token is missing", async () => {
  const pdf = await PDFDocument.load(signed, { updateMetadata: false }),
    field = pdf
      .getForm()
      .getFields()
      .find((f) => f instanceof PDFSignature)!,
    dict = field.acroField.dict.lookup(PDFName.of("V"), PDFDict),
    range = dict.lookup(PDFName.of("ByteRange"), PDFArray),
    start = range.lookup(1, PDFNumber).asNumber(),
    end = range.lookup(2, PDFNumber).asNumber(),
    cms = decodeCms(
      dict.lookup(PDFName.of("Contents"), PDFHexString).asBytes(),
      true,
    );
  cms.signerInfos[0].unsignedAttrs = undefined;
  const der = Buffer.from(
      new pki.ContentInfo({
        contentType: "1.2.840.113549.1.7.2",
        content: cms.toSchema(true),
      })
        .toSchema()
        .toBER(false),
    ).toString("hex"),
    bytes = Buffer.from(signed);
  bytes.set(Buffer.from("<" + der.padEnd(end - start - 2, "0") + ">"), start);
  expect(
    asn.fromBER(arrayBuffer(Buffer.from(der, "hex"))).offset,
  ).toBeGreaterThan(0);
  expect(await verifyPublicPdf(bytes, policy())).toMatchObject({
    status: "invalid_timestamp",
    documentSignature: "valid",
    timestamp: "invalid",
  });
});
it("reports the configured internal revocation without hiding intact cryptography", async () => {
  const current = await verifyPublicPdf(signed, policy());
  expect(current.verification).not.toBeNull();
  expect(
    await verifyPublicPdf(signed, {
      ...policy(),
      revokedFingerprints: [current.verification!.certificateFingerprint],
    }),
  ).toMatchObject({
    status: "verified",
    documentSignature: "valid",
    verification: { accepted: false, signerTrust: "revoked" },
  });
});
it("bounds malicious object-stream inflation before allocating an excessive buffer", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  pdf.context.register(
    pdf.context.flateStream(Buffer.alloc(12 * 1024 * 1024, 32), {
      Type: "ObjStm",
      N: 1,
      First: 4,
    }),
  );
  const bomb = await pdf.save({ useObjectStreams: false });
  expect(bomb.length).toBeLessThan(50000);
  expect(await verifyPublicPdf(bomb, policy())).toMatchObject({
    status: "processing_limit",
    documentSignature: "not_assessed",
    limit: "decompression",
  });
  expect((await verifyPublicPdf(signed, policy())).verification?.accepted).toBe(
    true,
  );
});
it("terminates a timed-out worker and releases its concurrency slot", async () => {
  expect(await verifyPublicPdf(signed, policy(), 1)).toMatchObject({
    status: "processing_limit",
    limit: "time",
  });
  expect((await verifyPublicPdf(signed, policy())).verification?.accepted).toBe(
    true,
  );
});
it("admits at most two concurrent parsers in the same runtime", async () => {
  const results = await Promise.allSettled([
    verifyPublicPdf(signed, policy()),
    verifyPublicPdf(signed, policy()),
    verifyPublicPdf(signed, policy()),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
  expect(results.find((r) => r.status === "rejected")).toMatchObject({
    reason: { code: "VERIFICATION_BUSY", status: 503 },
  });
});
it("bounds native certificate/key work before an untrusted RSA verification", () => {
  let cert = new pki.Certificate({
    schema: asn.fromBER(arrayBuffer(identity.signer.certificate)).result,
  });
  const modulus = new Uint8Array(2049).fill(0x11);
  modulus[0] = 0;
  modulus[1] = 0x80;
  cert.subjectPublicKeyInfo.subjectPublicKey = new asn.BitString({
    valueHex: new asn.Sequence({
      value: [
        new asn.Integer({ valueHex: modulus.buffer }),
        new asn.Integer({ value: 65537 }),
      ],
    }).toBER(false),
  });
  cert = new pki.Certificate({
    schema: asn.fromBER(cert.toSchema(true).toBER(false)).result,
  });
  expect(() => nativeCertificate(cert)).toThrowError(
    expect.objectContaining({ code: "UNSUPPORTED_CERTIFICATE_KEY_BUDGET" }),
  );
  cert.extensions!.push(
    new pki.Extension({
      extnID: "2.25.1",
      extnValue: new asn.OctetString({
        valueHex: new Uint8Array(17000).buffer,
      }).toBER(false),
    }),
  );
  cert = new pki.Certificate({
    schema: asn.fromBER(cert.toSchema(true).toBER(false)).result,
  });
  expect(() => nativeCertificate(cert)).toThrowError(
    expect.objectContaining({ code: "UNSUPPORTED_CERTIFICATE_SIZE_BUDGET" }),
  );
});
it("retains the four frozen real issuance artifacts and their three discriminating counterproofs", async () => {
  const folder = "docs/audits/D/D-B/d4-runtime-proof/",
    manifest = JSON.parse(await readFile(folder + "ARTIFACTS.json", "utf8")),
    root = await readFile(folder + manifest.root, "utf8");
  for (const artifact of manifest.artifacts) {
    const bytes = await readFile(folder + artifact.file);
    expect(
      createHash("sha256").update(bytes).digest("hex"),
      artifact.file,
    ).toBe(artifact.sha256);
    const result = await verifyPublicPdf(bytes, {
      roots: [{ pem: root, trust: "internal" }],
    });
    expect(result.status, artifact.file).toBe(artifact.expected.status);
    if (artifact.expected.accepted !== undefined)
      expect(result.verification?.accepted, artifact.file).toBe(
        artifact.expected.accepted,
      );
    if (artifact.expected.wholeFile !== undefined)
      expect(result.verification?.wholeFile, artifact.file).toBe(
        artifact.expected.wholeFile,
      );
    if (artifact.expected.documentSignature)
      expect(result.documentSignature, artifact.file).toBe(
        artifact.expected.documentSignature,
      );
  }
});

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFSignature,
  StandardFonts,
} from "pdf-lib";
import * as asn from "asn1js";
import * as pki from "pkijs";
import { InternalTimestampAuthority } from "@/lib/server/pdf-signing/internal-tsa";
import { verifyTechnicalPdf } from "@/lib/server/pdf-signing/verify";
import { signTechnicalPdf } from "@/lib/server/pdf-signing/sign";
import { testSigningIdentity } from "./support/test-signing-identity.mjs";
import {
  arrayBuffer,
  decodeCms,
  oid,
  octets,
  verifyCms,
} from "@/lib/server/pdf-signing/cms";
async function replaceUnsignedToken(
  bytes: Uint8Array,
  token: Uint8Array | null,
) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false }),
    field = pdf
      .getForm()
      .getFields()
      .find((f) => f instanceof PDFSignature)!;
  const dict = field.acroField.dict.lookup(PDFName.of("V"), PDFDict),
    range = dict.lookup(PDFName.of("ByteRange"), PDFArray),
    start = range.lookup(1, PDFNumber).asNumber(),
    end = range.lookup(2, PDFNumber).asNumber(),
    cms = decodeCms(
      dict.lookup(PDFName.of("Contents"), PDFHexString).asBytes(),
      true,
    );
  cms.signerInfos[0].unsignedAttrs = token
    ? new pki.SignedAndUnsignedAttributes({
        type: 1,
        attributes: [
          new pki.Attribute({
            type: oid.timestamp,
            values: [asn.fromBER(arrayBuffer(token)).result],
          }),
        ],
      })
    : undefined;
  const der = Buffer.from(
      new pki.ContentInfo({
        contentType: oid.signedData,
        content: cms.toSchema(true),
      })
        .toSchema()
        .toBER(false),
    ),
    hex = der.toString("hex");
  if (hex.length > end - start - 2)
    throw new Error("Counterproof CMS exceeds original placeholder");
  const result = Buffer.from(bytes);
  result.set(Buffer.from("<" + hex.padEnd(end - start - 2, "0") + ">"), start);
  return result;
}

describe("real PAdES-B-T technical signature and independent runtime verification", () => {
  let identity: Awaited<ReturnType<typeof testSigningIdentity>>,
    bytes: Uint8Array;
  beforeAll(async () => {
    identity = await testSigningIdentity();
    const pdf = await PDFDocument.create(),
      font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf
      .addPage()
      .drawText("Home Care Assistant - technical signing runtime test", {
        x: 40,
        y: 750,
        font,
        size: 12,
      });
    bytes = await pdf.save();
  }, 30_000);
  afterAll(async () => {
    await identity?.dispose();
  });
  it("validates the frozen OpenSSL TSA interoperability probe using only its explicit public root", async () => {
    const pdf = await readFile("docs/audits/D/D-B/d4-probe/signed-proof.pdf"),
      root = await readFile(
        "docs/audits/D/D-B/d4-probe/test-root-public.pem",
        "utf8",
      );
    const result = await verifyTechnicalPdf(pdf, {
      roots: [{ pem: root, trust: "internal" }],
    });
    expect(result).toMatchObject({
      accepted: true,
      profile: "PAdES-B-T",
      wholeFile: true,
      signerTrust: "internal",
      timestampTrust: "internal",
      externalTimeIndependence: false,
    });
  });
  it("signs with the Node-only internal RFC3161 authority and accepts only the produced bytes", async () => {
    const result = await signTechnicalPdf(bytes, {
      signer: identity.signer,
      timestampAuthority: new InternalTimestampAuthority(identity.tsa),
      trust: { roots: [{ pem: identity.root, trust: "internal" }] },
    });
    expect(result.verification).toMatchObject({
      accepted: true,
      timestampPolicy: "2.25.286883468022885394573621170177492655468",
      signerTrust: "internal",
      timestampTrust: "internal",
    });
    await mkdir("output/pdf", { recursive: true });
    await writeFile("output/pdf/d4-node-tsa-runtime.pdf", result.bytes);
    await writeFile("output/pdf/d4-node-tsa-root-public.pem", identity.root);
    const altered = Uint8Array.from(result.bytes);
    altered[7] = altered[7] === 55 ? 54 : 55;
    await expect(
      verifyTechnicalPdf(altered, {
        roots: [{ pem: identity.root, trust: "internal" }],
      }),
    ).rejects.toMatchObject({ code: "CONTENT_DIGEST_MISMATCH" });
    const appended = await verifyTechnicalPdf(
      Buffer.concat([result.bytes, Buffer.from("\n% appended bytes\n")]),
      { roots: [{ pem: identity.root, trust: "internal" }] },
    );
    expect(appended).toMatchObject({
      cryptographicIntegrity: true,
      wholeFile: false,
      accepted: false,
    });
  });
  it("distinguishes unknown chain and revoked signer from a damaged signature", async () => {
    const pdf = await readFile("docs/audits/D/D-B/d4-probe/signed-proof.pdf"),
      root = await readFile(
        "docs/audits/D/D-B/d4-probe/test-root-public.pem",
        "utf8",
      ),
      valid = await verifyTechnicalPdf(pdf, {
        roots: [{ pem: root, trust: "internal" }],
      });
    expect(await verifyTechnicalPdf(pdf, { roots: [] })).toMatchObject({
      cryptographicIntegrity: true,
      signerTrust: "unknown_chain",
      timestampTrust: "unknown_chain",
      accepted: false,
    });
    expect(
      await verifyTechnicalPdf(pdf, {
        roots: [{ pem: root, trust: "internal" }],
        revokedFingerprints: [valid.certificateFingerprint],
      }),
    ).toMatchObject({
      cryptographicIntegrity: true,
      signerTrust: "revoked",
      accepted: false,
    });
    await expect(
      verifyTechnicalPdf(pdf, {
        roots: [{ pem: root, trust: "internal" }],
        expectedSignerFingerprint: "0".repeat(64),
      }),
    ).rejects.toMatchObject({ code: "UNEXPECTED_DOCUMENT_CERTIFICATE" });
  });
  it("rejects missing signature, wrong-purpose TSA key, future clock and missing timestamp provider without fallback", async () => {
    await expect(
      verifyTechnicalPdf(bytes, { roots: [] }),
    ).rejects.toMatchObject({ code: "UNSIGNED_PDF" });
    expect(() => new InternalTimestampAuthority(identity.signer)).toThrow();
    await expect(
      new InternalTimestampAuthority(
        identity.tsa,
        () => new Date("2100-01-01T00:00:00Z"),
      ).timestamp(new Uint8Array(32), "SHA-256"),
    ).rejects.toMatchObject({ code: "TSA_CERTIFICATE_NOT_CURRENT" });
    await expect(
      signTechnicalPdf(bytes, {
        signer: identity.signer,
        timestampAuthority: {
          timestamp: async () => {
            throw new Error("controlled TSA unavailable");
          },
        },
        trust: { roots: [{ pem: identity.root, trust: "internal" }] },
      }),
    ).rejects.toThrow();
    await expect(
      signTechnicalPdf(bytes, {
        signer: identity.signer,
        timestampAuthority: new InternalTimestampAuthority(
          identity.tsa,
          () => new Date(Date.now() + 600_000),
        ),
        trust: { roots: [{ pem: identity.root, trust: "internal" }] },
      }),
    ).rejects.toMatchObject({ code: "TIMESTAMP_FROM_FUTURE" });
  });
  it("refuses a valid CMS stripped of its timestamp and a genuine timestamp for another signature", async () => {
    const authority = new InternalTimestampAuthority(identity.tsa),
      trust = { roots: [{ pem: identity.root, trust: "internal" as const }] },
      signed = await signTechnicalPdf(bytes, {
        signer: identity.signer,
        timestampAuthority: authority,
        trust,
      });
    const absent = await replaceUnsignedToken(signed.bytes, null);
    await expect(verifyTechnicalPdf(absent, trust)).rejects.toMatchObject({
      code: "MISSING_OR_DUPLICATED_ATTRIBUTE",
    });
    const other = await authority.timestamp(new Uint8Array(32), "SHA-256");
    const mismatched = await replaceUnsignedToken(signed.bytes, other);
    await expect(verifyTechnicalPdf(mismatched, trust)).rejects.toMatchObject({
      code: "TIMESTAMP_IMPRINT_MISMATCH",
    });
    await writeFile("output/pdf/d4-node-no-timestamp.pdf", absent);
    await writeFile("output/pdf/d4-node-other-imprint.pdf", mismatched);
  });
  it("issues distinct serials for concurrent timestamps of the same digest and validates each token cryptographically", async () => {
    const authority = new InternalTimestampAuthority(identity.tsa),
      tokens = await Promise.all(
        [1, 2, 3].map(() => authority.timestamp(new Uint8Array(32), "SHA-256")),
      ),
      serials = [];
    for (const token of tokens) {
      const cms = decodeCms(token),
        content = octets(cms.encapContentInfo.eContent);
      verifyCms(cms, content, oid.tstInfo);
      const info = new pki.TSTInfo({
        schema: asn.fromBER(arrayBuffer(content)).result,
      });
      serials.push(
        Buffer.from(info.serialNumber.valueBlock.valueHexView).toString("hex"),
      );
    }
    expect(new Set(serials).size).toBe(3);
  });
});

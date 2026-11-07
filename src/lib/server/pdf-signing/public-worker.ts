import { parentPort, workerData } from "node:worker_threads";
import DecodeStream from "pdf-lib/cjs/core/streams/DecodeStream";
import { verifyTechnicalPdf, type SignatureTrustPolicy } from "./verify";
import { SignatureValidationError } from "./cms";
import type { PublicPdfAnalysis } from "../../documents/public-verification";

// This guard lives only inside an ephemeral verifier worker. No node_modules
// file or trusted renderer is patched. Pinned pdf-lib1.17.1 uses this allocator
// for Flate/LZW/ASCII/RunLength decoding, including object and xref streams.
let allocated = 0,
  exceeded = false;
type Decoder = {
  buffer: Uint8Array;
  minBufferLength: number;
  ensureBuffer: (requested: number) => Uint8Array;
};
const prototype = DecodeStream.prototype as unknown as Decoder,
  original = prototype.ensureBuffer;
prototype.ensureBuffer = function (requested: number) {
  let next = this.minBufferLength;
  if (
    !Number.isSafeInteger(requested) ||
    requested < 0 ||
    requested > 8 * 1024 * 1024
  ) {
    exceeded = true;
    throw new Error("PDF_RESOURCE_LIMIT");
  }
  if (requested > this.buffer.byteLength) {
    while (next < requested) next *= 2;
    if (
      !Number.isSafeInteger(next) ||
      next > 8 * 1024 * 1024 ||
      allocated + next > 32 * 1024 * 1024
    ) {
      exceeded = true;
      throw new Error("PDF_RESOURCE_LIMIT");
    }
    allocated += next;
  }
  return original.call(this, requested);
};
async function main() {
  const input = workerData as {
    bytes: Uint8Array;
    policy: SignatureTrustPolicy;
  };
  let result: PublicPdfAnalysis;
  try {
    const verification = await verifyTechnicalPdf(input.bytes, input.policy);
    result = {
      status: "verified",
      documentSignature: "valid",
      timestamp: "valid",
      verification,
    };
  } catch (error) {
    const code =
        error instanceof SignatureValidationError
          ? error.code
          : "UNREADABLE_SIGNATURE",
      stage =
        error instanceof SignatureValidationError ? error.stage : "container";
    result = exceeded
      ? {
          status: "processing_limit",
          documentSignature: "not_assessed",
          timestamp: "not_assessed",
          verification: null,
          limit: "decompression",
        }
      : code === "UNSIGNED_PDF"
        ? {
            status: "unsigned",
            documentSignature: "absent",
            timestamp: "not_assessed",
            verification: null,
          }
        : code.startsWith("UNSUPPORTED")
          ? {
              status: "unsupported",
              documentSignature: "not_assessed",
              timestamp: "not_assessed",
              verification: null,
            }
          : stage === "timestamp"
            ? {
                status: "invalid_timestamp",
                documentSignature: "valid",
                timestamp: "invalid",
                verification: null,
              }
            : stage === "document"
              ? {
                  status: "invalid_signature",
                  documentSignature: "invalid",
                  timestamp: "not_assessed",
                  verification: null,
                }
              : {
                  status: [
                    "UNSUPPORTED_PDF_SIGNATURE_PROFILE",
                    "EXPECTED_ONE_EMBEDDED_SIGNATURE",
                    "ENCRYPTED_PDF_UNSUPPORTED",
                  ].includes(code)
                    ? "unsupported"
                    : "unreadable",
                  documentSignature: "not_assessed",
                  timestamp: "not_assessed",
                  verification: null,
                };
  }
  parentPort?.postMessage(result);
}
void main();

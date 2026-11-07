import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { ApiError, rpc, validateMutationRequest } from "./api";
import { createWorkerClient } from "./service-client";
import { loadPdfTrust } from "./pdf-signing/providers";
import { verifyPublicPdf } from "./pdf-signing/public-verifier";
import {
  publicPdfLimit,
  publicPdfResultSchema,
  type PublicPdfResult,
} from "../documents/public-verification";

async function budget(request: Request, upload: boolean) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret)
    throw new ApiError(
      "VERIFICATION_UNAVAILABLE",
      "A consulta está temporariamente indisponível.",
      503,
      true,
    );
  // Only the platform's overwritten header can distinguish clients. A self-hosted
  // or local process shares one conservative bucket instead of trusting arbitrary
  // forwarding headers. Raw addresses never reach the DB or application logs.
  const candidate =
    process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : null;
  const address =
    candidate && isIP(candidate) ? candidate : "shared-untrusted-proxy";
  const subject = createHmac("sha256", secret)
    .update("hca-public-pdf-rate:v1\0" + address)
    .digest("hex");
  const server = createWorkerClient();
  let admitted;
  try {
    admitted = await rpc(server, "claim_pdf_verification", {
      p_subject: subject,
      p_upload: upload,
    });
  } catch {
    throw new ApiError(
      "VERIFICATION_UNAVAILABLE",
      "A consulta pública está temporariamente indisponível.",
      503,
      true,
    );
  }
  if (!admitted)
    throw new ApiError(
      "RATE_LIMITED",
      "O limite temporário de consultas foi atingido. Aguarde um minuto.",
      429,
      true,
    );
  return server;
}
async function lookup(
  server: ReturnType<typeof createWorkerClient>,
  code: string | null,
  hash: string | null,
) {
  return (await rpc(server, "pdf_issuance_public", {
    p_code: code,
    p_hash: hash,
  })) as PublicPdfResult["reference"];
}
async function policyStatus(
  reference: PublicPdfResult["reference"],
): Promise<PublicPdfResult["policyStatus"]> {
  if (!reference.found) return null;
  try {
    const trust = await loadPdfTrust();
    if (
      trust.revokedFingerprints.includes(reference.certificateFingerprint) ||
      trust.revokedFingerprints.includes(
        reference.timestampCertificateFingerprint,
      )
    )
      return "revoked";
    const recognized = trust.issuers.some(
      (i) =>
        i.signerFingerprint === reference.certificateFingerprint &&
        i.timestampFingerprint === reference.timestampCertificateFingerprint,
    );
    return !recognized
      ? "unknown"
      : trust.roots.every((r) => r.trust === "internal")
        ? "recognized_internal"
        : trust.roots.every((r) => r.trust === "external")
          ? "recognized_external"
          : "unknown";
  } catch {
    return "unavailable";
  }
}
export async function publicPdfReference(request: Request, code: string) {
  const server = await budget(request, false),
    reference = await lookup(server, code, null);
  return publicPdfResultSchema.parse({
    reference,
    fileReference: null,
    legacy: null,
    analysis: null,
    fileSha256: null,
    policyStatus: await policyStatus(reference),
    referenceOnly: true,
  });
}
function validatePublicPdfHeaders(request: Request) {
  validateMutationRequest(request, false);
  if (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() !== "application/pdf"
  )
    throw new ApiError(
      "VALIDATION_ERROR",
      "Envie somente um PDF com até 4 MB.",
      415,
    );
  const declared = request.headers.get("content-length");
  if (
    declared &&
    (!/^\d{1,10}$/.test(declared) || Number(declared) > publicPdfLimit)
  )
    throw new ApiError("PAYLOAD_TOO_LARGE", "O PDF deve ter até 4 MB.", 413);
}
export async function boundedPublicPdf(request: Request) {
  validatePublicPdfHeaders(request);
  if (!request.body)
    throw new ApiError("VALIDATION_ERROR", "Selecione um arquivo PDF.");
  const reader = request.body.getReader(),
    parts: Uint8Array[] = [];
  let size = 0,
    timedOut = false;
  const deadline = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, 10000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > publicPdfLimit) {
        await reader.cancel();
        throw new ApiError(
          "PAYLOAD_TOO_LARGE",
          "O PDF deve ter até 4 MB.",
          413,
        );
      }
      parts.push(value);
    }
    if (timedOut)
      throw new ApiError(
        "VERIFICATION_UNAVAILABLE",
        "O envio não foi concluído a tempo. Tente novamente.",
        408,
        true,
      );
    const bytes = Buffer.concat(parts, size);
    if (size < 100 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-")
      throw new ApiError(
        "VALIDATION_ERROR",
        "O arquivo não contém um PDF reconhecível.",
        415,
      );
    return bytes;
  } finally {
    clearTimeout(deadline);
    reader.releaseLock();
  }
}
export async function publicPdfUpload(request: Request, code: string | null) {
  // Size/MIME/origin checks precede the budget; unknown PDF parsing always follows it.
  validatePublicPdfHeaders(request);
  const server = await budget(request, true),
    bytes = await boundedPublicPdf(request),
    hash = createHash("sha256").update(bytes).digest("hex");
  const reference = await lookup(server, code, hash),
    fileReference = code ? await lookup(server, null, hash) : reference;
  const legacy = !fileReference.found
    ? await rpc(server, "legacy_pdf_public", { p_hash: hash })
    : { found: false };
  let trust;
  try {
    trust = await loadPdfTrust();
  } catch {
    throw new ApiError(
      "VERIFICATION_UNAVAILABLE",
      "A política de confiança está temporariamente indisponível. Tente novamente.",
      503,
      true,
    );
  }
  const analysis = await verifyPublicPdf(bytes, {
    roots: trust.roots,
    revokedFingerprints: trust.revokedFingerprints,
  });
  return publicPdfResultSchema.parse({
    reference,
    fileReference,
    legacy,
    analysis,
    fileSha256: hash,
    policyStatus: await policyStatus(reference),
    referenceOnly: false,
  });
}

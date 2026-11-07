import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, rpc } from "./api";
import { createWorkerClient } from "./service-client";
import { pdfIssuanceSchema, type PdfIssuance } from "../documents/pdf-issuance";
import { composeIssuance, validateIssuanceContent } from "./pdf-content";
import type { DocumentSnapshot } from "./operational-pdf";
import {
  loadPdfSigningProvider,
  loadPdfTrust,
  issuanceTrust,
  type PdfTrustConfiguration,
} from "./pdf-signing/providers";
import { signTechnicalPdf } from "./pdf-signing/sign";
import { verifyTechnicalPdf } from "./pdf-signing/verify";

type StoredIntention = PdfIssuance & {
  snapshot: DocumentSnapshot;
  sourceHash: string;
  objectPath: string;
};
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const persistence = () =>
  new ApiError(
    "PERSISTENCE_UNCONFIRMED",
    "Ainda não foi possível confirmar o arquivo. Recupere esta mesma emissão antes de iniciar outra.",
    503,
    true,
  );
const signature = () =>
  new ApiError(
    "SIGNATURE_INVALID",
    "A assinatura do exemplar não passou na validação. O arquivo não foi disponibilizado.",
    503,
    false,
  );
export async function readPdfIssuance(
  client: SupabaseClient,
  id: string,
): Promise<StoredIntention> {
  return await rpc(client, "pdf_issuance", { p_id: id });
}
async function storedBytes(server: SupabaseClient, objectPath: string) {
  const { data, error } = await server.storage
    .from("document-receipts")
    .download(objectPath);
  if (error) {
    if (
      ["404", "400"].includes(String(error.statusCode)) &&
      /not found|does not exist/i.test(error.message)
    )
      return null;
    throw persistence();
  }
  if (!data || data.size > 10485760) throw persistence();
  return Buffer.from(await data.arrayBuffer());
}
async function verified(bytes: Uint8Array, trust: PdfTrustConfiguration) {
  try {
    const result = await verifyTechnicalPdf(bytes, {
      roots: trust.roots,
      revokedFingerprints: trust.revokedFingerprints,
    });
    const issuer = trust.issuers.find(
      (i) =>
        i.signerFingerprint === result.certificateFingerprint &&
        i.timestampFingerprint === result.timestampCertificateFingerprint,
    );
    if (!result.accepted || !issuer) throw signature();
    return { verification: result, keyVersion: issuer.keyVersion };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw signature();
  }
}
/** No browser-supplied bytes, snapshot, hash, path, key or validation receipt reaches this boundary. */
export async function issuePdf(
  client: SupabaseClient,
  documentId: string,
  key: string,
  version: number | undefined,
  verificationOrigin: string,
) {
  const reserved = (await rpc(client, "reserve_pdf_issuance", {
    p_document: documentId,
    p_key: key,
    p_version: version ?? null,
  })) as StoredIntention;
  if (reserved.state === "ready") return pdfIssuanceSchema.parse(reserved);
  const server = createWorkerClient();
  const { data: claim, error } = await server.rpc("claim_pdf_issuance", {
    p_id: reserved.id,
  });
  if (error?.code === "55P03")
    return pdfIssuanceSchema.parse(await readPdfIssuance(client, reserved.id));
  if (error) throw persistence();
  if (claim.ready)
    return pdfIssuanceSchema.parse(await readPdfIssuance(client, reserved.id));
  const stage = (step: string, lastError?: string) =>
    rpc(client, "pdf_issuance_stage", {
      p_id: reserved.id,
      p_token: claim.workerToken,
      p_step: step,
      p_error: lastError ?? null,
    });
  try {
    const r = await readPdfIssuance(client, reserved.id),
      trust = await loadPdfTrust();
    await stage("composing");
    const plan = await composeIssuance(r.snapshot, r.sourceHash, {
      id: r.id,
      verificationCode: r.verificationCode,
      requestedAt: r.requestedAt,
      requestedName: r.requestedName,
      representation: r.representation,
      verificationOrigin,
    });
    let bytes = await storedBytes(server, claim.objectPath);
    if (!bytes) {
      await stage("signing");
      const provider = await loadPdfSigningProvider();
      let signed;
      try {
        signed = await signTechnicalPdf(plan.bytes, provider);
      } catch {
        throw new ApiError(
          "SIGNING_UNAVAILABLE",
          "Não foi possível concluir a assinatura com carimbo interno. Recupere esta emissão.",
          503,
          true,
        );
      }
      await validateIssuanceContent(signed.bytes, plan);
      await stage("persisting");
      // Any ambiguous/duplicate upload is reconciled by reading the one immutable path.
      await server.storage
        .from("document-receipts")
        .upload(claim.objectPath, signed.bytes, {
          contentType: "application/pdf",
          upsert: false,
        });
      bytes = await storedBytes(server, claim.objectPath);
      if (!bytes) throw persistence();
    }
    await validateIssuanceContent(bytes, plan);
    const checked = await verified(bytes, trust);
    // Auth and the server-only lease are both rechecked by the final transaction.
    const receipt = await rpc(client, "complete_pdf_issuance", {
      p_id: r.id,
      p_token: claim.workerToken,
      p_hash: hash(bytes),
      p_size: bytes.length,
      p_validation: checked.verification,
      p_key_version: checked.keyVersion,
      p_trust_revision: trust.revision,
    });
    return pdfIssuanceSchema.parse(receipt);
  } catch (error) {
    const code =
      error instanceof ApiError &&
      ["CONTENT_INVALID", "SIGNATURE_INVALID", "SIGNING_UNAVAILABLE"].includes(
        error.code,
      )
        ? error.code
        : "PERSISTENCE_UNCONFIRMED";
    try {
      await stage("uncertain", code);
    } catch {
      /* The original failure stays primary; expired/revoked leases cannot change state. */
    }
    throw error;
  }
}
/** Downloads never render or require a private key. They verify the registered bytes under current public policy. */
export async function downloadPdfIssuance(
  client: SupabaseClient,
  documentId: string,
  id: string,
) {
  const r = await readPdfIssuance(client, id);
  if (r.documentId !== documentId)
    throw new ApiError(
      "NOT_FOUND",
      "Exemplar não encontrado neste documento.",
      404,
    );
  if (r.state !== "ready" || !r.sha256 || !r.keyVersion || !r.validation)
    throw persistence();
  const bytes = await storedBytes(createWorkerClient(), r.objectPath);
  if (!bytes) throw persistence();
  if (hash(bytes) !== r.sha256 || bytes.length !== r.sizeBytes)
    throw new ApiError(
      "SIGNATURE_INVALID",
      "Os bytes armazenados divergem do exemplar registrado. O arquivo não foi disponibilizado.",
      503,
      false,
    );
  const trust = await loadPdfTrust();
  let current;
  try {
    current = await verifyTechnicalPdf(
      bytes,
      issuanceTrust(trust, r.keyVersion),
    );
  } catch {
    throw signature();
  }
  if (
    !current.accepted ||
    current.certificateFingerprint !== r.validation.certificateFingerprint ||
    current.timestampCertificateFingerprint !==
      r.validation.timestampCertificateFingerprint
  )
    throw signature();
  await readPdfIssuance(client, id);
  return {
    bytes,
    filename: `${r.snapshot.code}-v${r.version}-${r.id.slice(0, 8)}.pdf`,
  };
}

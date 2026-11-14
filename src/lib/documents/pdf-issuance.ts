import { z } from "zod";
import { pdfDocumentOptionsSchema } from "./pdf-modes";

const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
export const pdfVerificationSchema = z.object({
  profile: z.literal("PAdES-B-T"),
  accepted: z.boolean(),
  cryptographicIntegrity: z.literal(true),
  wholeFile: z.boolean(),
  signerTrust: z.enum([
    "internal",
    "external",
    "unknown_chain",
    "invalid_chain",
    "revoked",
    "expired",
  ]),
  timestampTrust: z.enum([
    "internal",
    "external",
    "unknown_chain",
    "invalid_chain",
    "revoked",
    "expired",
  ]),
  certificateFingerprint: fingerprint,
  timestampCertificateFingerprint: fingerprint,
  timestampAt: z.iso.datetime({ offset: true }),
  timestampPolicy: z.string(),
  externalTimeIndependence: z.literal(false),
  revocationEvidence: z.literal("configured_internal_denylist_only"),
});
export const pdfIssuanceSchema = z
  .object({
    id: z.uuid(),
    documentId: z.uuid(),
    careRecipientId: z.uuid(),
    version: z.number().int().positive(),
    requestedBy: z.uuid().nullable(),
    requestedName: z.string(),
    requestedAt: z.iso.datetime({ offset: true }),
    readyAt: z.iso.datetime({ offset: true }).nullable(),
    verificationCode: z.string().regex(/^[A-F0-9]{32}$/),
    rendererRevision: z.number().int().min(5),
    documentOptions: pdfDocumentOptionsSchema.optional(),
    representation: z.enum(["operational", "derived"]),
    state: z.enum(["reserved", "processing", "uncertain", "ready"]),
    step: z.enum([
      "reserved",
      "recovering",
      "composing",
      "signing",
      "persisting",
      "uncertain",
      "ready",
    ]),
    sha256: fingerprint.nullable(),
    sizeBytes: z.number().int().positive().nullable(),
    validation: pdfVerificationSchema.nullable(),
    keyVersion: z.string().nullable(),
    trustRevision: z.string().nullable(),
    lastError: z
      .enum([
        "SIGNING_UNAVAILABLE",
        "CONTENT_INVALID",
        "SIGNATURE_INVALID",
        "PERSISTENCE_UNCONFIRMED",
      ])
      .nullable(),
  })
  .superRefine((r, ctx) => {
    if ((r.rendererRevision === 17) !== (r.documentOptions !== undefined)) ctx.addIssue({ code: "custom", message: "Incomplete documentary modality" });
    if (
      r.state === "ready" &&
      (!r.sha256 ||
        !r.sizeBytes ||
        !r.readyAt ||
        !r.validation?.accepted ||
        !r.keyVersion ||
        !r.trustRevision)
    )
      ctx.addIssue({ code: "custom", message: "Incomplete ready issuance" });
  });
export type PdfIssuance = z.infer<typeof pdfIssuanceSchema>;
export const pdfIssuancePageSchema = z.object({
  data: z.array(pdfIssuanceSchema),
  next: z
    .object({ at: z.iso.datetime({ offset: true }), id: z.uuid() })
    .nullable(),
});
export const pdfIssuanceRequestSchema = z
  .object({
    idempotencyKey: z.uuid(),
    documentOptions: pdfDocumentOptionsSchema.optional(),
    version: z.number().int().positive().max(2147483647).optional(),
  })
  .strict();

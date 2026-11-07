import { z } from "zod";
import { pdfVerificationSchema } from "./pdf-issuance";
export const publicPdfLimit = 4 * 1024 * 1024;
export const verificationCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .transform((value) =>
    value
      .toUpperCase()
      .replace(/^HCA[- ]?/, "")
      .replaceAll(/[-\s]/g, ""),
  )
  .pipe(z.string().regex(/^[A-F0-9]{32}$/));
export const publicPdfAnalysisSchema = z
  .object({
    status: z.enum([
      "verified",
      "unsigned",
      "invalid_signature",
      "invalid_timestamp",
      "unreadable",
      "unsupported",
      "processing_limit",
    ]),
    documentSignature: z.enum(["valid", "invalid", "absent", "not_assessed"]),
    timestamp: z.enum(["valid", "invalid", "not_assessed"]),
    verification: pdfVerificationSchema.nullable(),
    limit: z.enum(["decompression", "heap", "time", "interrupted"]).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.status === "verified" &&
      (!value.verification ||
        value.documentSignature !== "valid" ||
        value.timestamp !== "valid")
    )
      context.addIssue({
        code: "custom",
        message: "Incomplete cryptographic result",
      });
    if (value.status !== "verified" && value.verification)
      context.addIssue({
        code: "custom",
        message: "Contradictory cryptographic result",
      });
    if (
      value.verification?.accepted &&
      (!value.verification.wholeFile ||
        ![
          value.verification.signerTrust,
          value.verification.timestampTrust,
        ].every((t) => t === "internal" || t === "external"))
    )
      context.addIssue({ code: "custom", message: "Contradictory acceptance" });
  });
export type PublicPdfAnalysis = z.infer<typeof publicPdfAnalysisSchema>;
const reference = z.object({
  found: z.literal(true),
  issuanceId: z.uuid(),
  verificationCode: z.string().regex(/^[A-F0-9]{32}$/),
  registeredAt: z.iso.datetime({ offset: true }),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().positive(),
  bytesMatch: z.boolean().nullable(),
  recordedProfile: z.string(),
  recordedTimestamp: z.iso.datetime({ offset: true }),
  certificateFingerprint: z.string(),
  timestampCertificateFingerprint: z.string(),
  trustRevision: z.string(),
  externalTimeIndependence: z.literal(false),
});
export const publicPdfResultSchema = z.object({
  reference: z.union([z.object({ found: z.literal(false) }), reference]),
  fileReference: z
    .union([z.object({ found: z.literal(false) }), reference])
    .nullable(),
  legacy: z
    .object({
      found: z.boolean(),
      registeredAt: z.iso.datetime({ offset: true }).optional(),
      sha256: z.string().optional(),
    })
    .nullable(),
  analysis: publicPdfAnalysisSchema.nullable(),
  fileSha256: z.string().nullable(),
  policyStatus: z
    .enum([
      "recognized_internal",
      "recognized_external",
      "revoked",
      "unknown",
      "unavailable",
    ])
    .nullable(),
  referenceOnly: z.boolean(),
});
export type PublicPdfResult = z.infer<typeof publicPdfResultSchema>;

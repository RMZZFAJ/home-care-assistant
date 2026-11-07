import { z } from "zod";
import { pdfIssuanceSchema } from "./pdf-issuance";
const kind = z.enum(["issuance", "legacy_original", "legacy_render"]);
const cursor = z.object({
  at: z.iso.datetime({ offset: true }),
  kind,
  reference: z.string().min(1).max(96),
});
const entryBase = {
  at: z.iso.datetime({ offset: true }),
  reference: z.string().min(1).max(96),
};
const legacyBase = {
  ...entryBase,
  version: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
};
export const pdfArchiveEntrySchema = z.discriminatedUnion("kind", [
  z.object({
    ...entryBase,
    kind: z.literal("issuance"),
    issuance: pdfIssuanceSchema,
  }),
  z.object({
    ...legacyBase,
    kind: z.literal("legacy_original"),
    renderer: z.null(),
  }),
  z.object({
    ...legacyBase,
    kind: z.literal("legacy_render"),
    renderer: z.number().int().min(4),
  }),
]);
export const pdfArchivePageSchema = z.object({
  data: z.array(pdfArchiveEntrySchema),
  next: cursor.nullable(),
});
export type PdfArchiveEntry = z.infer<typeof pdfArchiveEntrySchema>;
export type PdfArchiveCursor = z.infer<typeof cursor>;
export const archiveQuerySchema = z
  .object({
    version: z.coerce.number().int().positive().max(2147483647).optional(),
    before: z.iso.datetime({ offset: true }).optional(),
    kind: kind.optional(),
    reference: z.string().min(1).max(96).optional(),
  })
  .strict()
  .refine(
    (q) =>
      [q.before, q.kind, q.reference].filter((v) => v !== undefined).length %
        3 ===
      0,
  );

import { z } from "zod";
import { pdfIssuanceSchema } from "./pdf-issuance";
const kind = z.literal("issuance");
const cursor = z.object({
  at: z.iso.datetime({ offset: true }),
  kind,
  reference: z.string().min(1).max(96),
});
const entryBase = {
  at: z.iso.datetime({ offset: true }),
  reference: z.string().min(1).max(96),
};
export const pdfArchiveEntrySchema = z.object({...entryBase,kind:z.literal("issuance"),issuance:pdfIssuanceSchema});
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

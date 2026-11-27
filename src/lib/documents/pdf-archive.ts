import { z } from "zod";
import { pdfIssuanceSchema } from "./pdf-issuance";
const kind = z.literal("issuance");
const revision = z.coerce.number().int().positive().max(2147483647);
export const pdfArchiveFilter = z.enum(["current", "previous"]);
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
  basisVersion: z.number().int().positive().optional(),
  filter: pdfArchiveFilter.optional(),
});
export type PdfArchiveEntry = z.infer<typeof pdfArchiveEntrySchema>;
export type PdfArchiveCursor = z.infer<typeof cursor>;
export const archiveQuerySchema = z
  .object({
    version: revision.optional(),
    filter: pdfArchiveFilter.optional(),
    basis: revision.optional(),
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
  )
  .refine(q => q.filter
    ? q.version === undefined && (q.before === undefined) === (q.basis === undefined)
    : q.basis === undefined);

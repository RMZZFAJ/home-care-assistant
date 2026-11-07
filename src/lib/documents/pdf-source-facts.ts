import { z } from "zod";
const date = z.iso.datetime({ offset: true }).nullable();
const provenance = z.enum([
  "origin_record",
  "import_record",
  "event_snapshot",
  "current_profile",
  "unknown",
]);
export const pdfSourceFactsSchema = z
  .object({
    schemaVersion: z.literal(1),
    historical: z.boolean(),
    sourceCreatedAt: date,
    importedAt: date,
    registeredAt: date,
    documentCreatedAt: date,
    draftCreatedAt: date,
    issuedAt: date,
    issuerId: z.uuid().nullable(),
    issuerName: z.string().nullable(),
    issuerSource: provenance,
    patientName: z.string().nullable(),
    patientSource: provenance,
    historyActors: z.array(
      z.object({
        version: z.number().int().positive(),
        id: z.uuid().nullable(),
        name: z.string().nullable(),
        source: provenance,
      }),
    ),
  })
  .strict();
export type PdfSourceFacts = z.infer<typeof pdfSourceFactsSchema>;
export const sourceNameLabels: Record<PdfSourceFacts["issuerSource"], string> =
  {
    origin_record: "Nome preservado no documento de origem",
    import_record: "Nome preservado no registro da importação",
    event_snapshot: "Nome preservado no evento documental",
    current_profile: "Nome atual do cadastro; nome histórico não preservado",
    unknown: "Nome histórico não preservado",
  };

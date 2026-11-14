import { z } from "zod";
import { progressRowSchema, automaticProgressSchema } from "@/lib/validation/document-progress";
import { pdfPresentationSchema } from "./pdf-presentation";
import { pdfLifecycleFactsSchema } from "./pdf-lifecycle";

export const pdfSectionLabels = {
  progress: "Andamentos", communications: "Comunicações", confirmations: "Confirmações",
  relations: "Detalhes dos vínculos", access: "Histórico operacional de acesso",
} as const;
export const pdfSectionOrder = ["progress", "communications", "confirmations", "relations", "access"] as const;
const section = z.enum(pdfSectionOrder), instant = z.iso.datetime({ offset: true });
export const pdfDocumentOptionsSchema = z.object({
  mode: z.enum(["expanded", "audit"]),
  sections: z.array(section).min(1, "Escolha ao menos um complemento.").max(5, "Escolha até cinco complementos.").refine(rows => new Set(rows).size === rows.length, "Não repita complementos."),
  period: z.object({ from: z.iso.date().nullable(), through: z.iso.date().nullable(), timeZone: z.literal("America/Sao_Paulo") }).strict(),
  purpose: z.string().min(3).max(500).nullable(),
}).strict().superRefine((value, context) => {
  const { from, through } = value.period;
  if ((from === null) !== (through === null) || from && through && from > through)
    context.addIssue({ code: "custom", message: "Informe início e fim do período, em ordem." });
  if (value.mode === "audit" ? !value.purpose?.trim() || value.purpose.trim().length < 3 : value.purpose !== null)
    context.addIssue({ code: "custom", message: "Informe a finalidade do relatório de auditoria." });
}).transform(value => ({ ...value, sections: pdfSectionOrder.filter(section => value.sections.includes(section)) }));
export type PdfDocumentOptions = z.infer<typeof pdfDocumentOptionsSchema>;
const communications = z.object({
  id: z.uuid(), recordedAt: instant, group: z.string().min(1), recipientLabel: z.string(), channel: z.string().min(1),
  state: z.string().min(1), attempts: z.number().int().nonnegative(), seenAt: instant.nullable(),
}).strict();
const access = z.object({
  id: z.uuid(), recordedAt: instant, actorName: z.string().nullable(), referenceVersion: z.number().int().positive(),
  origin: z.literal("application_foreground_display_report"),
}).strict();
const audit = z.object({ id: z.uuid(), recordedAt: instant, action: z.string().min(1), actorId: z.uuid().nullable() }).strict();
export const pdfDocumentExpansionSchema = z.object({
  schemaVersion: z.literal(1), documentId: z.uuid(), documentVersion: z.number().int().positive(), referenceAt: instant,
  options: pdfDocumentOptionsSchema,
  progress: z.array(progressRowSchema).nullable(), communications: z.array(communications).nullable(),
  confirmations: z.array(automaticProgressSchema).nullable(),
  relations: z.object({ references: pdfPresentationSchema.shape.references, complements: pdfLifecycleFactsSchema.shape.complements }).strict().nullable(),
  access: z.array(access).nullable(), auditTrail: z.array(audit).nullable(),
}).strict();
export type PdfDocumentExpansion = z.infer<typeof pdfDocumentExpansionSchema>;
function brazilDay(instant: string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}
export function requirePdfDocumentExpansion(value: unknown, source: { id: string; version: number; requestedAt?: string; presentationFacts?: unknown; lifecycleFacts?: unknown }) {
  const result = pdfDocumentExpansionSchema.parse(value), options = result.options;
  if (result.documentId !== source.id || result.documentVersion !== source.version || source.requestedAt && result.referenceAt !== source.requestedAt)
    throw new Error("Document complement scope mismatch");
  for (const section of pdfSectionOrder)
    if (options.sections.includes(section) !== (result[section] !== null)) throw new Error("Incomplete selected document source");
  if ((options.mode === "audit") !== (result.auditTrail !== null)) throw new Error("Document audit scope mismatch");
  for (const rows of [result.progress, result.communications, result.confirmations, result.access, result.auditTrail]) {
    if (!rows) continue;
    if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error("Duplicate document complement records");
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index], day = brazilDay(row.recordedAt);
      if (Date.parse(row.recordedAt) > Date.parse(result.referenceAt) || options.period.from && day < options.period.from || options.period.through && day > options.period.through)
        throw new Error("Document complement period mismatch");
      if (index && Date.parse(rows[index - 1].recordedAt) > Date.parse(row.recordedAt)) throw new Error("Document complement chronology mismatch");
      if ("documentId" in row && row.documentId !== source.id) throw new Error("Foreign document complement");
    }
  }
  if (result.relations && source.presentationFacts && source.lifecycleFacts) {
    const presentation = pdfPresentationSchema.parse(source.presentationFacts), lifecycle = pdfLifecycleFactsSchema.parse(source.lifecycleFacts);
    if (JSON.stringify(result.relations.references) !== JSON.stringify(presentation.references) || JSON.stringify(result.relations.complements) !== JSON.stringify(lifecycle.complements))
      throw new Error("Document relation source mismatch");
  }
  return result;
}
export function documentModeLabel(options?: PdfDocumentOptions) {
  return options?.mode === "audit" ? "Relatório de auditoria da ficha" : options?.mode === "expanded" ? "Ficha Ampliada" : "Ficha";
}

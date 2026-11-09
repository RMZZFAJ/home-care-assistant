import { z } from "zod";

export const progressCategories = {
  record: "Registro complementar", action: "Providência", contact: "Contato", pending: "Pendência",
} as const;
export const progressStages = {
  issuance: "Emissão", family_science: "Ciência familiar", fulfillment: "Atendimento", completion: "Conclusão",
  acquisition: "Aquisição", dispatch: "Expedição", receipt: "Recebimento", count: "Contagem", review: "Revisão",
} as const;
export const stagesByDocument = {
  REQ: ["issuance", "family_science", "fulfillment", "completion"],
  COM: ["issuance", "acquisition", "receipt", "completion"],
  ENT: ["issuance", "dispatch", "receipt", "completion"],
  BAL: ["issuance", "count", "review", "completion"],
} as const;
const uuid = z.string().uuid();
const instant = z.string().datetime({ offset: true });
export const progressFilter = z.enum(["all", "automatic", "manual"]);
export const progressContent = z.object({
  category: z.enum(["record", "action", "contact", "pending"]),
  stage: z.enum(["issuance", "family_science", "fulfillment", "completion", "acquisition", "dispatch", "receipt", "count", "review"]).nullable(),
  text: z.string().min(1).max(2000).refine(value => value.trim().length > 0, "Descreva o andamento."),
  references: z.array(uuid).max(8).refine(ids => new Set(ids).size === ids.length, "Não repita referências."),
}).strict();
export const publishProgress = z.object({ key: uuid, content: progressContent }).strict();
export type ProgressPacket = z.infer<typeof publishProgress>;
const manual = z.object({
  id: uuid, source: z.literal("manual"), documentId: uuid, recordedAt: instant,
  authorId: uuid, authorName: z.string().min(1), category: progressContent.shape.category,
  stage: progressContent.shape.stage, text: progressContent.shape.text,
  references: z.array(z.object({ id: uuid, code: z.string().nullable(), type: z.enum(["REQ", "COM", "ENT", "BAL"]) }).strict()).max(8),
}).strict();
const automatic = z.object({
  id: uuid, source: z.literal("automatic"), documentId: uuid, recordedAt: instant, action: z.string().min(1),
  version: z.number().int().positive(), authorId: uuid.nullable(), authorName: z.string().nullable(),
}).strict();
const page = z.object({
  documentId: uuid, documentType: z.enum(["REQ", "COM", "ENT", "BAL"]), filter: progressFilter,
  page: z.number().int().positive(), size: z.number().int().min(1).max(50), total: z.number().int().nonnegative(),
  canPublish: z.boolean(), data: z.array(z.discriminatedUnion("source", [manual, automatic])).max(50),
}).strict();
const outcome = z.object({ note: manual, key: uuid, intentHash: z.string().regex(/^[0-9a-f]{64}$/), recovered: z.boolean() }).strict();
export const progressReferenceRow = z.object({ id: uuid, code: z.string().nullable(), type: z.enum(["REQ", "COM", "ENT", "BAL"]) });
export const progressReferencePage = z.object({
  documentId: uuid, careRecipientId: uuid, search: z.string(), page: z.number().int().positive(), size: z.literal(20),
  data: z.array(progressReferenceRow).max(20), total: z.number().int().nonnegative(),
}).strict();
export type ProgressPage = z.infer<typeof page>;
export type ProgressOutcome = z.infer<typeof outcome>;

export function parseProgressPage(value: unknown, id: string, filter: string, selectedPage: number) {
  const result = page.safeParse(value);
  if (!result.success) throw new Error("A consulta de Andamentos não pôde ser conferida. Atualize esta seção.");
  const parsed = result.data;
  if (parsed.documentId !== id || parsed.filter !== filter || parsed.page !== selectedPage || parsed.size !== 20
    || parsed.data.some(row => row.documentId !== id || filter !== "all" && row.source !== filter)
    || parsed.data.length > parsed.total || new Set(parsed.data.map(row => row.id)).size !== parsed.data.length)
    throw new Error("A consulta de Andamentos não corresponde à ficha e à página selecionadas.");
  for (let index = 1; index < parsed.data.length; index++) {
    const before = parsed.data[index - 1], current = parsed.data[index];
    if (Date.parse(before.recordedAt) > Date.parse(current.recordedAt)) throw new Error("A ordem dos Andamentos não pôde ser conferida.");
  }
  return parsed;
}

export function progressConfirmed(value: unknown, packet: ProgressPacket, documentId: string, authorId: string) {
  const parsed = outcome.safeParse(value);
  return parsed.success && parsed.data.key === packet.key && parsed.data.note.documentId === documentId
    && parsed.data.note.authorId === authorId && parsed.data.note.references.every(ref => packet.content.references.includes(ref.id))
    && parsed.data.note.category === packet.content.category && parsed.data.note.stage === packet.content.stage
    && parsed.data.note.text === packet.content.text;
}

export function parseProgressOutcome(value: unknown) { return outcome.parse(value); }

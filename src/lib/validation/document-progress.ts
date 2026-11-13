import { z } from "zod";

export const progressCategories = {
  record: "Registro complementar",
  action: "Providência",
  contact: "Contato",
  pending: "Pendência",
} as const;
export const progressStages = {
  issuance: "Emissão",
  family_science: "Ciência familiar",
  fulfillment: "Atendimento",
  completion: "Conclusão",
  acquisition: "Aquisição",
  dispatch: "Expedição",
  receipt: "Recebimento",
  count: "Contagem",
  review: "Revisão",
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
export const progressContent = z
  .object({
    category: z.enum(["record", "action", "contact", "pending"]),
    stage: z
      .enum([
        "issuance",
        "family_science",
        "fulfillment",
        "completion",
        "acquisition",
        "dispatch",
        "receipt",
        "count",
        "review",
      ])
      .nullable(),
    text: z
      .string()
      .min(1)
      .refine(
        (value) => value.length <= 2000,
        "O andamento permite até 2000 caracteres.",
      )
      .refine((value) => value.trim().length > 0, "Descreva o andamento."),
    references: z
      .array(uuid)
      .max(8)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Não repita referências.",
      ),
  })
  .strict();
export const progressPublication = z.object({
  relevance: z.enum(["normal", "milestone", "attention"]),
  mentions: z.array(uuid).max(8).refine(ids => new Set(ids.map(x => x.toLowerCase())).size === ids.length, "Não repita pessoas mencionadas."),
  visibility: z.enum(["public", "family"]).optional(),
  mentionAll: z.boolean().optional(),
}).strict();
export const publishProgress = z
  .object({ key: uuid, content: progressContent, publication: progressPublication.optional() })
  .strict();
export type ProgressPacket = z.infer<typeof publishProgress>;
const manual = z
  .object({
    id: uuid,
    source: z.literal("manual"),
    documentId: uuid,
    recordedAt: instant,
    authorId: uuid,
    authorName: z.string().min(1),
    category: progressContent.shape.category,
    stage: progressContent.shape.stage,
    text: progressContent.shape.text,
    relevance: progressPublication.shape.relevance.optional(),
    visibility: z.enum(["public", "family"]).optional(),
    mentionAll: z.boolean().optional(),
    mentions: z.array(z.object({ id: uuid, name: z.string().min(1), careRole: z.enum(["admin", "family", "supervisor", "professional", "reader"]) }).strict()).max(8).optional(),
    references: z
      .array(
        z
          .object({
            id: uuid,
            code: z.string().nullable(),
            type: z.enum(["REQ", "COM", "ENT", "BAL"]),
            kind: z.enum(["document", "progress"]).optional(),
            documentId: uuid.optional(),
            excerpt: z.string().optional(),
            recordedAt: instant.optional(),
          })
          .strict(),
      )
      .max(8),
  })
  .strict()
  .refine(value => (value.relevance === undefined) === (value.mentions === undefined), "Os detalhes da publicação estão incompletos.")
  .refine(value => !value.mentions || new Set(value.mentions.map(x => x.id.toLowerCase())).size === value.mentions.length, "Não repita pessoas mencionadas.");
const automatic = z
  .object({
    id: uuid,
    source: z.literal("automatic"),
    documentId: uuid,
    recordedAt: instant,
    action: z.string().min(1),
    version: z.number().int().positive(),
    authorId: uuid.nullable(),
    authorName: z.string().nullable(),
  })
  .strict();
export const progressRowSchema = z.discriminatedUnion("source", [manual, automatic]);
export const automaticProgressSchema = automatic;
const page = z
  .object({
    documentId: uuid,
    documentType: z.enum(["REQ", "COM", "ENT", "BAL"]),
    filter: progressFilter,
    page: z.number().int().positive(),
    size: z.number().int().min(1).max(50),
    total: z.number().int().nonnegative(),
    canPublish: z.boolean(),
    data: z.array(progressRowSchema).max(50),
  })
  .strict();
const outcome = z
  .object({
    note: manual,
    key: uuid,
    intentHash: z.string().regex(/^[0-9a-f]{64}$/),
    recovered: z.boolean(),
  })
  .strict();
export const progressReferenceRow = z.object({
  id: uuid,
  code: z.string().nullable(),
  type: z.enum(["REQ", "COM", "ENT", "BAL"]),
  kind: z.enum(["document", "progress"]).optional(),
  documentId: uuid.optional(),
  excerpt: z.string().optional(),
  recordedAt: instant.optional(),
});
export const progressReferencePage = z
  .object({
    documentId: uuid,
    careRecipientId: uuid,
    search: z.string(),
    page: z.number().int().positive(),
    size: z.literal(20),
    data: z.array(progressReferenceRow).max(20),
    total: z.number().int().nonnegative(),
  })
  .strict();
export type ProgressPage = z.infer<typeof page>;
export type ProgressOutcome = z.infer<typeof outcome>;

export function parseProgressPage(
  value: unknown,
  id: string,
  filter: string,
  selectedPage: number,
) {
  const result = page.safeParse(value);
  if (!result.success)
    throw new Error(
      "A consulta de Andamentos não pôde ser conferida. Atualize esta seção.",
    );
  const parsed = result.data;
  if (
    parsed.documentId !== id ||
    parsed.filter !== filter ||
    parsed.page !== selectedPage ||
    parsed.size !== 20 ||
    parsed.data.some(
      (row) =>
        row.documentId !== id || (filter !== "all" && row.source !== filter),
    ) ||
    parsed.data.length > parsed.total ||
    new Set(parsed.data.map((row) => row.id)).size !== parsed.data.length
  )
    throw new Error(
      "A consulta de Andamentos não corresponde à ficha e à página selecionadas.",
    );
  for (let index = 1; index < parsed.data.length; index++) {
    const before = parsed.data[index - 1],
      current = parsed.data[index];
    if (Date.parse(before.recordedAt) > Date.parse(current.recordedAt))
      throw new Error("A ordem dos Andamentos não pôde ser conferida.");
  }
  return parsed;
}

export function progressConfirmed(
  value: unknown,
  packet: ProgressPacket,
  documentId: string,
  authorId: string,
) {
  const parsed = outcome.safeParse(value);
  return (
    parsed.success &&
    parsed.data.key === packet.key &&
    parsed.data.note.documentId === documentId &&
    parsed.data.note.authorId === authorId &&
    parsed.data.note.references.every((ref) =>
      packet.content.references.includes(ref.id),
    ) &&
    parsed.data.note.category === packet.content.category &&
    parsed.data.note.stage === packet.content.stage &&
    parsed.data.note.text === packet.content.text &&
    (packet.publication
      ? parsed.data.note.relevance === packet.publication.relevance &&
      (parsed.data.note.visibility ?? "public") === (packet.publication.visibility ?? "public") &&
      (parsed.data.note.mentionAll ?? false) === (packet.publication.mentionAll ?? false) &&
      JSON.stringify(parsed.data.note.mentions?.map(x => x.id.toLowerCase())) === JSON.stringify(packet.publication.mentions.map(x => x.toLowerCase()))
      : parsed.data.note.relevance === undefined && parsed.data.note.mentions === undefined)
  );
}

export function mentionsEveryone(text: string) {
  return /(^|[^\p{L}\p{N}_])@todos(?![\p{L}\p{N}_])/iu.test(text);
}

export function parseProgressOutcome(value: unknown) {
  return outcome.parse(value);
}


/** Only the official packet carries these choices; private four-field drafts stay unchanged. */
export function progressPublicationBody(packet: ProgressPacket) {
  return {
    ...packet.content,
    ...(packet.publication ? { publication: packet.publication } : {}),
  };
}
export const progressPerson = z.object({
  id: uuid, name: z.string().min(1), careRole: z.enum(["admin", "family", "supervisor", "professional", "reader"]),
}).strict();
export const progressPeoplePage = z.object({
  documentId: uuid, careRecipientId: uuid, search: z.string(), page: z.number().int().positive(),
  size: z.literal(20), total: z.number().int().nonnegative(), data: z.array(progressPerson).max(20),
}).strict();

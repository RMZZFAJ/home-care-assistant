import { z } from "zod";

export const accessCursorSchema = z.object({ at: z.iso.datetime({ offset: true }), id: z.uuid() }).strict();
const row = z.object({
  id: z.uuid(), documentId: z.uuid(), referenceVersion: z.number().int().positive(),
  actorId: z.uuid(), actorName: z.string().nullable(), recordedAt: z.iso.datetime({ offset: true }),
  origin: z.literal("application_foreground_display_report"),
}).strict();
export const recordDocumentAccessSchema = z.object({ referenceVersion: z.number().int().positive().max(2147483647), key: z.uuid() }).strict();
export const documentAccessOutcomeSchema = row.extend({ recovered: z.boolean(), windowReused: z.boolean() });
const history = z.object({ documentId: z.uuid(), groupingMinutes: z.literal(20), data: z.array(row.extend({ materialIdentity: z.string().regex(/^[0-9a-f]{64}$/).nullable() })).max(20), next: accessCursorSchema.nullable() }).strict();
export type DocumentAccessCursor = z.infer<typeof accessCursorSchema>;
export function parseDocumentAccessHistory(value: unknown, id: string) {
  const parsed = history.parse(value);
  if (parsed.documentId !== id || parsed.data.some(item => item.documentId !== id) || new Set(parsed.data.map(item => item.id)).size !== parsed.data.length)
    throw new Error("O histórico de acesso não corresponde à ficha consultada.");
  for (let index = 1; index < parsed.data.length; index++) {
    const before = parsed.data[index - 1], current = parsed.data[index];
    if (Date.parse(before.recordedAt) < Date.parse(current.recordedAt) || before.recordedAt === current.recordedAt && before.id < current.id)
      throw new Error("A ordem do histórico de acesso não pôde ser conferida.");
  }
  if (parsed.next && (parsed.data.length !== 20 || parsed.next.id !== parsed.data.at(-1)?.id || parsed.next.at !== parsed.data.at(-1)?.recordedAt))
    throw new Error("A continuação do histórico de acesso não pôde ser conferida.");
  return parsed;
}

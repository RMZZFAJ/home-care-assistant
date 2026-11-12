import { z } from "zod";

const identity = z.string().uuid(), instant = z.string().datetime({ offset: true });
const actor = { actorId: identity.nullable(), actorName: z.string().nullable(), recordedAt: instant };
const act = z.object({ id: identity, version: z.number().int().positive(), ...actor, reason: z.string().nullable() }).strict();
const acknowledgement = act.omit({ reason: true });
const cancellation = z.discriminatedUnion("state", [
  z.object({ state: z.literal("not_cancelled"), act: z.null(), acknowledgements: z.array(acknowledgement).length(0) }).strict(),
  z.object({ state: z.literal("unavailable"), act: z.null(), acknowledgements: z.array(acknowledgement).length(0) }).strict(),
  z.object({ state: z.literal("recorded"), act, acknowledgements: z.array(acknowledgement) }).strict(),
]);
const link = { id: identity, role: z.enum(["source", "supplement"]), version: z.number().int().positive(), eventId: identity };
const complement = z.discriminatedUnion("accessible", [
  z.object({ ...link, accessible: z.literal(false) }).strict(),
  z.object({ ...link, accessible: z.literal(true), ...actor, reason: z.string(), document: z.object({
    id: identity, type: z.enum(["REQ", "COM", "ENT", "BAL"]), code: z.string().min(1), protocol: z.string().min(1),
    version: z.number().int().positive(), hash: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict() }).strict(),
]);
export const pdfLifecycleFactsSchema = z.object({
  schemaVersion: z.literal(1), documentId: identity, version: z.number().int().positive(),
  cancellation, complements: z.array(complement),
}).strict();
export type PdfLifecycleFacts = z.infer<typeof pdfLifecycleFactsSchema>;
export function requirePdfLifecycleFacts(value: unknown, source: { id: string; version: number; status: string }) {
  const f = pdfLifecycleFactsSchema.parse(value), c = f.cancellation;
  if (f.documentId !== source.id || f.version !== source.version || (c.state !== "not_cancelled") !== (source.status === "cancelled")
    || (c.state === "recorded" && (c.act.version > f.version || c.acknowledgements.some(a => a.version <= c.act.version || a.version > f.version)
      || new Set(c.acknowledgements.map(a => a.id)).size !== c.acknowledgements.length
      || new Set(c.acknowledgements.map(a => a.version)).size !== c.acknowledgements.length))
    || f.complements.some(l => l.version > f.version || (l.accessible && l.document.id === source.id))
    || new Set(f.complements.map(l => l.id)).size !== f.complements.length
    || new Set(f.complements.map(l => l.eventId)).size !== f.complements.length)
    throw new Error("Document lifecycle source or cutoff mismatch");
  return f;
}

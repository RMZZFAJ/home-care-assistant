import { z } from "zod";

export const complementType = z.enum(["REQ", "COM", "ENT", "BAL"]);
const reference = z.object({
  id: z.string().uuid(), type: complementType, code: z.string().nullable(),
  protocol: z.string().nullable(), version: z.number().int().positive(),
  issuedAt: z.string().datetime({ offset: true }).nullable(),
}).strict();
const role = z.enum(["source", "supplement"]);
export const documentComplementSchema = z.discriminatedUnion("accessible", [
  z.object({ id: z.string().uuid(), role, accessible: z.literal(false) }).strict(),
  z.object({
    id: z.string().uuid(), role, accessible: z.literal(true), document: reference,
    reason: z.string(), actorName: z.string(), recordedAt: z.string().datetime({ offset: true }),
    sourceVersion: z.number().int().positive(), childVersion: z.number().int().positive(),
  }).strict(),
]);
export type DocumentComplement = z.infer<typeof documentComplementSchema>;
export const documentComplementsSchema = z.object({
  document: reference, careRecipientId: z.string().uuid(),
  page: z.number().int().positive(), size: z.number().int().positive().max(50),
  total: z.number().int().nonnegative(), links: z.array(documentComplementSchema),
  creatableTypes: z.array(complementType),
}).strict().refine(v => v.links.length === Math.min(v.size, Math.max(0, v.total - (v.page - 1) * v.size))
  && new Set(v.links.map(link => link.id)).size === v.links.length, "Lista de vínculos incompleta.");
export type DocumentComplements = z.infer<typeof documentComplementsSchema>;
export const complementCandidatesSchema = z.object({
  sourceId: z.string().uuid(), sourceVersion: z.number().int().positive(), type: complementType,
  search: z.string(), page: z.number().int().positive(), size: z.number().int().positive().max(50),
  total: z.number().int().nonnegative(), documents: z.array(reference),
}).strict().refine(v => v.documents.length === Math.min(v.size, Math.max(0, v.total - (v.page - 1) * v.size))
  && new Set(v.documents.map(document => document.id)).size === v.documents.length
  && v.documents.every(d => d.id !== v.sourceId && d.type === v.type && d.protocol && d.issuedAt), "Consulta de fichas incompatível.");
export type ComplementCandidates = z.infer<typeof complementCandidatesSchema>;
export const linkComplementInput = z.object({
  childId: z.string().uuid(), sourceVersion: z.number().int().positive(),
  childVersion: z.number().int().positive(), reason: z.string().trim().min(3).max(1000),
  idempotencyKey: z.string().uuid(),
}).strict();
export type LinkComplementInput = z.infer<typeof linkComplementInput>;
export const linkComplementResult = z.object({
  link: documentComplementSchema, key: z.string().uuid(), recovered: z.boolean(),
}).strict();
export const complementsQuery = z.object({
  mode: z.enum(["links", "candidates", "attempt"]).default("links"),
  type: complementType.optional(), key: z.string().uuid().optional(), search: z.string().max(100).default(""),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
}).strict();
export function parseDocumentComplements(value: unknown, id: string, page: number) {
  const parsed = documentComplementsSchema.safeParse(value);
  if (!parsed.success) throw new Error("Não foi possível confirmar a consulta de vínculos. Consulte novamente.");
  const result = parsed.data;
  if (result.document.id !== id || result.page !== page || result.size !== 20)
    throw new Error("A consulta de vínculos não corresponde a esta ficha. Consulte novamente.");
  return result;
}
export function parseComplementCandidates(value: unknown, id: string, type: z.infer<typeof complementType>, search: string, page: number) {
  const parsed = complementCandidatesSchema.safeParse(value);
  if (!parsed.success) throw new Error("Não foi possível confirmar as fichas disponíveis. Consulte novamente.");
  const result = parsed.data;
  if (result.sourceId !== id || result.type !== type || result.search !== search || result.page !== page || result.size !== 20)
    throw new Error("A consulta de fichas não corresponde à seleção. Consulte novamente.");
  return result;
}

export const complementAttemptSchema = z.discriminatedUnion("state", [
  z.object({ sourceId: z.string().uuid(), key: z.string().uuid(), state: z.literal("not_found"), result: z.null() }).strict(),
  z.object({ sourceId: z.string().uuid(), key: z.string().uuid(), state: z.literal("confirmed"), result: linkComplementResult }).strict(),
]);
export function parseComplementAttempt(value: unknown, sourceId: string, input: LinkComplementInput) {
  const parsed = complementAttemptSchema.safeParse(value);
  if (!parsed.success) throw new Error("A consulta não confirmou esta tentativa de vínculo. Consulte novamente.");
  const result = parsed.data;
  if (result.sourceId !== sourceId || result.key !== input.idempotencyKey)
    throw new Error("A consulta não corresponde à sua tentativa de vínculo.");
  if (result.state === "confirmed") requireComplementConfirmation(result.result, input);
  return result;
}
export function requireComplementConfirmation(value: unknown, input: LinkComplementInput) {
  const parsed = linkComplementResult.safeParse(value);
  if (!parsed.success) throw new Error("A resposta não confirmou este vínculo. Consulte a mesma tentativa.");
  const data = parsed.data;
  if (data.key !== input.idempotencyKey || !data.link.accessible || data.link.role !== "supplement"
    || data.link.document.id !== input.childId || data.link.sourceVersion !== input.sourceVersion
    || data.link.childVersion !== input.childVersion || data.link.reason !== input.reason)
    throw new Error("A resposta não confirmou este vínculo. Consulte a mesma tentativa.");
  return data;
}

import { z } from "zod";
import { formatBrazilDate } from "@/lib/receipt";

const mode = z.enum(["policy", "early", "other"]);
const previousState = z.enum(["completed", "cancelled"]);
const decision = z.enum(["confirm", "reverse"]);
const base = {
  id: z.uuid(), documentId: z.uuid(), sourceVersion: z.number().int().positive(),
  previousState, mode, reason: z.string(), actorName: z.string(),
};
export const documentArchiveAttempt = z.object({
  ...base, preparedAt: z.iso.datetime({ offset: true }),
  archivedAt: z.iso.datetime({ offset: true }).nullable(), issuanceId: z.uuid().nullable(),
  decision: decision.nullable(),
}).refine(value => Boolean(value.archivedAt) === Boolean(value.issuanceId));
export type DocumentArchiveAttempt = z.infer<typeof documentArchiveAttempt>;
export function activeDocumentArchive(value: unknown) {
  const parsed = documentArchiveAttempt.safeParse(value);
  return parsed.success && parsed.data.archivedAt && parsed.data.decision !== "reverse" ? parsed.data : null;
}

export function documentArchiveLabel(archive: DocumentArchiveAttempt) {
  return archive.decision === "confirm" ? "Arquivada · encerramento confirmado" : "Arquivada · aguardando confirmação";
}

export const documentArchiveReference = z.object({
  documentId: z.uuid(), patientId: z.uuid(), version: z.number().int().positive(),
  condition: z.enum(["open", "reopened", "completed", "cancelled", "archived"]),
  archiveDays: z.number().int().min(1).max(365),
  archive: documentArchiveAttempt.nullable(),
  canArchive: z.boolean(), canDecide: z.boolean(), referenceHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type DocumentArchiveReference = z.infer<typeof documentArchiveReference>;

const review = { key: z.uuid(), version: z.number().int().positive(), referenceHash: z.string().regex(/^[a-f0-9]{64}$/) };
export const documentArchiveCommand = z.discriminatedUnion("action", [
  z.strictObject({ ...review, action: z.literal("archive"), mode, reason: z.string().trim().max(1000).optional() }),
  z.strictObject({ ...review, action: z.literal("confirm") }),
  z.strictObject({ ...review, action: z.literal("reverse"), reason: z.string().trim().min(3).max(1000) }),
]).refine(value => value.action !== "archive" || (value.mode === "other" ? (value.reason?.length ?? 0) >= 3 : !value.reason),
  "Informe o motivo do arquivamento.");
export type DocumentArchiveCommand = z.infer<typeof documentArchiveCommand>;

export const frozenDocumentArchive = z.object({ ...base, reviewedAt: z.iso.datetime({ offset: true }) });
export function frozenArchiveFacts(value: unknown) {
  if (value === undefined) return [];
  const fact = frozenDocumentArchive.parse(value);
  return [
    { key: "archive/state", text: "Ficha arquivada · PDF consolidado" },
    { key: "archive/previous", text: "Condição anterior · " + (fact.previousState === "cancelled" ? "Cancelada" : "Concluída") },
    { key: "archive/reason", text: fact.reason },
    { key: "archive/review", text: fact.actorName + " · Referência revisada em " + formatBrazilDate(fact.reviewedAt) },
  ];
}

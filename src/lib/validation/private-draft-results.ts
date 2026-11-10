import {
  scheduleCreationContent,
  schedulePurpose,
} from "@/lib/schedules/creation";
import { parseSchedulePreparationReceipt } from "./schedule-preparations";
import {
  progressPreparationContentSchema,
  parseProgressPreparationReceipt,
} from "./progress-preparations";
import {
  flowPreparationContentSchema,
  parseFlowPreparationReceipt,
} from "./flow-preparations";
import {
  consumptionPreparationContentSchema,
  parseConsumptionPreparationReceipt,
} from "./consumption-preparations";
import {
  stockPreparationContentSchema,
  parseStockPreparationReceipt,
} from "./stock-preparations";
import {
  isBalanceDocumentPurpose,
  balanceDocumentDraftContent,
} from "./supply-drafts";
import { z } from "zod";
import {
  balanceDraftContent,
  requisitionDraftContent,
} from "./creation-drafts";
import {
  isRequisitionOperationPurpose,
  requisitionOperationDraftContent,
  draftPurpose,
  transferDeclarationDraftContent,
  declarationSourceForPurpose,
  receiptDraftContent,
  supplyDraftContent,
  type DraftPurpose,
} from "./supply-drafts";
import type { CreationDraft, DraftKind } from "@/types/creation-drafts";
import { draftNavigationSchema } from "./draft-navigation";
import { navigationAllowed } from "../forms/draft-navigation";
import { isBalancePreparationPurpose } from "../forms/balance-preparation-purposes";
import {
  balancePreparationContentSchema,
  parseBalancePreparationReceipt,
} from "./balance-preparations";
type Scope = {
  userId: string;
  patientId: string;
  kind: DraftKind | null;
  targetDocumentId: string | null;
  targetResourceId?: string | null;
  purpose: DraftPurpose;
};
const resultSchema = z.object({
  id: z.uuid(),
  revision: z.number().int().positive(),
  savedAt: z.iso.datetime({ offset: true }),
  state: z.enum(["active", "discarded", "consumed", "completed"]),
  consumedDocumentId: z.uuid().nullable(),
  replayed: z.boolean(),
  targetResourceId: z.uuid().nullable().optional(),
  consumedResourceId: z.uuid().nullable().optional(),
  consumedResult: z.unknown().optional(),
  patientId: z.uuid().optional(),
  ownerId: z.uuid().optional(),
  purpose: draftPurpose.optional(),
});
const readSchema = resultSchema.omit({ replayed: true }).extend({
  ownerId: z.uuid(),
  patientId: z.uuid(),
  kind: z.enum([
    "REQ",
    "BAL",
    "COM",
    "ENT",
    "STOCK",
    "CONSUMPTION",
    "FLOW",
    "PROGRESS",
    "SCHEDULE",
  ]),
  purpose: draftPurpose.default("create"),
  targetDocumentId: z.uuid().nullable(),
  schemaVersion: z.literal(1),
  createdAt: z.iso.datetime({ offset: true }),
  contentHash: z.string(),
  content: z.unknown(),
});
export function parsePrivateDraft(
  value: unknown,
  scope: Scope,
): CreationDraft | null {
  if (value === null) return null;
  const parsed = readSchema
    .extend({
      navigation: draftNavigationSchema.nullable().optional().default(null),
    })
    .safeParse(value);
  if (!parsed.success)
    throw new Error(
      "Não foi possível ler o rascunho privado. Consulte novamente.",
    );
  const row = parsed.data;
  if (
    row.ownerId !== scope.userId ||
    row.patientId !== scope.patientId ||
    row.kind !== scope.kind ||
    row.purpose !== scope.purpose ||
    row.targetDocumentId !== scope.targetDocumentId
  )
    throw new Error(
      "A resposta do rascunho não corresponde ao contexto consultado.",
    );
  const resource =
    (row.kind === "BAL" && isBalancePreparationPurpose(row.purpose)) ||
    (row.kind === "STOCK" && row.purpose === "family_movement") ||
    row.kind === "CONSUMPTION" ||
    row.kind === "FLOW" ||
    row.kind === "PROGRESS" ||
    row.kind === "SCHEDULE";
  if (
    resource
      ? row.targetResourceId !== scope.targetResourceId ||
        row.targetDocumentId !== null
      : row.targetResourceId != null ||
        row.consumedResourceId != null ||
        row.consumedResult != null
  )
    throw new Error(
      "O alvo do preenchimento não corresponde ao contexto consultado.",
    );
  const schema =
    row.kind === "SCHEDULE"
      ? scheduleCreationContent
      : row.kind === "PROGRESS"
        ? progressPreparationContentSchema
        : row.kind === "FLOW"
          ? flowPreparationContentSchema
          : row.kind === "CONSUMPTION"
            ? consumptionPreparationContentSchema
            : row.kind === "STOCK"
              ? stockPreparationContentSchema
              : resource
                ? balancePreparationContentSchema
                : row.kind === "REQ" &&
                    isRequisitionOperationPurpose(row.purpose)
                  ? requisitionOperationDraftContent
                  : row.kind === "REQ"
                    ? requisitionDraftContent
                    : row.kind === "BAL" &&
                        isBalanceDocumentPurpose(row.purpose)
                      ? balanceDocumentDraftContent
                      : row.kind === "BAL"
                        ? balanceDraftContent
                        : declarationSourceForPurpose(row.purpose)
                          ? transferDeclarationDraftContent
                          : !["create", "revise"].includes(row.purpose)
                            ? receiptDraftContent
                            : supplyDraftContent;
  const content = row.state === "active" ? schema.safeParse(row.content) : null;
  if (
    row.kind === "SCHEDULE" &&
    content?.success &&
    (!("schedule" in content.data) ||
      schedulePurpose(content.data.schedule) !== row.purpose)
  )
    throw new Error(
      "O preenchimento da escala não corresponde à finalidade consultada.",
    );
  if (
    (row.state === "active" &&
      !navigationAllowed(row.kind, row.purpose, row.navigation, row.content)) ||
    (row.state !== "active" && row.navigation !== null)
  )
    throw new Error(
      "Não foi possível conferir a etapa do rascunho. Consulte novamente.",
    );
  const consumed = ["consumed", "completed"].includes(row.state);
  if (
    (content && !content.success) ||
    (row.state !== "active" && row.content !== null) ||
    consumed !==
      (resource
        ? row.consumedResourceId != null
        : row.consumedDocumentId !== null) ||
    (resource &&
      (row.consumedDocumentId !== null ||
        (!consumed && row.consumedResult != null)))
  )
    throw new Error(
      "O rascunho retornou conteúdo ou estado inválido. Consulte novamente.",
    );
  if (
    content?.success &&
    declarationSourceForPurpose(row.purpose) &&
    (!("fields" in content.data) ||
      content.data.fields.source !== declarationSourceForPurpose(row.purpose) ||
      content.data.divergentIds.length)
  )
    throw new Error(
      "A custódia da declaração não corresponde ao preenchimento consultado.",
    );
  const consumedResult =
    resource && consumed
      ? row.kind === "SCHEDULE"
        ? parseSchedulePreparationReceipt(row.consumedResult, {
            patientId: scope.patientId,
            purpose: scope.purpose,
            userId: scope.userId,
            targetResourceId: null,
          })
        : (row.kind === "PROGRESS"
            ? parseProgressPreparationReceipt
            : row.kind === "FLOW"
              ? parseFlowPreparationReceipt
              : row.kind === "CONSUMPTION"
                ? parseConsumptionPreparationReceipt
                : row.kind === "STOCK"
                  ? parseStockPreparationReceipt
                  : parseBalancePreparationReceipt)(row.consumedResult, {
            ...scope,
            targetResourceId: scope.targetResourceId!,
          })
      : null;
  if (
    resource &&
    consumedResult &&
    consumedResult.resourceId !== row.consumedResourceId
  )
    throw new Error("O resultado não corresponde ao registro preservado.");
  return {
    ...row,
    content: content?.success ? content.data : null,
    ...(resource ? { consumedResult } : { consumedResult: undefined }),
  };
}
export function parsePrivateDraftResult(
  value: unknown,
  intent: Record<string, unknown>,
  userId?: string,
) {
  const parsed = resultSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "A resposta não confirmou o salvamento. Recupere a mesma tentativa.",
    );
  const row = parsed.data,
    expected =
      intent.action === "save"
        ? "active"
        : intent.action === "discard"
          ? "discarded"
          : "completed";
  const resource =
    (intent.kind === "BAL" &&
      typeof intent.purpose === "string" &&
      isBalancePreparationPurpose(intent.purpose)) ||
    (intent.kind === "STOCK" && intent.purpose === "family_movement") ||
    intent.kind === "CONSUMPTION" ||
    intent.kind === "FLOW" ||
    intent.kind === "PROGRESS" ||
    intent.kind === "SCHEDULE";
  if (
    (intent.id !== null && row.id !== intent.id) ||
    row.revision !== Number(intent.expectedRevision ?? 0) + 1 ||
    row.state !== expected ||
    (expected === "completed") !==
      (resource
        ? row.consumedResourceId != null
        : row.consumedDocumentId !== null)
  )
    throw new Error(
      "A resposta não corresponde à revisão e à intenção enviadas. Recupere a mesma tentativa.",
    );
  if (
    resource &&
    (row.targetResourceId !== intent.targetResourceId ||
      row.patientId !== intent.careRecipientId ||
      row.ownerId !== userId ||
      row.purpose !== intent.purpose ||
      row.consumedDocumentId !== null ||
      (expected !== "completed" && row.consumedResult != null))
  )
    throw new Error(
      "A resposta não corresponde ao titular e ao alvo do preenchimento.",
    );
  const consumedResult =
    resource && expected === "completed"
      ? intent.kind === "SCHEDULE"
        ? parseSchedulePreparationReceipt(row.consumedResult, {
            patientId: String(intent.careRecipientId),
            purpose: String(intent.purpose),
            userId: userId!,
            targetResourceId: null,
          })
        : (intent.kind === "PROGRESS"
            ? parseProgressPreparationReceipt
            : intent.kind === "FLOW"
              ? parseFlowPreparationReceipt
              : intent.kind === "CONSUMPTION"
                ? parseConsumptionPreparationReceipt
                : intent.kind === "STOCK"
                  ? parseStockPreparationReceipt
                  : parseBalancePreparationReceipt)(row.consumedResult, {
            patientId: String(intent.careRecipientId),
            purpose: String(intent.purpose),
            targetResourceId: String(intent.targetResourceId),
            userId: userId!,
          })
      : null;
  if (
    resource &&
    consumedResult &&
    row.consumedResourceId !== consumedResult.resourceId
  )
    throw new Error(
      "O reconhecimento não corresponde ao resultado preservado.",
    );
  return {
    ...row,
    ...(resource ? { consumedResult } : { consumedResult: undefined }),
  };
}

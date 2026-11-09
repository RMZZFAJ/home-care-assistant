import { z } from "zod";
import { draftCommitSchema } from "./creation-drafts";
import { requisitionOperationPurpose } from "./supply-drafts";

const version = z.number().int().positive().max(2147483647);
export const requisitionDraftFields = {
  draftCommit: draftCommitSchema.optional(),
  expectedVersion: version.optional(),
  idempotencyKey: z.uuid().optional(),
};
export type RequisitionDraftInput = {
  draftCommit?: { id: string; revision: number };
  expectedVersion?: number;
  idempotencyKey?: string;
};
export function requireRequisitionDraftFields(
  input: RequisitionDraftInput,
  context: z.RefinementCtx,
) {
  if (
    (input.draftCommit && (!input.expectedVersion || !input.idempotencyKey)) ||
    (!input.draftCommit && input.expectedVersion !== undefined)
  )
    context.addIssue({
      code: "custom",
      message:
        "Confira a revisão privada, a versão da requisição e a identidade desta tentativa.",
    });
}
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const requisitionDecisionReferenceSchema = z
  .object({
    id: z.uuid(),
    patientId: z.uuid(),
    code: z.string().min(1),
    documentVersion: version,
    status: z.enum([
      "draft",
      "submitted",
      "under_review",
      "approved",
      "separated",
      "delivered",
      "cancelled",
    ]),
    historical: z.boolean(),
    completedAt: z.iso.datetime({ offset: true }).nullable(),
    archivedAt: z.iso.datetime({ offset: true }).nullable(),
    catalogueHash: digest,
    referenceHash: digest,
    fulfillment: z
      .object({
        total: z.number().int().nonnegative(),
        fulfilled: z.number().int().nonnegative(),
      })
      .passthrough(),
    items: z
      .array(
        z
          .object({
            id: z.uuid(),
            name: z.string().nullable(),
            extra: z.boolean(),
            resolved: z.boolean(),
          })
          .strict(),
      )
      .max(1020),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.items.map((item) => item.id)).size === value.items.length,
    "A referência não pode repetir itens.",
  )
  .refine(
    (value) => value.fulfillment.fulfilled <= value.fulfillment.total,
    "O atendimento não pode exceder o total de itens.",
  );
export type RequisitionDecisionReference = z.infer<
  typeof requisitionDecisionReferenceSchema
>;
export function parseRequisitionDecisionReference(
  value: unknown,
  scope: { id: string; patientId: string; minimumVersion?: number },
) {
  const result = z
    .object({ data: requisitionDecisionReferenceSchema })
    .safeParse(value);
  if (
    !result.success ||
    result.data.data.id !== scope.id ||
    result.data.data.patientId !== scope.patientId ||
    result.data.data.documentVersion < (scope.minimumVersion ?? 1)
  )
    throw new Error(
      "Não foi possível conferir a referência atual da requisição. Consulte novamente; seus campos foram preservados.",
    );
  return result.data.data;
}
export const requisitionDecisionPacketSchema = z
  .object({
    action: requisitionOperationPurpose,
    body: z
      .object({
        reason: z
          .string()
          .trim()
          .min(3, "Escreva uma justificativa com pelo menos 3 caracteres.")
          .max(1000, "A justificativa permite até 1000 caracteres."),
        itemId: z.uuid().optional(),
        productId: z.string().min(1).max(120).optional(),
      })
      .strict(),
    expectedVersion: version,
    idempotencyKey: z.uuid(),
    draftCommit: draftCommitSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.action === "resolve_extra"
        ? !value.body.itemId || !value.body.productId
        : value.body.itemId !== undefined || value.body.productId !== undefined
    )
      context.addIssue({
        code: "custom",
        message:
          "Confira o item extra e o produto escolhido para esta decisão.",
      });
  });
export type RequisitionDecisionPacket = z.infer<
  typeof requisitionDecisionPacketSchema
>;
export function requireRequisitionDecisionConfirmation(
  value: unknown,
  packet: RequisitionDecisionPacket,
  scope: { id: string; patientId: string },
) {
  const result = z
    .object({
      data: z.object({
        id: z.uuid(),
        revision: version,
        state: z.literal("consumed"),
        consumedDocumentId: z.uuid(),
        replayed: z.boolean(),
        savedAt: z.iso.datetime({ offset: true }),
        result: z.record(z.string(), z.unknown()),
      }),
    })
    .safeParse(value);
  if (
    !result.success ||
    !packet.draftCommit ||
    result.data.data.id !== packet.draftCommit.id ||
    result.data.data.revision !== packet.draftCommit.revision + 1 ||
    result.data.data.consumedDocumentId !== scope.id
  )
    throw new Error(
      "A resposta não confirmou esta decisão. Recupere a mesma tentativa antes de preparar outra.",
    );
  const row = result.data.data.result;
  const matches =
    packet.action === "cancel"
      ? row.id === scope.id &&
        row.care_recipient_id === scope.patientId &&
        row.status === "cancelled"
      : packet.action === "archive"
        ? z.iso.datetime({ offset: true }).safeParse(row.archivedAt).success &&
          row.archiveReason === packet.body.reason
        : row.care_recipient_id === scope.patientId &&
          row.requisition_item_id === packet.body.itemId &&
          row.product_id === packet.body.productId &&
          row.reason === packet.body.reason;
  if (!matches)
    throw new Error(
      "O resultado não corresponde à decisão enviada. Recupere a mesma tentativa.",
    );
  return result.data.data;
}

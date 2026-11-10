import { z } from "zod";
import {
  balanceDocumentDecisionSchema,
  balancePreparationSchema,
  type BalanceDocumentDecision,
  type BalancePreparation,
  type BalancePreparationTarget,
} from "@/lib/validation/balance-document-decisions";
import type {
  BalanceDocumentPurpose,
  ReceiptDraftContent,
} from "@/lib/validation/supply-drafts";
import { formatZonedDate } from "@/lib/schedules/time";

export const balanceDocumentLabels: Record<BalanceDocumentPurpose, string> = {
  review_family: "Revisão da família",
  review_supervisor: "Revisão da supervisão",
  assign_recount: "Designar reconto",
};
export function balanceTargetLabel(row: BalancePreparationTarget) {
  return `${row.professional_name} · ${row.type_name} · ${formatZonedDate(row.starts_at, row.timezone)} → ${formatZonedDate(row.ends_at, row.timezone)}`;
}
export function parseBalancePreparation(
  value: unknown,
  scope: {
    patientId: string;
    documentId: string;
    purpose: BalanceDocumentPurpose;
    minimumVersion?: number;
  },
): BalancePreparation {
  const response = z
    .object({ data: balancePreparationSchema })
    .safeParse(value);
  if (!response.success)
    throw new Error(
      "Não foi possível conferir a referência do balanço. Seu preenchimento foi preservado.",
    );
  const data = response.data.data;
  if (
    data.patientId !== scope.patientId ||
    data.documentId !== scope.documentId ||
    data.documentVersion < (scope.minimumVersion ?? 1) ||
    new Set(data.lines.map((row) => row.id)).size !== data.lines.length ||
    (scope.purpose === "assign_recount"
      ? !data.recount ||
        data.review !== null ||
        new Set(data.recount.targets.map((row) => row.id)).size !==
          data.recount.targets.length
      : !data.review || data.recount !== null)
  )
    throw new Error(
      "A referência consultada não corresponde à ficha, à versão ou à decisão selecionadas.",
    );
  return data;
}
export function balanceDocumentAvailable(
  reference: BalancePreparation,
  purpose: BalanceDocumentPurpose,
) {
  return purpose === "assign_recount"
    ? reference.recount?.canAssign === true
    : ["submitted", "approved"].includes(reference.status) &&
        reference.review?.eligibleGroups.includes(
          purpose === "review_family" ? "family" : "supervisor",
        ) === true &&
        (reference.status !== "submitted" ||
          reference.review.referenceState === "current");
}
export function emptyBalanceDocumentDraft(
  reference: BalancePreparation,
  purpose: BalanceDocumentPurpose,
): ReceiptDraftContent {
  return {
    documentVersion: reference.documentVersion,
    materials: [],
    divergentIds: [],
    fields: {
      referenceHash: (purpose === "assign_recount"
        ? reference.recount
        : reference.review)!.referenceHash,
      ...(purpose === "assign_recount"
        ? {
            reason: "",
            targetShiftId: "",
            targetShiftVersion: "",
            targetLabel: "",
            query: "",
          }
        : { comment: "" }),
    },
  };
}
export function adoptBalanceDocumentDraft(
  content: ReceiptDraftContent,
  reference: BalancePreparation,
  purpose: BalanceDocumentPurpose,
): ReceiptDraftContent {
  const fresh = emptyBalanceDocumentDraft(reference, purpose),
    target = reference.recount?.targets.find(
      (row) => row.id === content.fields.targetShiftId,
    );
  return {
    ...content,
    documentVersion: fresh.documentVersion,
    fields: {
      ...content.fields,
      referenceHash: fresh.fields.referenceHash,
      ...(target
        ? {
            targetShiftVersion: String(target.version),
            targetLabel: balanceTargetLabel(target),
            ...(content.fields.query === content.fields.targetLabel
              ? { query: balanceTargetLabel(target) }
              : {}),
          }
        : {}),
    },
  };
}
export function balanceDocumentPacket(
  scope: {
    patientId: string;
    documentId: string;
    purpose: BalanceDocumentPurpose;
    draftCommit: { id: string; revision: number };
    key: string;
  },
  content: ReceiptDraftContent,
): BalanceDocumentDecision {
  const body =
    scope.purpose === "assign_recount"
      ? {
          documentId: scope.documentId,
          targetShiftId: content.fields.targetShiftId,
          targetShiftVersion: Number(content.fields.targetShiftVersion),
          referenceHash: content.fields.referenceHash,
          reason: content.fields.reason,
        }
      : {
          group: scope.purpose === "review_family" ? "family" : "supervisor",
          comment: content.fields.comment ?? "",
          reviewReference: content.fields.referenceHash,
        };
  return balanceDocumentDecisionSchema.parse({
    careRecipientId: scope.patientId,
    documentId: scope.documentId,
    purpose: scope.purpose,
    expectedVersion: content.documentVersion,
    idempotencyKey: scope.key,
    draftCommit: scope.draftCommit,
    body,
  });
}
const consumed = z.object({
  id: z.uuid(),
  revision: z.number().int().positive(),
  state: z.literal("consumed"),
  savedAt: z.iso.datetime({ offset: true }),
  consumedDocumentId: z.uuid(),
  replayed: z.boolean(),
  result: z.unknown(),
});
const reviewResult = z.object({
  id: z.uuid(),
  care_recipient_id: z.uuid(),
  type: z.literal("BAL"),
  version: z.number().int().positive(),
  balanceReview: z.object({
    reviews: z.array(
      z.object({
        id: z.uuid(),
        reviewer_id: z.uuid(),
        review_group: z.enum(["family", "supervisor"]),
        comment: z.string(),
        reviewed_document_version: z.number().int().positive(),
      }),
    ),
  }),
});
const recountResult = z.object({
  code: z.string().nullable(),
  countVersion: z.number().int().positive().nullable(),
  counter: z.object({ id: z.uuid().nullable(), name: z.string().nullable() }),
  assignmentId: z.uuid(),
  documentId: z.uuid(),
  documentVersion: z.number().int().positive(),
  professionalId: z.uuid(),
  professionalName: z.string(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  timezone: z.string(),
  shiftId: z.uuid(),
  shiftVersion: z.number().int().positive(),
  designerId: z.uuid(),
  designerName: z.string(),
  recordedAt: z.iso.datetime({ offset: true }),
  reason: z.string(),
});
export function parseBalanceDocumentConfirmation(
  value: unknown,
  packet: BalanceDocumentDecision,
  userId: string,
) {
  const parsed = z.object({ data: consumed }).safeParse(value);
  const fail = () => {
    throw new Error(
      "A resposta não confirmou esta decisão. Preserve e recupere a mesma tentativa.",
    );
  };
  if (!parsed.success) return fail();
  const row = parsed.data.data;
  if (
    row.id !== packet.draftCommit.id ||
    row.revision !== packet.draftCommit.revision + 1 ||
    row.consumedDocumentId !== packet.documentId
  )
    return fail();
  if (packet.purpose === "assign_recount") {
    const result = recountResult.safeParse(row.result);
    if (
      !result.success ||
      result.data.documentId !== packet.documentId ||
      result.data.documentVersion !== packet.expectedVersion ||
      result.data.shiftId !== packet.body.targetShiftId ||
      result.data.shiftVersion !== packet.body.targetShiftVersion ||
      result.data.reason !== packet.body.reason ||
      result.data.designerId !== userId
    )
      return fail();
    return { ...row, recount: result.data };
  }
  const result = reviewResult.safeParse(row.result);
  if (
    !result.success ||
    result.data.id !== packet.documentId ||
    result.data.care_recipient_id !== packet.careRecipientId ||
    result.data.version !== packet.expectedVersion + 1 ||
    !result.data.balanceReview.reviews.some(
      (review) =>
        review.reviewer_id === userId &&
        review.review_group === packet.body.group &&
        review.comment === packet.body.comment &&
        review.reviewed_document_version === packet.expectedVersion,
    )
  )
    return fail();
  return { ...row, recount: null };
}

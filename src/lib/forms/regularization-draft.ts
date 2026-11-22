import { quantity } from "@/lib/quantity";
import type { SupplyDocument } from "@/types/documents";
import type { ReceiptDraftContent } from "@/lib/validation/supply-drafts";

export const regularizationPurposes = {
  propose: "propose_regularization",
  approve: "approve_regularization",
  reject: "reject_regularization",
  withdraw: "withdraw_regularization",
  finding: "record_regularization_finding",
} as const;
export type RegularizationMode = keyof typeof regularizationPurposes;
export type RegularizationAmounts = {
  receivedQuantity: string;
  returnedQuantity: string;
  missingQuantity: string;
};
export const regularizationAmountKeys = [
  "receivedQuantity",
  "returnedQuantity",
  "missingQuantity",
] as const;
export function regularizationAvailable(
  document: SupplyDocument,
  mode: RegularizationMode,
) {
  const details = document.deliveryRegularization;
  if (!details) return false;
  return mode === "propose"
    ? details.canPropose
    : mode === "approve"
      ? details.canApprove
      : mode === "reject"
        ? details.canReview
        : mode === "withdraw"
          ? details.canClose
          : details.canRecordFinding;
}
export function regularizationDraftReference(
  document: SupplyDocument,
): ReceiptDraftContent {
  const details = document.deliveryRegularization;
  const current = details?.cases.find((item) => item.id === details.currentId);
  const emptyAmounts = Object.fromEntries(
    document.lines.flatMap((line) =>
      regularizationAmountKeys.map((key) => [
        line.id + ":" + key,
        quantity(line.quantity)
          .minus(line.accepted_quantity)
          .minus(line.reconciled_quantity)
          .lte(0)
          ? "0"
          : "",
      ]),
    ),
  );
  return {
    documentVersion: document.version,
    fields: {
      ...emptyAmounts,
      caseId: current?.id ?? "",
      caseLabel: current
        ? `${current.proposal.proposedName} · ${current.proposed_at} · ${current.proposal.reason}`
        : "Sem proposta anterior",
    },
    divergentIds: [],
    materials: document.lines.map((line) => ({
      id: line.id,
      name: line.name_snapshot,
      unit: line.unit_snapshot,
      quantityDecimals:
        details?.sourceLines.find((item) => item.lineId === line.id)
          ?.quantityDecimals ?? 0,
    })),
  };
}
/** Keep raw declarations only; the official physical facts are read with current Auth. */
export function regularizationDraftContent(
  baseline: ReceiptDraftContent,
  document: SupplyDocument,
  values: {
    reason: string;
    basis: string;
    reviewer: string;
    owner: string;
    entries: Record<string, RegularizationAmounts>;
  },
): ReceiptDraftContent {
  const details = document.deliveryRegularization;
  const fields = {
    ...baseline.fields,
    reason: values.reason,
    basis: values.basis,
    reviewerId: values.reviewer,
    reviewerLabel:
      details?.reviewers.find((p) => p.id === values.reviewer)?.name ??
      baseline.fields.reviewerLabel ??
      "",
    followUpOwnerId: values.owner,
    followUpOwnerLabel:
      details?.followUpPeople.find((p) => p.id === values.owner)?.name ??
      baseline.fields.followUpOwnerLabel ??
      "",
  };
  for (const [id, amounts] of Object.entries(values.entries))
    for (const key of regularizationAmountKeys)
      (fields as Record<string, string>)[id + ":" + key] = amounts[key];
  return { ...baseline, fields };
}
export function regularizationDraftValues(content: ReceiptDraftContent) {
  return {
    reason: content.fields.reason ?? "",
    basis: content.fields.basis ?? "",
    reviewer: content.fields.reviewerId ?? "",
    owner: content.fields.followUpOwnerId ?? "",
    entries: Object.fromEntries(
      content.materials.map((line) => [
        line.id,
        Object.fromEntries(
          regularizationAmountKeys.map((key) => [
            key,
            content.fields[line.id + ":" + key] ?? "",
          ]),
        ) as RegularizationAmounts,
      ]),
    ),
  };
}
export function regularizationDraftStale(
  content: ReceiptDraftContent,
  document: SupplyDocument,
) {
  return (
    content.documentVersion !== document.version ||
    (content.fields.caseId ?? "") !==
      (document.deliveryRegularization?.currentId ?? "")
  );
}

export function adoptRegularizationDraftReference(
  content: ReceiptDraftContent,
  document: SupplyDocument,
): ReceiptDraftContent {
  const next = regularizationDraftReference(document);
  return {
    ...next,
    fields: {
      ...next.fields,
      ...content.fields,
      caseId: next.fields.caseId,
      caseLabel: next.fields.caseLabel,
    },
  };
}

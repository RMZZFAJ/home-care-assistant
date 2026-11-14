import type { RequisitionDecisionReference } from "@/lib/validation/requisition-decisions";
import type {
  ReceiptDraftContent,
  RequisitionOperationPurpose,
} from "@/lib/validation/supply-drafts";

export const requisitionDecisionLabels = {
  archive: "Arquivar requisição",
  cancel: "Cancelar requisição",
  resolve_extra: "Identificar item extra no catálogo",
} as const;
export type RequisitionDecisionProduct = {
  id: string;
  name: string;
  unit: string;
};
export function requisitionDecisionAvailable(
  reference: RequisitionDecisionReference,
  purpose: RequisitionOperationPurpose,
) {
  if (purpose === "archive")
    return reference.completedAt !== null && reference.archivedAt === null;
  if (purpose === "cancel")
    return (
      !reference.historical &&
      reference.status !== "cancelled" &&
      reference.archivedAt === null &&
      reference.completedAt === null
    );
  return (
    reference.status !== "cancelled" &&
    reference.items.some((item) => item.extra && !item.resolved)
  );
}
export function emptyRequisitionDecisionDraft(
  reference: RequisitionDecisionReference,
  purpose: RequisitionOperationPurpose,
): ReceiptDraftContent {
  const item =
    purpose === "resolve_extra"
      ? reference.items.find((item) => item.extra && !item.resolved)
      : undefined;
  return {
    documentVersion: reference.documentVersion,
    fields: {
      referenceHash: reference.referenceHash,
      reason: "",
      itemId: item?.id ?? "",
      itemLabel: item?.name ?? "",
      productId: "",
      productLabel: "",
      productUnit: "",
    },
    materials: [],
    divergentIds: [],
  };
}
export function adoptRequisitionDecisionReference(
  content: ReceiptDraftContent,
  reference: RequisitionDecisionReference,
  products: RequisitionDecisionProduct[],
): ReceiptDraftContent {
  const item = reference.items.find(
      (item) => item.id === content.fields.itemId,
    ),
    product = products.find(
      (product) => product.id === content.fields.productId,
    );
  return {
    ...content,
    documentVersion: reference.documentVersion,
    fields: {
      ...content.fields,
      referenceHash: reference.referenceHash,
      itemLabel: item?.name ?? content.fields.itemLabel ?? "",
      productLabel: product?.name ?? content.fields.productLabel ?? "",
      productUnit: product?.unit ?? content.fields.productUnit ?? "",
    },
  };
}

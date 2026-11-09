import type { Custody } from "@/types/documents";
import type { TransferPreparation } from "@/types/transfers";
import type { TransferDeclarationDraftContent } from "@/lib/validation/supply-drafts";
export const transferDeclarationPurpose = (
  source: Custody,
): "transfer_declare_family" | "transfer_declare_team" =>
  source === "FAMILY" ? "transfer_declare_family" : "transfer_declare_team";
export type TransferDeclarationValues = {
  counterpartyId: string;
  recipientId: string;
  originId: string;
  reason: string;
  query: string;
  lines: { productId: string; quantity: string }[];
};
export function emptyTransferDeclarationDraft(
  source: Custody,
): TransferDeclarationDraftContent {
  return {
    documentVersion: null,
    fields: {
      source,
      referenceHash: "",
      counterpartyId: "",
      counterpartyLabel: "",
      recipientId: "",
      recipientLabel: "",
      originId: "",
      originLabel: "",
      reason: "",
      query: "",
    },
    divergentIds: [],
    materials: [],
  };
}
export function transferDeclarationValues(
  content: TransferDeclarationDraftContent,
): TransferDeclarationValues {
  return {
    counterpartyId: content.fields.counterpartyId ?? "",
    recipientId: content.fields.recipientId ?? "",
    originId: content.fields.originId ?? "",
    reason: content.fields.reason ?? "",
    query: content.fields.query ?? "",
    lines: content.materials.map((material) => ({
      productId: material.id,
      quantity: content.fields[material.id + ":transferQuantity"] ?? "",
    })),
  };
}
export function transferDeclarationDraftContent(
  baseline: TransferDeclarationDraftContent,
  reference: TransferPreparation | null,
  values: TransferDeclarationValues,
): TransferDeclarationDraftContent {
  const personLabel = (key: "counterpartyId" | "recipientId", label: string) =>
    !values[key]
      ? ""
      : baseline.fields[key] === values[key] && baseline.fields[label]
        ? baseline.fields[label]
        : (reference?.people.find((p) => p.id === values[key])?.name ??
          "Escolha anterior indisponível");
  const materials = values.lines.map((line) => {
    const old = baseline.materials.find((m) => m.id === line.productId);
    const current = reference?.products.find((p) => p.id === line.productId);
    if (old) return old;
    if (!current)
      throw new Error(
        "A identidade do material não está disponível para preservar. Consulte o preenchimento.",
      );
    return {
      id: current.id,
      name: current.name,
      unit: current.unit,
      quantityDecimals: current.quantityDecimals,
    };
  });
  return {
    documentVersion: null,
    divergentIds: [],
    materials,
    fields: {
      source: baseline.fields.source,
      referenceHash: baseline.fields.referenceHash ?? "",
      counterpartyId: values.counterpartyId,
      counterpartyLabel: personLabel("counterpartyId", "counterpartyLabel"),
      recipientId: values.recipientId,
      recipientLabel: personLabel("recipientId", "recipientLabel"),
      originId: values.originId,
      originLabel: !values.originId
        ? ""
        : baseline.fields.originId === values.originId &&
            baseline.fields.originLabel
          ? baseline.fields.originLabel
          : (reference?.origins.find((o) => o.id === values.originId)?.code ??
            "Vínculo anterior indisponível"),
      reason: values.reason,
      query: values.query,
      ...Object.fromEntries(
        values.lines.map((line) => [
          line.productId + ":transferQuantity",
          line.quantity,
        ]),
      ),
    },
  };
}
/** Explicit adoption replaces references and labels,never raw declarations or quantities. */
export function adoptTransferDeclarationReference(
  content: TransferDeclarationDraftContent,
  current: TransferPreparation,
): TransferDeclarationDraftContent {
  return {
    ...content,
    fields: {
      ...content.fields,
      source: current.source,
      referenceHash: current.referenceHash,
      counterpartyLabel:
        current.people.find((p) => p.id === content.fields.counterpartyId)
          ?.name ??
        content.fields.counterpartyLabel ??
        "",
      recipientLabel:
        current.people.find((p) => p.id === content.fields.recipientId)?.name ??
        content.fields.recipientLabel ??
        "",
      originLabel:
        current.origins.find((o) => o.id === content.fields.originId)?.code ??
        content.fields.originLabel ??
        "",
    },
    materials: content.materials.map((old) => {
      const found = current.products.find((p) => p.id === old.id);
      return found
        ? {
            id: found.id,
            name: found.name,
            unit: found.unit,
            quantityDecimals: found.quantityDecimals,
          }
        : old;
    }),
  };
}

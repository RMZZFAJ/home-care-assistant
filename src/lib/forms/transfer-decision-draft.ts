import type { SupplyDocument } from "@/types/documents";
import type { ReceiptDraftContent } from "@/lib/validation/supply-drafts";
import type { TransferCommand } from "@/lib/validation/transfers";

export const transferActionLabels = {
  agree: "Concordar com a transferência",
  decline: "Recusar transferência",
  withdraw: "Encerrar declaração sem expedir",
  dispatch: "Expedir transferência",
} as const;
export type TransferAction = TransferCommand["action"];
export const transferPurpose = (action: TransferAction) =>
  ("transfer_" + action) as
    | "transfer_agree"
    | "transfer_decline"
    | "transfer_withdraw"
    | "transfer_dispatch";

export function transferActAvailable(
  document: SupplyDocument,
  action: TransferAction,
) {
  const facts = document.transfer;
  return (
    !!facts &&
    (action === "dispatch"
      ? facts.canDispatch
      : action === "withdraw"
        ? facts.canWithdraw
        : facts.canAgree)
  );
}
export function transferDecisionReference(
  document: SupplyDocument,
): ReceiptDraftContent {
  const facts = document.transfer!;
  return {
    documentVersion: document.version,
    fields: {
      reason: "",
      transferState: facts.state,
      transferSource: facts.declaration.source,
      transferDestination: facts.declaration.destination,
      transferInitiator: facts.declaration.actor.name,
      transferCounterparty: facts.declaration.counterparty.name,
      transferRecipient: facts.declaration.recipient.name,
    },
    divergentIds: [],
    materials: document.lines.map((line) => ({
      id: line.id,
      name: line.name_snapshot,
      unit: line.unit_snapshot,
      quantityDecimals: 0,
    })),
  };
}
export function adoptTransferDecisionReference(
  content: ReceiptDraftContent,
  document: SupplyDocument,
): ReceiptDraftContent {
  const next = transferDecisionReference(document);
  return {
    ...next,
    fields: { ...next.fields, reason: content.fields.reason ?? "" },
  };
}

import type { DocumentSnapshot } from "@/lib/server/operational-pdf";
import type { PurchaseEntryBalances } from "@/lib/validation/purchase-entry-balances";
import { fidelitySourceFacts } from "./pdf-fidelity-fixtures";
export const purchaseId = (n: number) => "80000000-0000-4000-8000-" + String(n).padStart(12, "0");
export function purchaseEntrySource() {
  const receipts = [1, 2].map(n => ({
    id: purchaseId(n + 10), state: "approved" as const, submitted_by: purchaseId(20),
    submitted_name: "Pessoa que informou " + n, created_at: `2026-11-11T1${n}:00:00Z`,
    validated_by: purchaseId(21), validated_name: "Responsável pela validação " + n,
    validated_at: `2026-11-11T1${n}:30:00Z`,
    lines: [{ lineId: purchaseId(n), quantity: n === 1 ? "2.125" : "1" }],
  }));
  const facts: PurchaseEntryBalances = receipts.map((receipt, i) => ({
    lineId: receipt.lines[0].lineId, state: "known", quantity: i === 0 ? "38.125" : "34",
    entry: { receiptId: receipt.id, eventId: purchaseId(30 + i), eventVersion: i + 4,
      enteredQuantity: receipt.lines[0].quantity, submittedAt: receipt.created_at, submittedName: receipt.submitted_name,
      validatedAt: receipt.validated_at, validatorId: receipt.validated_by, validatorName: receipt.validated_name },
  }));
  const prior = { ...receipts[0], id: purchaseId(9), created_at: "2026-11-11T10:00:00Z",
    validated_at: "2026-11-11T10:30:00Z", submitted_name: "Pessoa da primeira parcela",
    validated_name: "Responsável pela primeira parcela",
    lines: [{ lineId: purchaseId(1), quantity: "1" }, { lineId: purchaseId(2), quantity: "3" }] };
  const allReceipts = [prior, ...receipts];
  const priorEvent = { eventId: purchaseId(29), version: 3, actorId: purchaseId(21), actorName: prior.validated_name,
    recordedAt: prior.validated_at, action: "com.validate_receipt", receiptId: prior.id };
  const source: DocumentSnapshot = {
    id: purchaseId(40), type: "COM", code: "COM-2026-040", protocol: "COM-2026-040", version: 6,
    status: "purchasing", createdAt: "2026-11-11T10:00:00Z", sourceFacts: fidelitySourceFacts,
    payload: { origin: "purchase", notes: "Registro documental preservado." }, purchaseReceipts: allReceipts,
    lines: receipts.map((receipt, i) => ({ id: receipt.lines[0].lineId, product_id: purchaseId(50 + i),
      name_snapshot: "Material preservado " + (i + 1), unit_snapshot: "un", quantity: "10",
      approved_quantity: "10", purchased_quantity: "6", accepted_quantity: i === 0 ? "3.125" : "4", waived_quantity: "0" })),
    purchaseEntryBalances: facts,
    documentFacts: { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [priorEvent, ...facts.map(fact => ({
      eventId: fact.entry!.eventId, version: fact.entry!.eventVersion, actorId: purchaseId(21),
      actorName: fact.entry!.validatorName, recordedAt: fact.entry!.validatedAt,
      action: "com.validate_receipt", receiptId: fact.entry!.receiptId,
    }))] },
  };
  return { source, facts, scope: { version: source.version, lines: source.lines, receipts: allReceipts,
    events: facts.map(fact => ({ id: fact.entry!.eventId, version: fact.entry!.eventVersion, action: "com.validate_receipt", actorId: purchaseId(21) })) } };
}

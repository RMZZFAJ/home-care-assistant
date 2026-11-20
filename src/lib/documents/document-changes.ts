import type { SupplyDocument } from "@/types/documents";
import { formatQuantity } from "@/lib/quantity";
import { awaitsDeliveryNeed, currentDeliveryNeed } from "./family-fulfillment";
import { documentStatusLabel } from "./presentation";
import { activeDocumentArchive, documentArchiveLabel } from "./document-archive";
import { supplyFollowUpState } from "./follow-up-lifecycle";

export type DocumentChange = { id: string; label: string; before: string; after: string; arrivalId?: string };

export function changedFact(id: string, label: string, before: string, after: string): DocumentChange[] {
  return before === after ? [] : [{ id, label, before, after }];
}

function needLabel(data: SupplyDocument, line: SupplyDocument["lines"][number]) {
  if (awaitsDeliveryNeed(data, line)) return "Aguardando nova avaliação familiar";
  const decision = currentDeliveryNeed(data, line)?.decision ?? line.family_fulfillment;
  if (decision === "complete") return "Integral";
  if (decision === "partial") return "Parcial";
  return "Sem avaliação registrada";
}

const arrivalStates: Record<SupplyDocument["receipts"][number]["state"], string> = {
  pending: "Aguardando aprovação",
  approved: "Aprovada",
  rejected: "Recusada",
  correction_requested: "Devolvida para correção",
};

function supplyStatus(data: SupplyDocument) {
  const archive = activeDocumentArchive(data.workflow_data.documentArchive);
  if (archive) return documentArchiveLabel(archive);
  const followUp = supplyFollowUpState(data.status, data.workflow_data.documentFollowUp);
  if (followUp === "completed") return "Concluída";
  if (followUp === "reopened") return "Acompanhamento reaberto";
  return documentStatusLabel(data.status);
}

export function supplyChanges(before: SupplyDocument, after: SupplyDocument): DocumentChange[] {
  const changes = changedFact("state", "Situação da ficha", supplyStatus(before), supplyStatus(after));
  const priorRecipient = before.workflow_data.recipientSelection?.recipientName;
  const nextRecipient = after.workflow_data.recipientSelection?.recipientName;
  if (priorRecipient !== nextRecipient || before.recipient_id !== after.recipient_id) {
    changes.push(...changedFact("recipient", "Pessoa designada para receber", priorRecipient ?? "Nome não disponível", nextRecipient ?? "Nome não disponível"));
  }

  const previousLines = new Map(before.lines.map(line => [line.id, line]));
  const nextLines = new Map(after.lines.map(line => [line.id, line]));
  for (const line of after.lines) {
    const prior = previousLines.get(line.id);
    if (!prior) {
      changes.push(...changedFact(line.id, line.name_snapshot, "Ausente", "Incluído na ficha"));
      continue;
    }
    const compare = (field: string, label: string, previous: string, current: string) => {
      changes.push(...changedFact(line.id + "-" + field, line.name_snapshot + " · " + label, previous, current));
    };
    const compareQuantity = (field: string, label: string, previous: string, current: string) => {
      if (formatQuantity(previous) !== formatQuantity(current)) {
        compare(field, label, formatQuantity(previous, prior.unit_snapshot), formatQuantity(current, line.unit_snapshot));
      }
    };
    compare("unit", "Unidade", prior.unit_snapshot, line.unit_snapshot);
    compareQuantity("quantity", after.type === "ENT" ? "Quantidade expedida" : "Quantidade registrada", prior.quantity, line.quantity);
    if (after.type === "COM") {
      compareQuantity("approved", "Quantidade autorizada", prior.approved_quantity, line.approved_quantity);
      compareQuantity("purchased", "Quantidade adquirida", prior.purchased_quantity, line.purchased_quantity);
      compareQuantity("accepted", "Quantidade recebida no estoque familiar", prior.accepted_quantity, line.accepted_quantity);
    }
    if (after.type === "ENT") {
      compareQuantity("accepted", "Quantidade reconhecida no recebimento", prior.accepted_quantity, line.accepted_quantity);
      compareQuantity("reconciled", "Quantidade conciliada", prior.reconciled_quantity, line.reconciled_quantity);
      compare("need", "Atendimento da necessidade", needLabel(before, prior), needLabel(after, line));
    }
  }
  for (const prior of before.lines) {
    if (!nextLines.has(prior.id)) changes.push(...changedFact(prior.id, prior.name_snapshot, "Presente na ficha", "Removido da ficha"));
  }

  const priorArrivals = new Map(before.receipts.map(arrival => [arrival.id, arrival]));
  for (const arrival of after.receipts) {
    const previous = priorArrivals.get(arrival.id);
    changes.push(...changedFact(arrival.id, "Situação da chegada", previous ? arrivalStates[previous.state] : "Sem registro", arrivalStates[arrival.state]));
    const priorQuantities = new Map(previous?.lines.map(line => [line.lineId, line.quantity]));
    const nextQuantities = new Map(arrival.lines.map(line => [line.lineId, line.quantity]));
    for (const lineId of new Set([...priorQuantities.keys(), ...nextQuantities.keys()])) {
      const line = nextLines.get(lineId);
      if (!line) continue;
      const amount = (value: string | undefined) => value === undefined ? "Sem registro" : formatQuantity(value, line.unit_snapshot);
      const quantityChanges = changedFact(arrival.id + "-" + lineId, line.name_snapshot + " · Quantidade informada na chegada", amount(priorQuantities.get(lineId)), amount(nextQuantities.get(lineId)));
      changes.push(...quantityChanges.map(change => previous ? { ...change, arrivalId: arrival.id } : change));
    }
  }
  return changes;
}

"use client";
import { DocumentMaterialsTable } from "./document-materials-table";
import { formatQuantity, quantity } from "@/lib/quantity";
import { readPresentationConversions, presentationCaption } from "@/lib/presentation-conversion";
import type { SupplyDocument } from "@/types/documents";

const declaredColumns = [{ id: "material", label: "Material" }, { id: "declared", label: "Declarado" }];
const dispatchedColumns = [{ id: "material", label: "Material" }, { id: "declared", label: "Expedido" }, { id: "accepted", label: "Aceito" }, { id: "reconciled", label: "Conciliado" }, { id: "pending", label: "Quantidade pendente" }];

export function DeliveryMaterials({ data }: { data: SupplyDocument; }) {
  const declarationOnly = Boolean(data.transfer && data.transfer.state !== "dispatched");
  return <DocumentMaterialsTable key={data.id} label="Materiais da entrega ou transferência" heading={<><h2>Produtos e quantidades</h2><p>{declarationOnly ? "Quantidade da declaração preservada, sem expedição ou recebimento nesta transferência." : "Expedição, aceite pessoal e conciliação são fatos separados. Consulte o resultado de cada linha."}</p></>} columns={declarationOnly ? declaredColumns : dispatchedColumns}
    rows={data.lines.map(line => ({
      id: line.id, searchText: line.name_snapshot, cells: {
        material: <><strong>{line.name_snapshot}</strong><small>{line.unit_snapshot}</small>{readPresentationConversions(line.presentation_conversions).map(row => <small key={row.id}>{presentationCaption(row)}</small>)}{line.requisitionItemIds.length ? <small>{line.requisitionItemIds.length} linha(s) REQ explicitamente vinculada(s).</small> : null}{line.family_fulfillment ? <small><strong>Avaliação familiar: {line.family_fulfillment === "partial" ? "atendimento parcial" : "atendimento completo"}</strong> · {line.fulfillment_decided_name} · {line.fulfillment_decided_at ? new Date(line.fulfillment_decided_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Instante não disponível"}. Confirmar recebimento conserva esta avaliação.</small> : null}</>,
        declared: formatQuantity(line.quantity, line.unit_snapshot),
        accepted: formatQuantity(line.accepted_quantity, line.unit_snapshot),
        reconciled: formatQuantity(line.reconciled_quantity, line.unit_snapshot),
        pending: <>{formatQuantity(quantity(line.quantity).minus(line.accepted_quantity).minus(line.reconciled_quantity).toFixed(), line.unit_snapshot)}<small>{line.fully_checked ? "Linha integralmente conferida" : data.status === "administratively_closed" ? line.metadata.issueOpen ? "Encerramento administrativo · situação física ainda desconhecida" : "Conciliação administrativa registrada · aceite pessoal preservado" : line.metadata.issueOpen ? "Divergência aberta" : data.status === "confirmed" ? "Linha conciliada com diferença" : data.status === "cancelled" ? "Expedição cancelada e compensada" : data.status === "pending_receipt" ? "Aguardando conferência" : "Quantidade pendente"}</small></>,
      }
    }))} />;
}

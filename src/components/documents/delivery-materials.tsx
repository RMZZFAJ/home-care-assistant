"use client";

import { DocumentMaterialList } from "./document-material-list";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { readPresentationConversions, presentationCaption } from "@/lib/presentation-conversion";
import type { SupplyDocument } from "@/types/documents";
import { readCountedDeliveryReceipt } from "@/lib/documents/delivery-receipt";

export function DeliveryMaterials({ data, active }: { data: SupplyDocument; active: boolean }) {
  const declarationOnly = Boolean(data.transfer && data.transfer.state !== "dispatched");
  const notes = typeof data.workflow_data.receiptNotes === "string" ? data.workflow_data.receiptNotes.trim() : "";
  const familyDestination = data.kind === "DEV" || data.payload.destination === "FAMILY";
  return <DocumentMaterialList key={data.id} documentId={data.id} patientId={data.care_recipient_id}
    revision={String(data.version)} active={active} label="Materiais da entrega ou transferência" settledLabel="Conferidos"
    today={familyDestination ? { location: "family", label: "Família hoje" } : { location: "team", label: "Equipe hoje" }}
    heading={<><h2>Materiais</h2><p>{declarationOnly ? "Materiais declarados para expedição."
      : familyDestination ? "Do estoque da equipe ao recebimento pela família." : "Expedição, trânsito e recebimento pela equipe."}</p>
      {notes ? <p className="whitespace-pre-wrap"><strong>Observação do recebedor</strong><br />{notes}</p> : null}</>}
    rows={data.lines.map(line => {
      const receipt = readCountedDeliveryReceipt(line.metadata);
      const cancelled = data.status === "cancelled";
      const transit = cancelled ? "0" : quantity(line.quantity).minus(line.accepted_quantity).minus(line.reconciled_quantity).toFixed();
      const issue = Boolean(line.metadata.issueOpen);
      const done = !cancelled && !declarationOnly && !issue && line.fully_checked;
      const status = declarationOnly ? "Declarado" : cancelled ? "Cancelado" : issue ? "Em apuração"
        : done ? "Conferido" : Number(line.accepted_quantity) > 0 ? "Recebido em parte" : "Em trânsito";
      const amount = (value?: string | null) => formatQuantity(value, line.unit_snapshot);
      const facts = declarationOnly ? [{ label: "Declarado", value: amount(line.quantity) }] : [
        { label: "Expedido", value: amount(line.quantity) }, { label: "Em trânsito", value: amount(transit) },
        { label: "Recebido", value: amount(line.accepted_quantity) },
      ];
      const detail = declarationOnly ? facts : [
        ...facts, { label: "Conciliado", value: amount(line.reconciled_quantity) },
        ...(receipt ? [{ label: "Recebido declarado", value: amount(receipt.receivedQuantity) },
          { label: "Excedente em apuração", value: amount(receipt.excessQuantity) }] : []),
      ];
      const origins = data.originDocuments?.filter(origin => origin.productIds.includes(line.product_id)) ?? [];
      const requests = data.linkedRequisitions?.filter(req =>
        !origins.some(origin => origin.documentId === req.id)
        && req.itemIds.some(id => line.requisitionItemIds.includes(id))) ?? [];
      return { id: line.id, name: line.name_snapshot, unit: line.unit_snapshot, status, done,
        tone: done ? "success" : cancelled ? "danger" : declarationOnly ? "neutral" : "pending",
        related: [
          ...origins.map(origin => ({
            document: { id: origin.documentId, type: origin.type, code: origin.code },
            detail: "Origem vinculada a este material",
          })),
          ...requests.map(req => ({
            document: { id: req.id, type: "REQ" as const, code: req.code ?? req.protocol },
            detail: "Requisição vinculada a este material",
          })),
        ],
        facts, detail: <>
          {readPresentationConversions(line.presentation_conversions).map(item => <p key={item.id}>{presentationCaption(item)}</p>)}
          {line.requisitionItemIds.length ? <p>{line.requisitionItemIds.length} linha(s) REQ explicitamente vinculada(s).</p> : null}
          {line.family_fulfillment ? <p><strong>Avaliação familiar: {line.family_fulfillment === "partial" ? "atendimento parcial" : "atendimento completo"}</strong> · {line.fulfillment_decided_name} · {line.fulfillment_decided_at ? formatBrazilDate(line.fulfillment_decided_at) : "Instante não disponível"}</p> : null}
          {data.status === "administratively_closed" ? <p>{issue
            ? "Encerramento administrativo · situação física ainda desconhecida"
            : "Conciliação administrativa registrada · aceite pessoal preservado"}</p> : null}
          <dl className="hca-material-balance-grid">{detail.map(fact => <div key={fact.label} data-material-fact={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
        </>,
      };
    })} />;
}

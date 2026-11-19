"use client";

import Link from "next/link";
import { formatBrazilDate } from "@/lib/receipt";
import { formatStockObservation, formatStockObservationTime } from "@/lib/stock-observation";
import type { RequisitionReceipt } from "@/types/requisition";
import { RelatedDocument } from "@/components/documents/related-document";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Summary } from "./requisition-steps";

export function RequisitionReceiptCard({ receipt }: { receipt: RequisitionReceipt }) {
  return (
    <details className="ui-card hca-issued-receipt">
      <summary><Icon name="file" />{receipt.legacyReconstructed ? "Comprovante reconstruído" : "Comprovante oficial"} <Icon name="down" /></summary>
      <div className="hca-form-stack">
        <DefinitionGrid items={[
          { label: "Protocolo", value: receipt.protocol, wide: true },
          { label: "Data e hora", value: formatBrazilDate(receipt.createdAt) },
          { label: "Solicitante", value: receipt.requesterName },
          { label: "Pessoa assistida", value: receipt.recipientName },
        ]} />
        {receipt.sourceRequisition ? (
          <section className="hca-record" aria-label="Origem da necessidade remanescente">
            <h3>Necessidade remanescente</h3>
            <RelatedDocument id={receipt.sourceRequisition.id} type="REQ"
              label={receipt.sourceRequisition.code ?? receipt.sourceRequisition.protocol} />
            <p>Referência: versão {receipt.sourceRequisition.version}.</p>
            <p>Motivo: {receipt.sourceRequisition.reason}</p>
          </section>
        ) : null}
        <Summary title="Itens" details={[...receipt.lines, ...receipt.extraItems].map(item =>
          formatStockObservationTime(item.stockObservationAt, item.stockObservationTimeSource))}
          rows={[
            ...receipt.lines.map(item =>
              `${item.productName} — estoque da equipe: ${formatStockObservation(item.currentStock, item.stockObservation, item.unit)}${item.urgent ? " (urgente)" : ""}`),
            ...receipt.extraItems.map(item =>
              `${item.name} — estoque da equipe: ${formatStockObservation(item.currentStock, item.stockObservation)}${item.urgent ? " (urgente)" : ""}`),
          ]} />
        <Summary title="Observações" rows={receipt.observations} />
        <div className="hca-toolbar print:hidden">
          <ActionButton onClick={() => window.print()}>Imprimir / salvar como PDF</ActionButton>
          {receipt.requisitionId ? <Link className="hca-control hca-control--secondary"
            href={`/fichas/${receipt.requisitionId}?documentTab=communications`}>Consultar comunicações</Link> : null}
          <Link className="hca-control hca-control--secondary" href="/fichas/req">Nova requisição</Link>
        </div>
      </div>
    </details>
  );
}

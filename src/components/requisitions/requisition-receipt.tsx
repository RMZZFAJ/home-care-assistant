"use client";
import Link from "next/link";
import { buttonClass } from "@/components/workspace";
import { DocumentDeliveryStatus } from "@/components/notifications/document-delivery-status";
import { formatBrazilDate } from "@/lib/receipt";
import {
  formatStockObservation,
  formatStockObservationTime,
} from "@/lib/stock-observation";
import { DocumentActions } from "@/components/documents/document-actions";
import type { RequisitionReceipt } from "@/types/requisition";
import { RelatedDocument } from "@/components/documents/related-document";
import { Summary } from "./requisition-steps";
import { RequisitionOpening } from "./requisition-opening";
import { RequisitionDisplay } from "./requisition-display";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";

export type SavedReceipt = RequisitionReceipt & {
  id?: string;
  requisitionId?: string;
};

export function Receipt({ receipt }: { receipt: SavedReceipt }) {
  const id = receipt.requisitionId ?? receipt.id;
  return id ? (
    <>
      <p className="text-sm">Requisição registrada · {receipt.protocol}</p>
      <RequisitionOpening id={id}>
        <ReceiptContent receipt={receipt} />
      </RequisitionOpening>
    </>
  ) : (
    <ReceiptContent receipt={receipt} />
  );
}
function ReceiptContent({ receipt }: { receipt: SavedReceipt }) {
  const id = receipt.requisitionId ?? receipt.id;
  return (
    <div className="p-3 sm:p-5">
      {id ? <RequisitionDisplay key={id} id={id} /> : null}
      <section className="ui-card hca-issued-receipt">
        <p className="eyebrow">
          Requisição registrada
        </p>
        <h1 className="hca-receipt-title">Comprovante oficial</h1>
        <div className="my-6"><DefinitionGrid items={[{ label: "Protocolo", value: receipt.protocol, wide: true }, { label: "Data e hora", value: formatBrazilDate(receipt.createdAt) }, { label: "Solicitante", value: receipt.requesterName }, { label: "Pessoa assistida", value: receipt.recipientName }]} /></div>
        {receipt.sourceRequisition ? (
          <section
            className="ui-card mt-4 space-y-2"
            aria-label="Origem da necessidade remanescente"
          >
            <h2>Necessidade remanescente</h2>
            <RelatedDocument
              id={receipt.sourceRequisition.id}
              type="REQ"
              label={
                receipt.sourceRequisition.code ??
                receipt.sourceRequisition.protocol
              }
            />
            <p>Referência: versão {receipt.sourceRequisition.version}.</p>
            <p>Motivo: {receipt.sourceRequisition.reason}</p>
          </section>
        ) : null}
        <Summary
          title="Itens"
          details={[...receipt.lines, ...receipt.extraItems].map((item) =>
            formatStockObservationTime(
              item.stockObservationAt,
              item.stockObservationTimeSource,
            ),
          )}
          rows={[
            ...receipt.lines.map(
              (item) =>
                `${item.productName} — estoque da equipe: ${formatStockObservation(item.currentStock, item.stockObservation, item.unit)}${item.urgent ? " (urgente)" : ""}`,
            ),
            ...receipt.extraItems.map(
              (item) =>
                `${item.name} — estoque da equipe: ${formatStockObservation(item.currentStock, item.stockObservation)}${item.urgent ? " (urgente)" : ""}`,
            ),
          ]}
        />
        <Summary title="Observações" rows={receipt.observations} />
        {receipt.id || receipt.requisitionId ? (
          <DocumentDeliveryStatus id={(receipt.id ?? receipt.requisitionId)!} />
        ) : null}
        <div className="mt-8 flex flex-col gap-3 border-t border-(--line) pt-5 sm:flex-row">
          <ActionButton
            variant="primary"
            onClick={() => window.print()}
          >
            Imprimir / salvar como PDF
          </ActionButton>
          {receipt.id || receipt.requisitionId ? (
            <DocumentActions
              id={(receipt.id ?? receipt.requisitionId)!}
              code={receipt.protocol}
            />
          ) : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-3 print:hidden">
          <Link
            className={buttonClass}
            href={
              receipt.id || receipt.requisitionId
                ? `/historico/${receipt.id ?? receipt.requisitionId}`
                : "/historico"
            }
          >
            Consultar registro e notificações
          </Link>
          <Link className={buttonClass} href="/fichas/req">
            Nova requisição
          </Link>
        </div>
        <p className="mt-4 text-xs text-(--muted)">
          Ciência familiar ainda depende dos registros próprios. O PDF de
          emissão identifica essa pendência.
        </p>
      </section>
    </div>
  );
}

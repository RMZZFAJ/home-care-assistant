"use client";
import { holdDialogFocus } from "@/lib/forms/dialog-focus";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import Link from "next/link";
import { useEffect, useRef, type RefObject } from "react";

import { Notice } from "@/components/workspace";
import { RecordDrawer } from "@/components/forms/record-drawer";
import { DocumentHeader } from "@/components/documents/document-header";
import { PurchaseReceiptContent } from "@/components/documents/purchase-details";
import { SupplyLineSummary } from "@/components/documents/supply-line-summary";
import { ConsumptionLines } from "./consumption-lines";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { OriginMovement, StockOrigin } from "@/types/stock-origin";

const custody: Record<string, string> = {
  FAMILY: "Família",
  CARE_TEAM: "Equipe",
  TRANSIT: "Em trânsito",
};
function MovementFacts({ movement }: { movement: OriginMovement }) {
  return (
    <div className="space-y-2 text-sm">
      <p>
        {formatQuantity(movement.quantity)} ·{" "}
        {custody[movement.source_location ?? ""] ?? "Entrada"} para{" "}
        {custody[movement.destination_location ?? ""] ?? "Retirada"}
      </p>
      <p className="whitespace-pre-wrap">{movement.justification}</p>
      <p>{formatBrazilDate(movement.created_at)}</p>
      <details>
        <summary>Identificação do registro</summary>
        <p className="break-all">Movimento: {movement.id}</p>
        <p className="break-all">
          Ator registrado: {movement.performed_by ?? "Não preservado"}
        </p>
      </details>
    </div>
  );
}
function OriginContent({ data }: { data: StockOrigin }) {
  if (data.kind === "unavailable") return <Notice>{data.message}</Notice>;
  if (data.kind === "manual")
    return (
      <section className="space-y-3" aria-label="Origem do movimento familiar">
        <h3>
          {data.compensates
            ? "Compensação referenciada"
            : "Movimento familiar avulso"}
        </h3>
        <p>
          O motivo e a autoria do próprio movimento registram este ato. Nenhuma
          ficha COM, ENT ou BAL foi presumida.
        </p>
        {data.compensates ? (
          <section className="ui-card space-y-3">
            <h4>Movimento original preservado</h4>
            <MovementFacts movement={data.compensates} />
          </section>
        ) : null}
      </section>
    );
  if (data.kind === "consumption") {
    const report = data.report;
    return (
      <section aria-label="Relato de origem" className="space-y-3">
        <h3>Relato de {report.kind === "consumption" ? "consumo" : "falta"}</h3>
        <p>
          Relatado por {report.reported_name ?? "Nome histórico não preservado"}{" "}
          · {formatBrazilDate(report.created_at)}.
        </p>
        <p className="whitespace-pre-wrap">{report.body}</p>
        <ConsumptionLines lines={report.lines} />
        {report.revisions.length ? (
          <details>
            <summary>Complementos preservados</summary>
            {report.revisions.map((revision) => (
              <div key={revision.id} className="mt-3 space-y-2">
                <p>
                  {revision.actor_name ?? "Nome histórico não preservado"} ·
                  versão {revision.version} ·{" "}
                  {formatBrazilDate(revision.created_at)}
                </p>
                <p className="whitespace-pre-wrap">{revision.body}</p>
                <ConsumptionLines lines={revision.lines} />
              </div>
            ))}
          </details>
        ) : null}
        {report.decision ? (
          <p>
            Decisão de{" "}
            {report.decision.actor_name ?? "Nome histórico não preservado"} ·{" "}
            {formatBrazilDate(report.decision.created_at)} ·{" "}
            {report.decision.accepted ? "Confirmado" : "Rejeitado"}.
          </p>
        ) : null}
        <Link
          className="ui-button ui-button-secondary"
          href={
            "/consumo?" +
            new URLSearchParams({
              careRecipientId: report.care_recipient_id,
              ref: report.id,
            })
          }
        >
          Abrir acompanhamento do relato
        </Link>
      </section>
    );
  }
  if (data.kind === "inventory")
    return (
      <section
        aria-label="Inventário histórico de origem"
        className="space-y-3"
      >
        <h3>Inventário histórico</h3>
        <p>
          Custódia: {custody[data.inventory.location]}. Contagem:{" "}
          {formatBrazilDate(data.inventory.counted_at)}.
        </p>
        <p>
          Este registro histórico foi preservado; novas contagens usam o fluxo
          BAL.
        </p>
        {data.inventory.stock_inventory_items
          .filter((row) => row.product_id === data.movement.product_id)
          .map((row) => (
            <p key={row.id}>
              Referência{" "}
              {row.expected_quantity == null
                ? "não preservada"
                : formatQuantity(row.expected_quantity)}{" "}
              · Contado{" "}
              {row.is_counted && row.counted_quantity != null
                ? formatQuantity(row.counted_quantity)
                : "não informado"}{" "}
              · {row.justification || "Sem justificativa adicional"}
            </p>
          ))}
      </section>
    );
  const document = data.document,
    receipt = document.receipts.find((row) => row.id === data.receiptId),
    regularization = document.deliveryRegularization?.cases.find(
      (row) => row.id === data.regularizationId,
    );
  return (
    <div className="space-y-4">
      <DocumentHeader
        id={document.id}
        type={document.type}
        code={document.code ?? "Registro sem emissão"}
        status={document.status}
        protocol={document.protocol}
        version={document.version}
        createdAt={document.created_at}
      />
      {receipt ? (
        <section
          className="ui-card space-y-3"
          aria-label="Parcela exata de origem"
        >
          <h3>Parcela de origem deste crédito</h3>
          <PurchaseReceiptContent receipt={receipt} lines={document.lines} />
          <details>
            <summary>Identificação da parcela</summary>
            <p className="break-all">{receipt.id}</p>
          </details>
        </section>
      ) : regularization ? (
        <section
          className="ui-card space-y-3"
          aria-label="Regularização de origem"
        >
          <h3>Regularização administrativa de origem</h3>
          <p>
            Proposta por {regularization.proposal.proposedName} ·{" "}
            {formatBrazilDate(regularization.proposed_at)}.
          </p>
          <p className="whitespace-pre-wrap">
            {regularization.proposal.reason}
          </p>
          {regularization.decision ? (
            <p>
              Decisão própria: {regularization.decision.actorName} ·{" "}
              {formatBrazilDate(regularization.decision.recordedAt)} ·{" "}
              {regularization.decision.reason}
            </p>
          ) : null}
          <p>O ato administrativo não substitui recebimento pessoal.</p>
        </section>
      ) : (
        <section className="space-y-3" aria-label="Material na ficha de origem">
          {document.lines
            .filter((line) => line.product_id === data.movement.product_id)
            .map((line) => (
              <SupplyLineSummary
                key={line.id}
                line={line}
                type={document.type}
                status={document.status}
              />
            ))}
        </section>
      )}
      <Link
        className="ui-button ui-button-secondary"
        href={"/documentos/" + document.id}
      >
        Abrir acompanhamento da ficha
      </Link>
      <p className="text-sm">
        Esta consulta não altera saldo, recebimento ou documento. A ficha pode
        conter versões posteriores ao movimento; seus eventos preservam os fatos
        de cada etapa.
      </p>
    </div>
  );
}
export function MovementOrigin({
  patientId,
  movementId,
  opener,
  onClose,
  restoreFocusFallbackRef,
}: {
  patientId: string;
  movementId: string;
  opener: HTMLElement;
  onClose: () => void;
  restoreFocusFallbackRef: RefObject<HTMLElement | null>;
}) {
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const focusResultRef = useRef(true);
  const revision = useLiveRevision(),
    source = useScopedRead<{ data: StockOrigin }>(
      "/api/stock/movements/" +
        movementId +
        "/origin?" +
        new URLSearchParams({ careRecipientId: patientId }),
      String(revision),
    );
  useEffect(() => {
    if (
      !source.loading &&
      source.data &&
      !source.error &&
      focusResultRef.current
    ) {
      const frame = requestAnimationFrame(() => {
        focusResultRef.current = false;
        resultHeadingRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [source.loading, source.data, source.error]);
  return (
    <RecordDrawer
      title="Origem da movimentação"
      onClose={onClose}
      restoreFocusTo={opener}
      restoreFocusFallbackRef={restoreFocusFallbackRef}
      trackChanges={false}
    >
      <div className="space-y-4">
        {source.loading ? (
          <LoadingIndicator label="Consultando origem autorizada" />
        ) : null}
        {source.error ? (
          <Notice error>
            {source.error}
            <ActionButton
              onClick={(event) => {
                holdDialogFocus(event.currentTarget);
                focusResultRef.current = true;
                source.refresh();
              }}
            >
              Tentar consultar origem novamente
            </ActionButton>
          </Notice>
        ) : null}
        {source.data ? (
          <div aria-busy={source.loading}>
            {source.error || source.loading ? (
              <Notice>
                Última consulta preservada; atualize para conferir a origem
                vigente.
              </Notice>
            ) : null}
            <section aria-label="Movimento consultado" className="space-y-3">
              <h3 ref={resultHeadingRef} tabIndex={-1}>
                Movimento consultado
              </h3>
              <p>
                <strong>
                  {source.data.data.material.name ??
                    "Nome do material indisponível"}
                </strong>{" "}
                · {source.data.data.material.unit ?? "Unidade não disponível"}.
              </p>
              <p className="text-xs">
                Identificação atual do catálogo; os nomes preservados no ato
                aparecem na origem abaixo.
              </p>
              <MovementFacts movement={source.data.data.movement} />
              <p>Ator: {source.data.data.actor.name ?? "Nome indisponível"}.</p>
              {source.data.data.actor.source === "current_profile" ? (
                <p className="text-xs">
                  Nome do cadastro atual; o identificador do ato permanece
                  preservado no movimento.
                </p>
              ) : null}
            </section>
            <OriginContent data={source.data.data} />
          </div>
        ) : null}
      </div>
    </RecordDrawer>
  );
}

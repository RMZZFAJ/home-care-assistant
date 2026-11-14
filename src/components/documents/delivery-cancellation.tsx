"use client";
import Link from "next/link";
import { Notice } from "@/components/workspace";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity, quantity } from "@/lib/quantity";
import { DefinitionGrid } from "@/components/ui/controls";
import type {
  DeliveryCancellationContext,
  DeliveryCancellationLine,
  DeliveryCancellationRequest,
  SupplyDocument,
} from "@/types/documents";

const cancellationStatuses = {
  pending: "Aguardando decisão",
  consented: "Consentido e conciliado",
  refused: "Recusado pelo recebedor",
  withdrawn: "Retirado pelo solicitante",
};

export function DeliveryConsumptionReferences({
  line,
}: {
  line: DeliveryCancellationLine;
}) {
  return line.consumptionReferences.length ? (
    <details className="my-2">
      <summary>Consultar referências do consumo confirmado</summary>
      <ul className="mt-2 space-y-2">
        {line.consumptionReferences.map((reference) => (
          <li key={reference.movementId} className="text-sm">
            {formatQuantity(reference.quantity, line.unit)} ·{" "}
            {formatBrazilDate(reference.recordedAt)} ·{" "}
            <Link
              href={"/consumo?ref=" + reference.reportId}
              prefetch={false}
              className="ui-link"
            >
              Consultar relato de consumo
            </Link>
          </li>
        ))}
      </ul>
    </details>
  ) : (
    <p className="hca-field-hint">
      Nenhum consumo confirmado elegível para esta conciliação.
    </p>
  );
}
function RequestFacts({
  request,
  historical = false,
}: {
  request: DeliveryCancellationRequest;
  historical?: boolean;
}) {
  const status =
    historical && request.status === "pending"
      ? "Pedido anterior sem decisão pessoal"
      : cancellationStatuses[request.status];
  return (
    <div className="space-y-2">
      <p className="font-semibold">{status}</p>
      <p className="text-sm">
        Solicitado por {request.requestedName ?? "nome não preservado"} ·{" "}
        {formatBrazilDate(request.requestedAt)}
      </p>
      <p className="whitespace-pre-wrap wrap-break-word">
        Motivo do pedido: {request.reason}
      </p>
      {request.outcome ? (
        <>
          <p className="text-sm">
            Decisão de {request.outcome.actorName ?? "nome não preservado"} ·{" "}
            {formatBrazilDate(request.outcome.recordedAt)}
          </p>
          <p className="whitespace-pre-wrap wrap-break-word">
            Justificativa da decisão: {request.outcome.reason}
          </p>
        </>
      ) : null}
    </div>
  );
}
export function DeliveryCancellationDetails({
  context,
  onRefresh,
  sourceChecking = false,
}: {
  context: DeliveryCancellationContext;
  onRefresh: () => void;
  sourceChecking?: boolean;
}) {
  return (
    <section className="ui-card space-y-4" aria-label="Cancelamento da entrega">
      <h2 className="font-semibold">
        {context.historical
          ? "Pedido anterior preservado"
          : context.request.status === "pending"
            ? "Pedido de cancelamento vigente"
            : "Resultado do pedido de cancelamento"}
      </h2>
      <RequestFacts request={context.request} historical={context.historical} />
      {context.historical ? (
        <Notice>
          O pedido não recebeu consentimento pessoal. A regularização
          administrativa tem decisão e autoria próprias; consulte seu dossiê
          nesta ficha.
        </Notice>
      ) : null}
      {context.request.status === "pending" && !context.historical ? (
        <>
          <Notice>
            O pedido mantém os fatos de recebimento e o estoque. O recebedor
            decide pessoalmente; o solicitante pode retirar seu pedido.
          </Notice>
          {!context.sourceReady ? (
            <Notice error={!sourceChecking}>
              {sourceChecking
                ? "Referências em conferência. Os dados da consulta anterior não serão usados para esta decisão."
                : context.sourceAccess === false
                  ? "As referências de consumo não estão disponíveis para o seu acesso atual."
                  : "Não foi possível comprovar as referências históricas desta conciliação."}{" "}
              <button
                type="button"
                className="ui-button ui-button-secondary"
                onClick={onRefresh}
              >
                Atualizar referências
              </button>
            </Notice>
          ) : null}
          {context.unresolvedTransit &&
          quantity(context.unresolvedTransit).gt(0) ? (
            <Notice>
              Há material em trânsito sem conciliação. Use a ação de conciliar
              divergência e registre sua situação real antes de consentir com o
              encerramento.
            </Notice>
          ) : null}
        </>
      ) : null}
      {context.lines.map((line) => (
        <section className="hca-factual-material border-t border-(--line) pt-3" key={line.lineId}>
          <h3 className="font-semibold">{line.name}</h3>
          <DefinitionGrid items={[
            { label: "Recebido no aceite", value: formatQuantity(line.acceptedQuantity, line.unit) },
            ...(context.request.status === "pending" ? [
              { label: "Consumo confirmado disponível para conciliação", value: formatQuantity(line.availableConsumedQuantity, line.unit) },
            ] : line.consumedQuantity !== undefined ? [
              { label: "Consumo já confirmado referenciado", value: formatQuantity(line.consumedQuantity, line.unit) },
              { label: "Devolução real registrada", value: formatQuantity(line.returnQuantity, line.unit) },
            ] : []),
          ]} />
          <DeliveryConsumptionReferences line={line} />
        </section>
      ))}
      {context.history.length ? (
        <details>
          <summary>Pedidos anteriores e suas decisões</summary>
          <div className="mt-3 space-y-4">
            {context.history.map((request) => (
              <section key={request.id}>
                <RequestFacts request={request} />
              </section>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
export function DeliveryCancellationComparison({
  original,
  current,
}: {
  original: SupplyDocument;
  current: SupplyDocument;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Comparação da conciliação</h3>
      <p>
        Versão revisada: {original.version} · Versão atual: {current.version}
      </p>
      <p>
        Pedido atual:{" "}
        {current.deliveryCancellation
          ? cancellationStatuses[current.deliveryCancellation.request.status]
          : "sem pedido vigente"}
      </p>
      {original.lines.map((line) => {
        const before = original.deliveryCancellation?.lines.find(
            (item) => item.lineId === line.id,
          ),
          after = current.deliveryCancellation?.lines.find(
            (item) => item.lineId === line.id,
          );
        return (
          <div key={line.id}>
            <strong>{line.name_snapshot}</strong>
            <p className="text-sm">
              Consumo disponível revisado:{" "}
              {formatQuantity(
                before?.availableConsumedQuantity,
                line.unit_snapshot,
              )}{" "}
              · Atual:{" "}
              {formatQuantity(
                after?.availableConsumedQuantity,
                line.unit_snapshot,
              )}
            </p>
          </div>
        );
      })}
    </section>
  );
}

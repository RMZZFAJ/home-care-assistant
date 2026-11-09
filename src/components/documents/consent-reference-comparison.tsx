"use client";
import { useCallback, type ReactNode } from "react";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import {
  parseConsentReference,
  type ConsentReferenceExpectation,
} from "@/lib/validation/consent-reference";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import { Notice, buttonClass } from "@/components/workspace";
import { DeliveryConsumptionReferences } from "./delivery-cancellation";

export function ConsentReferenceComparison({
  expected,
  children,
}: {
  expected: ConsentReferenceExpectation;
  children: (ready: boolean) => ReactNode;
}) {
  const live = useLiveRevision();
  const { id, patientId, version, requestId, referenceHash } = expected;
  const lineIdsKey = JSON.stringify(expected.lineIds);
  const decode = useCallback(
    (value: unknown) =>
      parseConsentReference(value, {
        id,
        patientId,
        version,
        requestId,
        referenceHash,
        lineIds: JSON.parse(lineIdsKey) as string[],
      }),
    [id, patientId, version, requestId, referenceHash, lineIdsKey],
  );
  const read = useScopedRead(
    `/api/documents/${id}?reference=consent`,
    JSON.stringify([
      live,
      patientId,
      version,
      requestId,
      referenceHash,
      lineIdsKey,
    ]),
    decode,
  );
  const reference = !read.loading && !read.error ? read.data : null;
  const ready =
    !!reference &&
    reference.sourceReady &&
    reference.sourceAccess !== false &&
    reference.request.status === "pending" &&
    !!reference.referenceHash;
  return (
    <section
      className="hca-form-stack"
      aria-label="Referências autorizadas da conciliação"
    >
      <h3>Pedido e consumo confirmado na consulta atual</h3>
      <p>
        O rascunho preserva suas declarações e a identidade da referência
        consultada. Os fatos de consumo são consultados com seu acesso atual;
        não são reconstruídos a partir do preenchimento privado.
      </p>
      {read.loading ? (
        <p role="status">Conferindo pedido e fontes de consumo…</p>
      ) : null}
      {read.error ? (
        <Notice error>{read.error} A referência não foi adotada.</Notice>
      ) : null}
      {reference && !ready ? (
        <Notice error>
          As fontes não estão disponíveis para consentir com este pedido.
          Atualize o acompanhamento antes de decidir.
        </Notice>
      ) : null}
      {ready ? (
        <>
          <p>
            {reference.request.requestedName ?? "Nome histórico não preservado"}{" "}
            · {formatBrazilDate(reference.request.requestedAt)} ·{" "}
            {reference.request.reason}
          </p>
          {reference.lines.map((line) => (
            <section
              className="ui-card space-y-2"
              key={line.lineId}
              aria-label={`Fonte atual de ${line.name}`}
            >
              <h4>
                {line.name} · {line.unit}
              </h4>
              <dl>
                <div>
                  <dt>Aceito nesta entrega</dt>
                  <dd>{formatQuantity(line.acceptedQuantity, line.unit)}</dd>
                </div>
                <div>
                  <dt>Consumo confirmado disponível</dt>
                  <dd>
                    {formatQuantity(line.availableConsumedQuantity, line.unit)}
                  </dd>
                </div>
                <div>
                  <dt>Devolução mínima para conciliar o aceite</dt>
                  <dd>
                    {formatQuantity(line.minimumReturnQuantity, line.unit)}
                  </dd>
                </div>
              </dl>
              <DeliveryConsumptionReferences line={line} />
            </section>
          ))}
        </>
      ) : null}
      <button
        type="button"
        className={buttonClass}
        aria-disabled={read.loading}
        onClick={() => {
          if (!read.loading) read.refresh();
        }}
      >
        Conferir novamente as fontes da conciliação
      </button>
      {children(ready)}
    </section>
  );
}

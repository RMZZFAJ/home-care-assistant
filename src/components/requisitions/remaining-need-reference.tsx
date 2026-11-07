"use client";
import { useEffect, useId, useRef } from "react";
import { Button, Spinner } from "@fluentui/react-components";
import { Notice, inputClass } from "@/components/workspace";
import { RelatedDocument } from "@/components/documents/related-document";
import { useScopedRead } from "@/lib/use-scoped-read";
import type { RequisitionFormData } from "@/types/requisition";

export function RemainingNeedReference({
  sourceId,
  patientId,
  value,
  onChange,
  readonly,
  attempt,
  onReady,
  reasonError,
}: {
  sourceId: string;
  patientId: string;
  value: RequisitionFormData["remainingNeed"];
  onChange: (value: NonNullable<RequisitionFormData["remainingNeed"]>) => void;
  readonly: boolean;
  attempt: number;
  onReady: (value: boolean) => void;
  reasonError?: string;
}) {
  const reasonId = useId(),
    reasonRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (attempt > 0 && !readonly) reasonRef.current?.focus();
  }, [attempt, readonly]);
  const source = useScopedRead<{
    data: {
      id: string;
      care_recipient_id: string;
      code: string | null;
      protocol: string;
      progress: { version: number };
      fulfillment: { fulfilled: number; total: number };
      requisition_items: {
        id: string;
        product_name_snapshot: string | null;
        custom_name: string | null;
      }[];
    };
  }>(`/api/requisitions/${encodeURIComponent(sourceId)}`, String(attempt));
  const data = source.data?.data;
  const valid = Boolean(
    data && data.care_recipient_id === patientId && data.id === sourceId,
  );
  const ready =
    valid &&
    !source.loading &&
    !source.error &&
    value?.version === data?.progress.version;
  useEffect(() => onReady(ready), [ready, onReady]);
  return (
    <section
      className="ui-card mb-5 min-w-0 space-y-3"
      aria-label="Nova necessidade vinculada"
      style={{ overflowWrap: "anywhere" }}
    >
      <h2>Nova necessidade vinculada</h2>
      <p>
        Será emitida uma nova requisição. A anterior conserva seus materiais,
        observações, ciências e aceites; estoque não será creditado novamente.
        Selecione os materiais e informe a observação atual nas próximas etapas.
      </p>
      {source.loading ? (
        <Spinner label="Consultando a requisição de origem" />
      ) : null}
      {source.error ? (
        <Notice error>
          {source.error}{" "}
          <Button onClick={source.refresh}>Tentar origem novamente</Button>
        </Notice>
      ) : null}
      {data && valid ? (
        <>
          <RelatedDocument
            id={data.id}
            type="REQ"
            label={data.code ?? data.protocol}
          />
          <p>
            Referência consultada: versão {data.progress.version}. Atendimento
            anterior: {data.fulfillment.fulfilled} de {data.fulfillment.total}{" "}
            materiais.
          </p>
          <ul>
            {data.requisition_items.map((item) => (
              <li key={item.id}>
                {item.product_name_snapshot ??
                  item.custom_name ??
                  "Material registrado"}
              </li>
            ))}
          </ul>
          {value ? (
            <p>Minha referência para a confirmação: versão {value.version}.</p>
          ) : null}
          {!readonly && (!value || value.version !== data.progress.version) ? (
            <>
              {value ? (
                <Notice>
                  A origem mudou. Compare o atendimento acima; sua seleção e seu
                  motivo continuam preservados. Adotar a referência não emite a
                  nova requisição.
                </Notice>
              ) : null}
              <Button
                disabled={source.loading || Boolean(source.error)}
                onClick={() => {
                  onChange({
                    requisitionId: sourceId,
                    version: data.progress.version,
                    reason: value?.reason ?? "",
                  });
                  reasonRef.current?.focus();
                }}
              >
                {value
                  ? "Adotar referência atual e manter meu motivo"
                  : "Preparar nova necessidade com esta referência"}
              </Button>
            </>
          ) : null}
        </>
      ) : data && !valid ? (
        <Notice error>
          A origem não pertence ao paciente desta ficha. Retorne ao histórico
          autorizado.
        </Notice>
      ) : null}
      {value ? (
        readonly ? (
          <p className="whitespace-pre-wrap">
            <strong>Motivo da necessidade remanescente:</strong>{" "}
            {value.reason || "Ainda não informado"}
          </p>
        ) : (
          <div>
            <label htmlFor={reasonId} className="block text-sm font-semibold">
              Motivo da necessidade remanescente
            </label>
            <textarea
              id={reasonId}
              ref={reasonRef}
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={reasonError ? reasonId + "-error" : undefined}
              className={inputClass}
              minLength={3}
              maxLength={1000}
              value={value.reason}
              onChange={(event) =>
                onChange({ ...value, reason: event.target.value })
              }
            />
            {reasonError ? (
              <p id={reasonId + "-error"} className="ui-field-error">
                {reasonError}
              </p>
            ) : null}
          </div>
        )
      ) : null}
    </section>
  );
}

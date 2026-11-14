"use client";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import { formatZonedDate } from "@/lib/schedules/time";
import type { BalanceDraftContent } from "@/lib/validation/creation-drafts";

export function BalanceObservationSnapshot({
  content,
}: {
  content: BalanceDraftContent;
}) {
  return (
    <div className="hca-form-stack">
      <DefinitionGrid
        items={[
          {
            label: "Referência de estoque anterior",
            value: content.context.referenceRevision ?? "Não preservada",
          },
          {
            label: "Versão anterior da ficha",
            value: content.context.documentVersion ?? "Sem ficha oficial",
          },
          {
            label: "Vínculo da contagem",
            value:
              content.context.mode === "scheduled"
                ? "Plantão designado"
                : "Contagem sem regime de plantão",
          },
          {
            label: "Versão anterior da atribuição",
            value: content.context.assignmentVersion ?? "Não preservada",
          },
        ]}
      />
      <ul className="hca-records">
        {Object.entries(content.counts).map(([id, value]) => {
          const material = content.materials.find((m) => m.id === id);
          return (
            <li className="hca-record min-w-0" key={id}>
              <div className="hca-record-main wrap-break-word">
                <strong>
                  {material?.name ?? "Material sem nome preservado"}
                </strong>
                <p>
                  Quantidade anterior: {value || "Não preenchida"}{" "}
                  {material?.unit}
                </p>
                <p>
                  Observada em:{" "}
                  {content.observationTimes[id]
                    ? formatZonedDate(
                        content.observationTimes[id],
                        "America/Sao_Paulo",
                      )
                    : "Data não informada"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {content.notes ? (
        <p className="whitespace-pre-wrap wrap-break-word">{content.notes}</p>
      ) : null}
    </div>
  );
}

export function BalancePreviousObservations({
  content,
}: {
  content: BalanceDraftContent;
}) {
  if (!content.previousObservations?.length) return null;
  const occurrences = new Map<string, number>();
  const snapshots = content.previousObservations.map((snapshot) => {
    const signature = JSON.stringify(snapshot),
      occurrence = occurrences.get(signature) ?? 0;
    occurrences.set(signature, occurrence + 1);
    return { snapshot, key: signature + ":" + occurrence };
  });
  return (
    <section
      className="ui-card hca-form-stack"
      aria-label="Conferências anteriores preservadas"
    >
      <h3>Conferências anteriores preservadas</h3>
      <p>
        Estes valores são referências privadas anteriores. Não preenchem a nova
        contagem e não alteram o estoque.
      </p>
      {snapshots.map(({ snapshot, key }, index) => (
        <details key={key}>
          <summary>Conferência anterior {index + 1}</summary>
          <BalanceObservationSnapshot content={snapshot} />
        </details>
      ))}
    </section>
  );
}

export function BalanceReferenceReview({
  source,
  current,
  disabled,
  onAdopt,
}: {
  source: BalanceDraftContent;
  current: BalanceDraftContent["context"];
  disabled: boolean;
  onAdopt: () => void;
}) {
  return (
    <section
      className="ui-card hca-form-stack"
      aria-label="Conferir mudança da contagem"
    >
      <Notice>
        A referência da contagem mudou. Os campos e as datas anteriores foram
        preservados. Consulte os valores abaixo antes de começar outra
        conferência física.
      </Notice>
      <BalanceObservationSnapshot content={source} />
      <DefinitionGrid
        items={[
          {
            label: "Referência de estoque atual",
            value: current.referenceRevision ?? "Indisponível",
          },
          {
            label: "Versão atual da ficha",
            value: current.documentVersion ?? "Sem ficha oficial",
          },
          {
            label: "Versão atual da atribuição",
            value: current.assignmentVersion ?? "Sem atribuição atual",
          },
        ]}
      />
      <p>
        Atualizar consulta novamente as referências. As quantidades novas
        começam vazias; notas e conferências anteriores continuam disponíveis.
        Salve o preenchimento privado para retomá-lo em outro aparelho.
      </p>
      <ActionButton disabled={disabled} onClick={onAdopt}>
        Atualizar referência e iniciar nova conferência
      </ActionButton>
    </section>
  );
}

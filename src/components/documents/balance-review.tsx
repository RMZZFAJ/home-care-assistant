"use client";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { recountHref } from "@/components/balances/balance-recount-assignment";

import { Notice, type WorkspaceContext } from "@/components/workspace";
import { BalanceDocumentPreparation } from "@/components/balances/balance-document-preparation";

import { type BalanceDocumentPurpose } from "@/lib/validation/supply-drafts";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import type { BalanceReviewContext, SupplyDocument } from "@/types/documents";

import { BalanceMaterials, BalanceRecordedExtras } from "@/components/balances/balance-materials";
import { issuedBalanceExtras } from "@/lib/validation/balance-count-extras";
import { BalanceReviewItemFacts } from "@/components/balances/balance-review-items";
import { BalanceApplication } from "@/components/balances/balance-application";

const groupLabel = { family: "Família", supervisor: "Supervisão" };
function referenceLabel(context: BalanceReviewContext) {
  if (context.referenceState === "unavailable")
    return "Referência do efeito anterior não preservada. A revisão histórica não reaplica estoque.";
  if (context.referenceState === "historical")
    return "O estoque recebeu movimentos posteriores. A revisão sobre esta contagem não valida o saldo atual nem reaplica ajustes.";
  return context.reconciliationApplied
    ? "Contagem já conciliada. Nenhuma revisão repete a movimentação."
    : "A revisão confirma ou aponta diferenças na contagem. Aplicar a contagem ao estoque exige um ato separado, com referência válida e as revisões previstas.";
}
function CountFacts({ data, context }: { data: SupplyDocument; context: BalanceReviewContext; }) {
  const extras = issuedBalanceExtras.safeParse(data.payload.balanceExtras ?? []);
  return (
    <div className="hca-form-stack hca-balance-facts">
      <DefinitionGrid items={[
        { label: "Contador efetivo", value: context.counter.name ?? "Autoria não disponível" },
        { label: "Contagem", value: context.countVersion ?? "não identificada" },
        { label: "Registro da contagem", value: context.counter.recordedAt ? formatBrazilDate(context.counter.recordedAt) : "Instante não preservado" },
        { label: "Versão documental", value: data.version },
      ]} />
      {context.counter.source === "current_profile" ? <p>Nome atual do cadastro; o nome histórico não foi preservado.</p> : null}
      <div>
        <h3 className="font-semibold">Observações originais de quem contou</h3>
        <p className="whitespace-pre-wrap wrap-break-word">
          {context.notes || "Nenhuma observação registrada."}
        </p>
      </div>
      <p>
        {["cancelled", "rejected"].includes(data.status)
          ? "Consulta histórica de balanço encerrado. A revisão não inicia uma nova conciliação."
          : referenceLabel(context)}
      </p>
      <details className="doc-help-details">
        <summary className="min-h-11"><Icon name="stock" width={16} height={16} />Comparar contagem e referência</summary>
        <BalanceMaterials rows={data.lines.map(line => ({ id: line.id, name: line.name_snapshot, unit: line.unit_snapshot, counted: line.quantity, reference: line.metadata.expectedQuantity as string | number | null | undefined }))} />
        {extras.success ? <BalanceRecordedExtras extras={extras.data} /> : <Notice error>Os dados dos extras desta contagem estão indisponíveis.</Notice>}
      </details>
    </div>
  );
}
export function BalanceCounts({ data, children }: { data: SupplyDocument; children?: ReactNode }) {
  const countEvents = data.events
    .filter((event) =>
      ["bal.issued", "bal.submit", "bal.recount"].includes(event.action),
    )
    .sort((a, b) => a.version - b.version);
  return (
    <section
      className="ui-card space-y-4"
      aria-labelledby="balance-counts-heading"
    >
      <h2 id="balance-counts-heading">Contagem física</h2>
      {data.balanceReview ? <CountFacts data={data} context={data.balanceReview} />
        : <Notice>Os dados da contagem atual estão indisponíveis. Atualize a ficha para consultar a referência.</Notice>}
      {children}
      {data.balanceRecount?.canAssign ? (
        <Link
          href={recountHref(data.balanceRecount.patientId, data.id)}
          className="ui-button ui-button-secondary"
          prefetch={false}
        >
          Designar reconto
        </Link>
      ) : data.balanceRecount?.requiresDesignation ? (
        <Notice>
          O reconto aguarda nova designação da família ou supervisão habilitada
          no acompanhamento de balanços.
        </Notice>
      ) : null}
      <section aria-label="Versões das contagens físicas" className="space-y-3">
        <h3 className="font-semibold">Contagens físicas preservadas</h3>
        {!countEvents.length ? (
          <p>Nenhuma contagem oficial preservada neste histórico.</p>
        ) : null}
        {countEvents.map((event) => {
          const captured = Array.isArray(data.canonical_snapshot.history)
            ? data.canonical_snapshot.history.find(
              (row: unknown) =>
                row &&
                typeof row === "object" &&
                "version" in row &&
                row.version === event.version,
            )
            : null;
          const name =
            captured &&
              typeof captured === "object" &&
              "actorName" in captured &&
              typeof captured.actorName === "string"
              ? captured.actorName
              : "Nome não preservado neste histórico";
          return (
            <article
              className="ui-card hca-form-stack"
              key={event.id}
            >
              <p>
                <strong>Contagem na versão documental {event.version}</strong> ·{" "}
                {name} · {formatBrazilDate(event.createdAt)}
              </p>
              <p>
                Consulte os materiais, quantidades e observações congelados
                nessa versão.
              </p>
              <Link
                href={`/documentos/${data.id}/arquivos?version=${event.version}`}
                className="ui-button ui-button-secondary"
              >
                Consultar PDF da contagem na versão {event.version}
              </Link>
            </article>
          );
        })}
      </section>
    </section>
  );
}

export function BalanceReview({
  data,
  onRefresh,
  onEditingChange,
  context: workspace,
}: {
  data: SupplyDocument;
  onRefresh: () => void;
  context: WorkspaceContext;
  onEditingChange: (editing: boolean) => void;
}) {
  const [editor, setEditor] = useState<{
    purpose: BalanceDocumentPurpose;
    opener: HTMLElement;
  } | null>(null);
  const [message, setMessage] = useState("");
  const resultRef = useRef<HTMLHeadingElement>(null),
    focusAfterSuccessRef = useRef(false);
  useEffect(() => {
    if (!editor && focusAfterSuccessRef.current) {
      focusAfterSuccessRef.current = false;
      const frame = requestAnimationFrame(() => resultRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [editor]);

  const context = data.balanceReview;
  if (!context)
    return (
      <Notice>
        Referência de revisão indisponível. Atualize a ficha para consultar as revisões.
      </Notice>
    );
  function close() {
    setEditor(null);
    onEditingChange(false);
    onRefresh();
  }
  return (
    <section className="ui-card space-y-4" aria-labelledby="balance-review-heading">
      <h2 ref={resultRef} tabIndex={-1} id="balance-review-heading">
        {context.countVersion === null ? "Revisões" : `Revisões da contagem ${context.countVersion}`}
      </h2>
      {message ? <Notice>{message}</Notice> : null}
      <Notice>
        {["cancelled", "rejected"].includes(data.status)
          ? "Balanço encerrado: revisões e observações permanecem em leitura."
          : context.reviewRequired
            ? "As revisões previstas ainda precisam ser registradas. Cada pessoa revisa uma vez, em grupo autorizado e distinto de quem contou. A revisão não altera estoque."
            : context.policyReviewRequired
              ? "As revisões previstas foram registradas. A revisão não substitui a confirmação da aplicação ao estoque."
              : "Revisão facultativa. A contagem válida não entra em uma fila universal de aprovação."}
      </Notice>

      {context.eligibleGroups.length ? (
        <div className="hca-toolbar">
          {context.eligibleGroups.map((group) => (
            <ActionButton
              key={group}
              onClick={(event) => {
                setEditor({
                  purpose:
                    group === "family" ? "review_family" : "review_supervisor",
                  opener: event.currentTarget,
                });
                onEditingChange(true);
              }}
            >
              {group === "family"
                ? "Revisão da família"
                : "Revisão da supervisão"}
            </ActionButton>
          ))}
        </div>
      ) : (
        <p className="text-sm">
          Não há nova revisão elegível para sua identidade nesta contagem. O
          contador não revisa o próprio ato.
        </p>
      )}
      <section className="space-y-3" aria-label="Revisões do balanço">
        <h3 className="font-semibold">Revisões com autoria própria</h3>
        {context.reviews.map((row) => (
          <article
            className="ui-card hca-form-stack"
            key={row.id}
          >
            <p>
              <strong>{row.reviewer_name}</strong> ·{" "}
              {groupLabel[row.review_group]} ·{" "}
              {formatBrazilDate(row.recorded_at)}
            </p>
            <p>
              Contagem {row.count_version} por{" "}
              {row.reviewed_snapshot.counter.name ?? "Autoria não disponível"} ·
              versão revisada {row.reviewed_document_version}
              {row.count_version !== context.countVersion
                ? " · Histórico de contagem anterior"
                : ""}
            </p>
            <p className="whitespace-pre-wrap wrap-break-word">
              {row.comment || "Revisão sem comentário adicional."}
            </p>
            <BalanceReviewItemFacts review={row} corrections={context.corrections} documentId={data.id} documentVersion={data.version} />
            <p>
              {row.reviewed_snapshot.opinionOnly
                ? "Revisão registrada sem aplicar a contagem ao estoque."
                : row.reviewed_snapshot.appliedBeforeReview
                  ? "Revisão posterior sem reaplicar o estoque."
                  : "Registro histórico de revisão; consulte a aplicação preservada da contagem."}
            </p>
            <details>
              <summary>Contagem e observações revisadas</summary>
              <p className="whitespace-pre-wrap wrap-break-word">
                {row.reviewed_snapshot.notes ||
                  "Nenhuma observação registrada."}
              </p>
              <ul>
                {row.reviewed_snapshot.lines.map((line) => (
                  <li key={line.id}>
                    {line.name_snapshot}:{" "}
                    {formatQuantity(line.quantity, line.unit_snapshot)}
                  </li>
                ))}
              </ul>
              <BalanceRecordedExtras extras={row.reviewed_snapshot.extras ?? []} />
            </details>
          </article>
        ))}
        {!context.reviews.length ? (
          <p className="text-sm">Nenhuma revisão independente registrada.</p>
        ) : null}
        {context.legacyApprovals.length ? (
          <details>
            <summary>Registros legados de revisão</summary>
            {context.legacyApprovals.map((row) => (
              <p
                className="text-sm"
                key={row.count_version + ":" + row.review_group}
              >
                Contagem {row.count_version} · {row.review_group} · nome atual:{" "}
                {row.actorName ?? "Não preservado"} ·{" "}
                {formatBrazilDate(row.created_at)}. Registro preservado;
                elegibilidade histórica não reconstituída.
              </p>
            ))}
          </details>
        ) : null}
      </section>
      <BalanceApplication key={workspace.userId + ":" + data.id} data={data} userId={workspace.userId} patientActive={workspace.patient?.id === data.care_recipient_id} onRefresh={onRefresh} onEditingChange={onEditingChange} />
      {editor ? (
        <BalanceDocumentPreparation
          key={
            workspace.userId +
            ":" +
            data.care_recipient_id +
            ":" +
            data.id +
            ":" +
            editor.purpose
          }
          context={workspace}
          patientId={data.care_recipient_id}
          documentId={data.id}
          purpose={editor.purpose}
          restoreFocusTo={editor.opener}
          restoreFocusFallbackRef={resultRef}
          onClose={close}
          onCommitted={() => {
            setMessage(
              "Revisão registrada com autoria própria. As observações da contagem foram preservadas.",
            );
            focusAfterSuccessRef.current = true;
            close();
          }}
        />
      ) : null}
    </section>
  );
}

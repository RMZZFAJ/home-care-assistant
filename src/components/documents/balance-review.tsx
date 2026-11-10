"use client";
import { ActionButton } from "@/components/ui/controls";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { recountHref } from "@/components/balances/balance-recount-assignment";

import { Notice, type WorkspaceContext } from "@/components/workspace";
import { BalanceDocumentPreparation } from "@/components/balances/balance-document-preparation";
import { balanceDocumentLabels } from "@/lib/forms/balance-document-draft";
import {
  balanceDocumentPurposes,
  type BalanceDocumentPurpose,
} from "@/lib/validation/supply-drafts";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity } from "@/lib/quantity";
import type { BalanceReviewContext, SupplyDocument } from "@/types/documents";

const groupLabel = { family: "Família", supervisor: "Supervisão" };
function referenceLabel(context: BalanceReviewContext) {
  if (context.referenceState === "unavailable")
    return "Referência do efeito anterior não preservada. O parecer histórico não reaplica estoque.";
  if (context.referenceState === "historical")
    return "O estoque recebeu movimentos posteriores. O parecer sobre esta contagem não valida o saldo atual nem reaplica ajustes.";
  return context.reconciliationApplied
    ? "Contagem já conciliada. A revisão facultativa não repete a movimentação."
    : "A conciliação depende da política configurada e desta referência de estoque ainda válida.";
}
function CountFacts({ data }: { data: SupplyDocument }) {
  const context = data.balanceReview!;
  return (
    <div className="space-y-3 text-sm">
      <p>
        Contador efetivo:{" "}
        <strong>{context.counter.name ?? "Autoria não disponível"}</strong> ·
        contagem {context.countVersion ?? "não identificada"}
      </p>
      {context.counter.source === "current_profile" ? (
        <p>Nome atual do cadastro; o nome histórico não foi preservado.</p>
      ) : null}
      {context.counter.recordedAt ? (
        <p>
          Registro da contagem: {formatBrazilDate(context.counter.recordedAt)}
        </p>
      ) : null}
      <p>Versão documental: {data.version}</p>
      <div>
        <h4 className="font-semibold">Observações originais de quem contou</h4>
        <p className="whitespace-pre-wrap wrap-break-word">
          {context.notes || "Nenhuma observação registrada."}
        </p>
      </div>
      <p>
        {["cancelled", "rejected"].includes(data.status)
          ? "Consulta histórica de balanço encerrado. A revisão não inicia uma nova conciliação."
          : data.status === "submitted" && context.referenceState !== "current"
            ? "A referência desta contagem não permite concluir a conciliação. É necessário um reconto autorizado; a referência original permanece preservada."
            : referenceLabel(context)}
      </p>
      <ul className="space-y-2">
        {data.lines.map((line) => (
          <li key={line.id}>
            {line.name_snapshot}: contado{" "}
            {formatQuantity(line.quantity, line.unit_snapshot)}; referência{" "}
            {formatQuantity(
              line.metadata.expectedQuantity as
                | string
                | number
                | null
                | undefined,
              line.unit_snapshot,
            )}
            .
          </li>
        ))}
      </ul>
    </div>
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
    consulting?: boolean;
    opener: HTMLElement;
  } | null>(null);
  const [message, setMessage] = useState("");
  const resultRef = useRef<HTMLHeadingElement>(null),
    focusAfterSuccessRef = useRef(false);
  useEffect(() => {
    if (!editor && focusAfterSuccessRef.current) {
      focusAfterSuccessRef.current = false;
      // Finish the drawer's focus handoff before selecting the confirmed result.
      const frame = requestAnimationFrame(() => resultRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [editor]);
  const context = data.balanceReview;
  const countEvents = data.events
    .filter((event) =>
      ["bal.issued", "bal.submit", "bal.recount"].includes(event.action),
    )
    .sort((a, b) => a.version - b.version);
  if (!context)
    return (
      <Notice>
        Referência de revisão indisponível. Consulte novamente o balanço;
        nenhuma aprovação foi presumida.
      </Notice>
    );
  function close() {
    setEditor(null);
    onEditingChange(false);
    onRefresh();
  }
  return (
    <section
      className="ui-card space-y-4"
      aria-labelledby="balance-review-heading"
    >
      <h2 ref={resultRef} tabIndex={-1} id="balance-review-heading">
        Contagem e revisão
      </h2>
      {message ? <Notice>{message}</Notice> : null}
      <CountFacts data={data} />
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
              className="rounded-lg border border-(--line) p-3 text-sm space-y-2"
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
      <Notice>
        {["cancelled", "rejected"].includes(data.status)
          ? "Balanço encerrado: pareceres e observações permanecem em leitura."
          : context.reviewRequired
            ? "Este balanço usa a revisão configurada para concluir a conciliação. Cada pessoa revisa uma vez, em grupo autorizado e distinto de quem contou."
            : "Revisão facultativa. A contagem válida não entra em uma fila universal de aprovação."}
      </Notice>
      <details className="ui-card">
        <summary>Minhas decisões em preparação</summary>
        <p>
          Consulte o próprio preenchimento ou resultado, inclusive após perder
          permissão para uma nova decisão.
        </p>
        <div className="hca-toolbar">
          {balanceDocumentPurposes.map((purpose) => (
            <ActionButton
              key={purpose}
              onClick={(event) => {
                setEditor({
                  purpose,
                  consulting: true,
                  opener: event.currentTarget,
                });
                onEditingChange(true);
              }}
            >
              Consultar preparação: {balanceDocumentLabels[purpose]}
            </ActionButton>
          ))}
        </div>
      </details>
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
      <section className="space-y-3" aria-label="Pareceres do balanço">
        <h3 className="font-semibold">Pareceres com autoria própria</h3>
        {context.reviews.map((row) => (
          <article
            className="rounded-lg border border-(--line) p-3 text-sm"
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
              {row.comment || "Parecer sem comentário adicional."}
            </p>
            <p>
              {row.reviewed_snapshot.appliedBeforeReview
                ? "Revisão posterior sem reaplicar o estoque."
                : "Revisão da contagem para conciliação, conforme política e referência."}
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
            </details>
          </article>
        ))}
        {!context.reviews.length ? (
          <p className="text-sm">Nenhum parecer independente registrado.</p>
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
      {editor ? (
        <BalanceDocumentPreparation
          key={
            workspace.userId +
            ":" +
            data.care_recipient_id +
            ":" +
            data.id +
            ":" +
            editor.purpose +
            ":" +
            Boolean(editor.consulting)
          }
          context={workspace}
          patientId={data.care_recipient_id}
          documentId={data.id}
          purpose={editor.purpose}
          consulting={editor.consulting}
          restoreFocusTo={editor.opener}
          restoreFocusFallbackRef={resultRef}
          onClose={close}
          onCommitted={() => {
            setMessage(
              "Parecer registrado com autoria própria. As observações da contagem foram preservadas.",
            );
            focusAfterSuccessRef.current = true;
            close();
          }}
        />
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@fluentui/react-components";
import { Notice } from "@/components/workspace";
import { RecordDrawer } from "./record-drawer";
import { formatZonedDate } from "@/lib/schedules/time";
import type { BalanceDraftContent } from "@/lib/validation/creation-drafts";
import type { CreationDraftContent } from "@/types/creation-drafts";
import type { CreationDraftController } from "./use-creation-draft";

export function DraftContentSummary({
  content,
}: {
  content: CreationDraftContent | null;
}) {
  if (!content) return null;
  if ("lines" in content)
    return (
      <div className="hca-form-stack">
        {[
          ...content.lines.map((line) => ({
            ...line,
            name: line.productName,
            key: "line:" + line.productId,
          })),
          ...content.extraItems.map((line) => ({
            ...line,
            key: "extra:" + line.id,
          })),
        ].map((line) => (
          <article className="hca-record min-w-0" key={line.key}>
            <div className="hca-record-main min-w-0 wrap-anywhere">
              <strong>{line.name || "Item extra sem nome"}</strong>
              <p>
                {line.stockObservation === "unknown"
                  ? "Estoque desconhecido"
                  : line.stockObservation === "unfilled" ||
                      line.currentStock === null
                    ? "Estoque não informado"
                    : `Estoque observado: ${line.currentStock}`}
              </p>
              <small>
                Observação:{" "}
                {line.stockObservationAt
                  ? formatZonedDate(
                      line.stockObservationAt,
                      "America/Sao_Paulo",
                    )
                  : "Data não informada"}
              </small>
              {"repeatReason" in line && line.repeatReason ? (
                <p>{line.repeatReason}</p>
              ) : null}
            </div>
          </article>
        ))}
        {content.observations.length ? (
          <p className="wrap-anywhere whitespace-pre-line">
            {content.observations
              .map((value) => value || "Observação incompleta")
              .join("\n")}
          </p>
        ) : null}
        {content.remainingNeed ? (
          <p className="wrap-anywhere">
            Necessidade remanescente:{" "}
            {content.remainingNeed.reason || "Motivo incompleto"}
          </p>
        ) : null}
        {!content.lines.length && !content.extraItems.length ? (
          <p>Nenhum material selecionado.</p>
        ) : null}
      </div>
    );
  return (
    <div className="hca-form-stack">
      <p>
        {content.context.mode === "scheduled"
          ? "Contagem vinculada a plantão"
          : "Contagem sem regime de plantões"}
      </p>
      {content.materials
        .filter((material) => Object.hasOwn(content.counts, material.id))
        .map((material) => (
          <article className="hca-record min-w-0" key={material.id}>
            <div className="hca-record-main min-w-0 wrap-anywhere">
              <strong>{material.name}</strong>
              <p>
                Contagem: {content.counts[material.id] || "Não informada"}{" "}
                {material.unit}
              </p>
              <small>
                Observação:{" "}
                {content.observationTimes[material.id]
                  ? formatZonedDate(
                      content.observationTimes[material.id],
                      "America/Sao_Paulo",
                    )
                  : "Data não informada"}
              </small>
            </div>
          </article>
        ))}
      {content.notes ? <p className="wrap-anywhere">{content.notes}</p> : null}
    </div>
  );
}

export function CreationDraftPanel({
  draft,
  current,
  patientName,
  resumeHref,
  disabled = false,
}: {
  draft: CreationDraftController;
  current: CreationDraftContent;
  patientName: string;
  resumeHref?: string;
  disabled?: boolean;
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  if (!draft.active) return null;
  const saved = draft.offered ?? draft.base;
  return (
    <section
      className="ui-card hca-form-stack hca-draft-panel min-w-0"
      aria-label="Rascunho privado"
    >
      <h2 className="text-lg font-semibold">
        Seu rascunho privado · {patientName}
      </h2>
      <p>
        {draft.consumed
          ? "O resultado oficial deste preenchimento já está disponível."
          : "Salvar este preenchimento não gera protocolo, ciência ou movimentação de estoque."}
      </p>
      {draft.loading ? (
        <Notice>Consultando seu rascunho no servidor…</Notice>
      ) : null}
      {draft.loadError ? (
        <Notice error>
          {draft.loadError}
          <Button onClick={draft.reload} disabled={draft.busy}>
            Consultar novamente
          </Button>
        </Notice>
      ) : null}
      {draft.error ? <Notice error>{draft.error}</Notice> : null}
      {draft.message ? <Notice>{draft.message}</Notice> : null}
      {saved ? (
        <p>
          {saved.kind} · Revisão {saved.revision} · salvo no servidor em{" "}
          {formatZonedDate(saved.savedAt, "America/Sao_Paulo")} ·
          America/Sao_Paulo
        </p>
      ) : null}
      {draft.pending ? (
        <>
          <Notice>
            A resposta desta tentativa ainda não foi confirmada. Recupere o
            mesmo comando antes de editar ou descartar.
          </Notice>
          {draft.pending.content ? (
            <DraftContentSummary content={draft.pending.content} />
          ) : null}
          <Button
            appearance="primary"
            disabled={draft.busy || disabled}
            onClick={() => void draft.recover()}
          >
            Recuperar salvamento ou descarte
          </Button>
        </>
      ) : null}
      {draft.consumed ? (
        <>
          <Notice>
            Este rascunho já foi usado em uma ficha. Consulte o resultado antes
            de iniciar outro preenchimento.
          </Notice>
          <Link
            className="ui-button ui-button-primary"
            prefetch={false}
            href={
              (draft.consumed.kind === "REQ" ? "/historico/" : "/documentos/") +
              draft.consumed.consumedDocumentId
            }
          >
            Abrir ficha concluída
          </Link>
          <Button
            disabled={draft.busy || !!draft.pending || disabled}
            onClick={() => void draft.acknowledge()}
          >
            Confirmar resultado e começar novo preenchimento
          </Button>
        </>
      ) : null}
      {draft.offered?.state === "active" && !draft.pending ? (
        <>
          <DraftContentSummary content={draft.offered.content} />
          <div className="hca-toolbar">
            {resumeHref ? (
              <Link
                className="ui-button ui-button-primary"
                href={resumeHref}
                prefetch={false}
              >
                Continuar rascunho
              </Link>
            ) : (
              <Button
                appearance="primary"
                disabled={draft.busy || disabled}
                onClick={() => draft.resume()}
              >
                Continuar rascunho
              </Button>
            )}
          </div>
        </>
      ) : null}
      {draft.conflict && !draft.consumed ? (
        <>
          <Notice>
            Outra edição mudou o rascunho. Sua edição foi preservada. Compare os
            valores antes de escolher.
          </Notice>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <section className="min-w-0" aria-label="Minha edição">
              <h3>Minha edição</h3>
              <DraftContentSummary content={current} />
            </section>
            <section className="min-w-0" aria-label="Versão salva no servidor">
              <h3>Versão salva no servidor</h3>
              {draft.compared ? (
                draft.comparison ? (
                  <>
                    <p>
                      Revisão {draft.comparison.revision} ·{" "}
                      {formatZonedDate(
                        draft.comparison.savedAt,
                        "America/Sao_Paulo",
                      )}
                    </p>
                    <DraftContentSummary content={draft.comparison.content} />
                  </>
                ) : (
                  <p>O rascunho foi descartado no servidor.</p>
                )
              ) : (
                <Button
                  disabled={draft.busy}
                  onClick={() => void draft.compare()}
                >
                  Consultar versão para comparar
                </Button>
              )}
            </section>
          </div>
          <div className="hca-toolbar">
            <Button
              disabled={!draft.compared || draft.busy || disabled}
              onClick={draft.keepLocal}
            >
              Manter minha edição para salvar nova revisão
            </Button>
            {draft.comparison?.state === "active" ? (
              <Button
                disabled={draft.busy || disabled}
                onClick={() => draft.resume(draft.comparison)}
              >
                Usar versão salva no servidor
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
      {draft.base?.state === "active" &&
      !draft.blocked &&
      JSON.stringify(current) !== JSON.stringify(draft.base.content) ? (
        <p>Sua edição atual ainda não foi salva no servidor.</p>
      ) : null}
      {saved?.state === "active" && !draft.pending && !draft.conflict ? (
        <Button
          disabled={draft.busy || disabled}
          onClick={(event) => {
            setTrigger(event.currentTarget);
            setConfirmDiscard(true);
          }}
        >
          Descartar e começar nova
        </Button>
      ) : null}
      {confirmDiscard ? (
        <RecordDrawer
          title="Descartar rascunho privado"
          busy={draft.busy}
          preventClose={!!draft.pending}
          trackChanges={false}
          restoreFocusTo={trigger}
          onClose={() => setConfirmDiscard(false)}
        >
          <div className="hca-form-stack">
            {draft.error ? <Notice error>{draft.error}</Notice> : null}
            {draft.pending ? (
              <Notice>
                A resposta do descarte ainda não foi confirmada.
                <Button
                  disabled={draft.busy || disabled}
                  onClick={async () => {
                    if (await draft.recover()) setConfirmDiscard(false);
                  }}
                >
                  Recuperar descarte
                </Button>
              </Notice>
            ) : null}
            <p>
              Você está descartando somente seu preenchimento privado de{" "}
              {saved?.kind} para {patientName}.
            </p>
            <DraftContentSummary content={saved?.content ?? null} />
            <Notice>
              Fichas emitidas, arquivos oficiais e seu histórico serão
              preservados.
            </Notice>
            <Button
              appearance="primary"
              disabled={disabled || !!draft.pending}
              onClick={async () => {
                if (await draft.discard()) setConfirmDiscard(false);
              }}
            >
              Confirmar descarte do rascunho
            </Button>
            <Button
              disabled={draft.busy || !!draft.pending}
              onClick={() => setConfirmDiscard(false)}
            >
              Continuar preenchimento
            </Button>
          </div>
        </RecordDrawer>
      ) : null}
    </section>
  );
}

export function BalanceObservationTimes({
  content,
}: {
  content: BalanceDraftContent;
}) {
  return (
    <section
      className="hca-form-stack"
      aria-label="Datas das observações recuperadas"
    >
      <h3>Quando as quantidades foram observadas</h3>
      <p>
        Retomar um preenchimento conserva a data declarada; confira se os
        valores ainda correspondem à contagem física.
      </p>
      {content.materials
        .filter((material) => Object.hasOwn(content.counts, material.id))
        .map((material) => (
          <p className="wrap-anywhere" key={material.id}>
            {material.name}:{" "}
            {content.observationTimes[material.id]
              ? formatZonedDate(
                  content.observationTimes[material.id],
                  "America/Sao_Paulo",
                )
              : "Data não informada"}
          </p>
        ))}
    </section>
  );
}

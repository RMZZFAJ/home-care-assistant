"use client";

import type { ReactNode } from "react";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import type { PreparationAttempt, useScopedPreparation } from "./use-scoped-preparation";

export type PreparationEditorState<Fields extends object, Reference, Attempt extends PreparationAttempt<object>, Outcome> =
  ReturnType<typeof useScopedPreparation<Fields, Reference, Attempt, Outcome>>;

export function PreparationFeedback<Fields extends object, Reference, Attempt extends PreparationAttempt<object>, Outcome>({ editor, onClose, outcomeText, compareFields,
  retryLabel = "Enviar a mesma tentativa", uncertaintyText, writable = true }: {
  editor: PreparationEditorState<Fields, Reference, Attempt, Outcome>;
  onClose?: () => void;
  outcomeText: (outcome: Outcome) => string;
  compareFields: (fields: Fields) => ReactNode;
  retryLabel?: string;
  uncertaintyText?: string;
  writable?: boolean;
}) {
  return <>
    {editor.error ? <Notice error>{editor.error}</Notice> : null}
    {editor.message ? <Notice>{editor.message}</Notice> : null}
    {editor.pending ? <div className="hca-attention">
      <p>{uncertaintyText ?? "Há uma tentativa aguardando confirmação. Consulte o comprovante ou envie a mesma tentativa."}</p>
      <div className="hca-toolbar">
        <ActionButton type="button" onClick={() => { if (editor.pending) void editor.run(editor.pending, "read"); }}>Consultar comprovante</ActionButton>
        <ActionButton type="button" onClick={() => { if (editor.pending) void editor.run(editor.pending, "retry"); }}>{retryLabel}</ActionButton>
        {onClose ? <ActionButton type="button" onClick={onClose}>Fechar e recuperar depois</ActionButton> : null}
      </div>
    </div> : null}
    {!editor.snapshot && !editor.pending && writable ? editor.error
      ? <ActionButton type="button" onClick={editor.retryLoad}>Consultar preenchimento novamente</ActionButton>
      : <LoadingIndicator label="Consultando preenchimento privado" /> : null}
    {writable && editor.conflict ? <div className="hca-attention">
      <p>Compare a revisão salva com os campos deste editor antes de prosseguir.</p>
      {editor.comparison ? <>
        {editor.comparison.draft?.fields ? compareFields(editor.comparison.draft.fields)
          : <p>{editor.comparison.draft?.state === "consumed" ? "Já existe uma confirmação para este preenchimento." : "Não há preenchimento privado salvo."}</p>}
        <div className="hca-toolbar">
          <ActionButton type="button" onClick={() => editor.applyComparison(false)}>Carregar revisão salva</ActionButton>
          {editor.comparison.draft?.state !== "consumed" ? <ActionButton type="button" onClick={() => editor.applyComparison(true)}>Manter meus campos</ActionButton> : null}
        </div>
      </> : <ActionButton type="button" onClick={() => void editor.compare()}>Comparar com a revisão salva</ActionButton>}
    </div> : null}
    {writable && editor.draft?.state === "consumed" && !editor.pending ? <div className="hca-attention">
      <Notice>{outcomeText(editor.draft.outcome)}</Notice>
      <ActionButton type="button" disabled={editor.conflict} onClick={() => editor.start("acknowledge")}>Iniciar outro preenchimento</ActionButton>
    </div> : null}
    {writable && editor.confirmDiscard ? <div className="hca-attention">
      <p>Descartar o preenchimento privado salvo nesta área?</p>
      <div className="hca-toolbar">
        <ActionButton type="button" onClick={() => editor.setConfirmDiscard(false)}>Continuar preenchendo</ActionButton>
        <ActionButton type="button" disabled={!!editor.pending || editor.conflict} onClick={() => editor.start("discard")}>Confirmar descarte</ActionButton>
      </div>
    </div> : null}
  </>;
}

export function PreparationDraftButtons<Fields extends object, Reference, Attempt extends PreparationAttempt<object>, Outcome>({ editor, hash }: {
  editor: PreparationEditorState<Fields, Reference, Attempt, Outcome>;
  hash?: string | null;
}) {
  const sourceHash = hash === undefined ? editor.reviewedHash : hash;
  return <>
    <ActionButton type="button" disabled={editor.locked || !sourceHash || !editor.dirty} onClick={() => editor.start("save", sourceHash)}>
      Salvar preenchimento privado
    </ActionButton>
    {editor.draft?.state === "active" ? <ActionButton type="button" variant="quiet" disabled={editor.locked} onClick={() => editor.setConfirmDiscard(true)}>
      Descartar preenchimento salvo
    </ActionButton> : null}
  </>;
}

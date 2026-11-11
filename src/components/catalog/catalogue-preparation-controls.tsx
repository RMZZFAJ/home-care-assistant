"use client";

import type { ReactNode } from "react";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import { Notice } from "@/components/workspace";
import type { CatalogueInput, CatalogueOutcome } from "@/lib/validation/catalogue-preparation";
import type { useCataloguePreparation } from "./use-catalogue-preparation";

export type CatalogueEditorState<Fields extends CatalogueInput, Reference> =
  ReturnType<typeof useCataloguePreparation<Fields, Reference>>;

export function CataloguePreparationFeedback<Fields extends CatalogueInput, Reference>({ editor, onClose, outcomeText, compareFields,
  retryLabel = "Enviar a mesma tentativa", uncertaintyText, writable = true }: {
  editor: CatalogueEditorState<Fields, Reference>;
  onClose: () => void;
  outcomeText: (outcome: CatalogueOutcome) => string;
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
        <ActionButton type="button" onClick={onClose}>Fechar e recuperar depois</ActionButton>
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
      <p>{outcomeText(editor.draft.outcome)}</p>
      <ActionButton type="button" disabled={editor.conflict} onClick={() => editor.start("acknowledge")}>Iniciar outro preenchimento</ActionButton>
    </div> : null}
    {writable && editor.confirmDiscard ? <div className="hca-attention">
      <p>Descartar o preenchimento privado salvo neste catálogo?</p>
      <div className="hca-toolbar">
        <ActionButton type="button" onClick={() => editor.setConfirmDiscard(false)}>Continuar preenchendo</ActionButton>
        <ActionButton type="button" disabled={!!editor.pending || editor.conflict} onClick={() => editor.start("discard")}>Confirmar descarte</ActionButton>
      </div>
    </div> : null}
  </>;
}

export function CatalogueDraftButtons<Fields extends CatalogueInput, Reference>({ editor, hash }: {
  editor: CatalogueEditorState<Fields, Reference>;
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

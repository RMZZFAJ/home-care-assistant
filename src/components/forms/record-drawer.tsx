"use client";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Dialog, Drawer } from "@/components/ui/overlays";

/** Contextual editing keeps the list and its filters in place. */
export function RecordDrawer({ title, children, recovery, onClose, busy = false, restoreFocusTo, restoreFocusFallbackRef, trackChanges = true, preventClose = false, hasUnsavedChanges, keyboardScrollable = false, uncertainOutcome = false, exitDialog = false, modal = false, kicker, subtitle, popupClassName, footer }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean; restoreFocusTo?: HTMLElement | null; restoreFocusFallbackRef?: RefObject<HTMLElement | null>; trackChanges?: boolean; preventClose?: boolean;
  recovery?: ReactNode | ((requestClose: () => void) => ReactNode);
  hasUnsavedChanges?: boolean;
  keyboardScrollable?: boolean;
  uncertainOutcome?: boolean;
  exitDialog?: boolean;
  modal?: boolean;
  kicker?: string;
  subtitle?: string;
  popupClassName?: string;
  footer?: (requestClose: () => void) => ReactNode;
}) {
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const formRef = useRef<HTMLFieldSetElement>(null);
  const editFocusRef = useRef<HTMLElement | null>(null);
  const restoreFrameRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    // A replacement effect (including Strict Mode's probe) is not a close.
    if (restoreFrameRef.current !== undefined) cancelAnimationFrame(restoreFrameRef.current);
    const fallback = restoreFocusFallbackRef?.current;
    return () => { restoreFrameRef.current = requestAnimationFrame(() => {
      if (restoreFocusTo?.isConnected && !restoreFocusTo.matches(':disabled,[aria-disabled="true"]')) restoreFocusTo.focus();
      else if (fallback?.isConnected) fallback.focus();
    }); };
  }, [restoreFocusTo,restoreFocusFallbackRef]);
  const requestClose = () => { if (!busy && !preventClose) { if (uncertainOutcome || (hasUnsavedChanges ?? dirty)) setDiscard(true); else onClose(); } };
  const continueEditing = () => {
    if (busy || preventClose) return;
    setDiscard(false);
    const restoreEditing = () => {
    const form = formRef.current, previous = editFocusRef.current;
    const available = (element: HTMLElement) => element.getClientRects().length > 0 && !element.matches(':disabled,[aria-disabled="true"]') && !element.closest('[inert],[hidden],[aria-hidden="true"]');
    const target = previous && previous !== form && form?.contains(previous) && available(previous)
      ? previous
      : Array.from(form?.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea, button, [tabindex="0"]') ?? []).find(available);
    // The form stays mounted. Move focus before removing the warning's button.
    (target ?? form)?.focus();
    };
    if (exitDialog) requestAnimationFrame(restoreEditing); else restoreEditing();
  };
  const Surface = modal ? Dialog : Drawer;
  return <Surface open title={title} kicker={kicker} subtitle={subtitle} popupClassName={popupClassName} footer={footer?.(requestClose)} closeLabel="Fechar edição" onClose={requestClose} closeDisabled={busy || preventClose} finalFocus={false} keyboardScrollable={keyboardScrollable}>
      {typeof recovery === "function" ? recovery(requestClose) : recovery}
      {exitDialog ? <Dialog open={discard} title={uncertainOutcome ? "Fechar sem resultado confirmado?" : "Sair sem concluir?"} onClose={continueEditing} finalFocus={false}>
        <p>{uncertainOutcome ? "O resultado da tentativa continua sem confirmação. Fechar descarta os campos desta tela. Procure a supervisão e confira o resultado antes de repetir a ação." : "O preenchimento desta ação será descartado. Fechar não confirma a alteração."}</p>
        <div className="hca-toolbar"><button type="button" className="hca-control" disabled={busy || preventClose} onClick={continueEditing}>Voltar ao preenchimento</button><button type="button" className="hca-control hca-control--primary" disabled={busy || preventClose} onClick={() => { if (!busy && !preventClose) onClose(); }}>{uncertainOutcome ? "Fechar e procurar supervisão" : "Sair e descartar"}</button></div>
      </Dialog> : discard ? <div className="hca-attention" role="alert"><p>Há alterações ainda não salvas.</p><div className="hca-toolbar"><button type="button" className="hca-control" disabled={busy || preventClose} onClick={continueEditing}>Continuar editando</button><button type="button" className="hca-control" disabled={busy || preventClose} onClick={() => { if (!busy && !preventClose) onClose(); }}>Descartar alterações</button></div></div> : null}
      <fieldset ref={formRef} tabIndex={-1} className="min-w-0" disabled={busy} onFocusCapture={event => { editFocusRef.current = event.target; }} onChange={() => { if (trackChanges) setDirty(true); }}>{children}</fieldset>
  </Surface>;
}

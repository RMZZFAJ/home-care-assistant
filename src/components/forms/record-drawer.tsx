"use client";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, MessageBar, MessageBarBody, OverlayDrawer } from "@fluentui/react-components";
import { Icon } from "@/components/ui/primitives";

/** Contextual editing keeps the list and its filters in place. */
export function RecordDrawer({ title, children, recovery, onClose, busy = false, restoreFocusTo, restoreFocusFallbackRef, trackChanges = true, preventClose = false }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean; restoreFocusTo?: HTMLElement | null; restoreFocusFallbackRef?: RefObject<HTMLElement | null>; trackChanges?: boolean; preventClose?: boolean;
  recovery?: ReactNode;
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
  const requestClose = () => { if (!busy && !preventClose) { if (dirty) setDiscard(true); else onClose(); } };
  const continueEditing = () => {
    if (busy || preventClose) return;
    setDiscard(false);
    const form = formRef.current, previous = editFocusRef.current;
    const available = (element: HTMLElement) => element.getClientRects().length > 0 && !element.matches(':disabled,[aria-disabled="true"]') && !element.closest('[inert],[hidden],[aria-hidden="true"]');
    const target = previous && form?.contains(previous) && available(previous)
      ? previous
      : Array.from(form?.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea, button, [tabindex="0"]') ?? []).find(available);
    // The form stays mounted. Move focus before removing the warning's button.
    (target ?? form)?.focus();
  };
  return <OverlayDrawer open aria-label={title} position="end" size="medium" className="hca-record-drawer" onOpenChange={(_, data) => { if (!data.open) requestClose(); }}>
    <DrawerHeader><DrawerHeaderTitle action={<Button appearance="subtle" icon={<Icon name="close" />} aria-label="Fechar edição" disabled={busy || preventClose} onClick={requestClose} />}>{title}</DrawerHeaderTitle></DrawerHeader>
    <DrawerBody>
      {recovery}
      {discard ? <MessageBar layout="multiline" intent="warning" role="alert"><MessageBarBody>Há alterações ainda não salvas.<div className="hca-toolbar"><Button disabled={busy || preventClose} onClick={continueEditing}>Continuar editando</Button><Button disabled={busy || preventClose} onClick={() => { if (!busy && !preventClose) onClose(); }}>Descartar alterações</Button></div></MessageBarBody></MessageBar> : null}
      <fieldset ref={formRef} tabIndex={-1} className="min-w-0" disabled={busy} onFocusCapture={event => { editFocusRef.current = event.target; }} onChange={() => { if (trackChanges) setDirty(true); }}>{children}</fieldset>
    </DrawerBody>
  </OverlayDrawer>;
}

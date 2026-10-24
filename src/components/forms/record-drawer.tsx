"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, MessageBar, MessageBarBody, OverlayDrawer } from "@fluentui/react-components";
import { Icon } from "@/components/ui/primitives";

/** Contextual editing keeps the list and its filters in place. */
export function RecordDrawer({ title, children, onClose, busy = false, restoreFocusTo, trackChanges = true, preventClose = false }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean; restoreFocusTo?: HTMLElement | null; trackChanges?: boolean; preventClose?: boolean;
}) {
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  useEffect(() => () => {
    if (restoreFocusTo?.isConnected) requestAnimationFrame(() => restoreFocusTo.focus());
  }, [restoreFocusTo]);
  const requestClose = () => { if (!busy && !preventClose) { if (dirty) setDiscard(true); else onClose(); } };
  return <OverlayDrawer open position="end" size="medium" className="hca-record-drawer" onOpenChange={(_, data) => { if (!data.open) requestClose(); }}>
    <DrawerHeader><DrawerHeaderTitle action={<Button appearance="subtle" icon={<Icon name="close" />} aria-label="Fechar edição" disabled={busy || preventClose} onClick={requestClose} />}>{title}</DrawerHeaderTitle></DrawerHeader>
    <DrawerBody>
      {discard ? <MessageBar intent="warning" role="alert"><MessageBarBody>Há alterações ainda não salvas.<div className="hca-toolbar"><Button onClick={() => setDiscard(false)}>Continuar editando</Button><Button onClick={onClose}>Descartar alterações</Button></div></MessageBarBody></MessageBar> : null}
      <fieldset className="min-w-0" disabled={busy} onChange={() => { if (trackChanges) setDirty(true); }}>{children}</fieldset>
    </DrawerBody>
  </OverlayDrawer>;
}

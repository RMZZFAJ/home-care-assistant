"use client";
import { useRef, useState } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import type { DocumentChange } from "@/lib/documents/document-changes";

export function DocumentChangeFacts({ changes }: {
  changes: ReadonlyArray<{ id: string; label: string; before?: string; after: string }>;
}) {
  return <dl className="hca-document-change-list">
    {changes.map(change => <div key={change.id}>
      <dt>{change.label}</dt>
      <dd>{change.before !== undefined ? <>
        <del><span className="sr-only">Antes: </span>{change.before}</del>
        <Icon name="arrow" width={15} height={15} />
      </> : null}
        <strong>{change.before !== undefined ? <span className="sr-only">Agora: </span> : null}{change.after}</strong></dd>
    </div>)}
  </dl>;
}

export function DocumentFreshness({ code, changes, loading, editing, onRefresh, onReviewArrival, openedAfterRecovery, onCloseRecovery }: {
  code: string; changes: DocumentChange[]; loading: boolean; editing?: boolean; onRefresh: () => void;
  onReviewArrival?: (opener: HTMLButtonElement | null) => void;
  openedAfterRecovery?: boolean;
  onCloseRecovery?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLButtonElement>(null);
  const refreshRequestedRef = useRef(false);
  const changedArrival = changes.some(change => change.arrivalId);
  const reviewArrival = editing ? undefined : onReviewArrival;
  const close = (handoff = false) => {
    refreshRequestedRef.current = handoff;
    setOpen(false);
    if (openedAfterRecovery) onCloseRecovery?.();
  };
  const review = () => {
    refreshRequestedRef.current = false;
    setOpen(true);
  };

  return <>
    <aside className="hca-document-freshness">
      <Icon name="refresh" width={17} height={17} />
      <span role="status">{changedArrival ? "A quantidade da chegada mudou." : "Esta ficha recebeu alterações."}</span>
      <ActionButton ref={detailsRef} variant="quiet" compact onClick={review}>Ver o que mudou</ActionButton>
    </aside>
    <Dialog open={open || Boolean(openedAfterRecovery)} title={changedArrival ? "A quantidade recebida mudou" : "Esta ficha recebeu alterações"}
      kicker={changedArrival ? "Chegada atualizada" : "Ficha atualizada"} subtitle={code}
      headingIcon="refresh" popupClassName="hca-document-change-dialog"
      onClose={() => close()} finalFocus={() => refreshRequestedRef.current ? false : detailsRef.current}
      footer={<>
        <ActionButton variant={reviewArrival ? "secondary" : "quiet"} onClick={() => close()}>
          {reviewArrival ? <Icon name="link" width={16} height={16} /> : null}
          {editing ? "Voltar à operação" : reviewArrival ? "Consultar compra" : "Voltar à ficha"}
        </ActionButton>
        {!editing ? <ActionButton variant="primary" disabled={loading} onClick={() => {
          close(true);
          if (reviewArrival) reviewArrival(detailsRef.current);
          else onRefresh();
        }}>{reviewArrival ? "Revisar chegada" : loading ? "Atualizando…" : "Atualizar agora"}</ActionButton> : null}
      </>}>
      {changes.length ? <DocumentChangeFacts changes={changes} /> : null}
      <p className="hca-document-change-note">{editing
        ? "Seu preenchimento foi preservado. A referência da operação será conferida antes da confirmação."
        : changedArrival
          ? "A conferência usa as quantidades da versão atual da chegada. A entrada no estoque familiar depende da aprovação."
          : "Atualize a ficha para consultar as informações atuais e gerar um novo PDF. Os exemplares emitidos continuam disponíveis."}</p>
    </Dialog>
  </>;
}

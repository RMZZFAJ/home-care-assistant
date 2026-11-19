"use client";
import { useRef, useState } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import type { DocumentChange } from "@/lib/documents/document-changes";

export function DocumentFreshness({ code, changes, loading, editing, onRefresh }: {
  code: string; changes: DocumentChange[]; loading: boolean; editing?: boolean; onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLButtonElement>(null);
  const refreshRequestedRef = useRef(false);
  const review = () => {
    refreshRequestedRef.current = false;
    setOpen(true);
  };

  return <>
    <aside className="hca-document-freshness">
      <Icon name="refresh" width={17} height={17} />
      <span role="status">Esta ficha recebeu alterações.</span>
      <ActionButton ref={detailsRef} variant="quiet" compact onClick={review}>Ver o que mudou</ActionButton>
    </aside>
    <Dialog open={open} title="Esta ficha recebeu alterações" kicker="Ficha atualizada" subtitle={code}
      headingIcon="refresh" popupClassName="hca-document-change-dialog"
      onClose={() => setOpen(false)} finalFocus={() => refreshRequestedRef.current ? false : detailsRef.current}
      footer={<>
        <ActionButton variant="quiet" onClick={() => setOpen(false)}>{editing ? "Voltar à operação" : "Voltar à ficha"}</ActionButton>
        {!editing ? <ActionButton variant="primary" disabled={loading} onClick={() => {
          refreshRequestedRef.current = true;
          setOpen(false);
          onRefresh();
        }}>{loading ? "Atualizando…" : "Atualizar agora"}</ActionButton> : null}
      </>}>
      {changes.length ? <dl className="hca-document-change-list">
        {changes.map(change => <div key={change.id}>
          <dt>{change.label}</dt>
          <dd><del><span className="sr-only">Antes: </span>{change.before}</del>
            <Icon name="arrow" width={15} height={15} />
            <strong><span className="sr-only">Agora: </span>{change.after}</strong></dd>
        </div>)}
      </dl> : null}
      <p className="hca-document-change-note">{editing
        ? "Seu preenchimento foi preservado. A referência da operação será conferida antes da confirmação."
        : "Atualize a ficha para consultar as informações atuais e gerar um novo PDF. Os exemplares emitidos continuam disponíveis."}</p>
    </Dialog>
  </>;
}

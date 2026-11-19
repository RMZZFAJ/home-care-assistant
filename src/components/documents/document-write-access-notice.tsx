"use client";

import { useState, type RefObject } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";

export function useDocumentWriteAccess(allowed: boolean) {
  const [access, setAccess] = useState({ allowed, open: false });
  if (access.allowed !== allowed) setAccess({ allowed, open: !allowed });
  return {
    open: access.open,
    onClose: () => setAccess({ allowed, open: false }),
  };
}

export function DocumentWriteAccessNotice({ open, onClose, draftSaved, consultationRef }: {
  open: boolean; onClose: () => void; draftSaved: boolean; consultationRef?: RefObject<HTMLAnchorElement | null>;
}) {
  return <Dialog open={open} onClose={onClose} title="Seu acesso agora é de consulta" kicker="Aviso de acesso"
    subtitle="Sua permissão para editar esta ficha foi retirada." headingIcon="lock"
    popupClassName="hca-document-change-dialog hca-access-notice-dialog" finalFocus={consultationRef}
    footer={<ActionButton variant="primary" onClick={onClose}>Consultar ficha</ActionButton>}>
    <p className="hca-document-change-note">{draftSaved
      ? "O último rascunho salvo poderá ser retomado se a permissão voltar."
      : "Seu preenchimento permanece nesta página. Você poderá continuar se a permissão voltar enquanto ela estiver aberta."}
    </p>
  </Dialog>;
}

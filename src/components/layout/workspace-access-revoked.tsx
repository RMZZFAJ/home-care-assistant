"use client";

import { useRef, useState } from "react";
import { ActionButton, ActionLink } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { hasOwnGovernanceProposalAttempt } from "@/components/admin/governance-proposal-operation";

/** Only the neutral frame remains mounted after a confirmed loss of membership. */
export function WorkspaceAccessRevoked({ userId, patientId }: { userId: string; patientId: string }) {
  const [open, setOpen] = useState(true);
  const [hasDecision, setHasDecision] = useState(false);
  const returnRef = useRef<HTMLAnchorElement>(null);
  const close = () => {
    setHasDecision(hasOwnGovernanceProposalAttempt(userId, patientId));
    setOpen(false);
  };

  return <div className="hca-revoked-workspace">
    <header className="hca-revoked-header">
      <span className="hca-revoked-brand-mark"><Icon name="heart" width={20} height={20} /></span>
      <strong>Home Care Assistant</strong>
    </header>
    <main id="workspace-content" className="hca-revoked-content">
      <Icon name="lock" width={25} height={25} />
      <h1>Acesso encerrado</h1>
      <p>Esta sessão não tem mais acesso a esta residência.</p>
      {!open ? <div className="hca-form-stack">
        <ActionLink href="/" ref={returnRef}>Voltar ao início</ActionLink>
        {hasDecision ? <ActionLink href="/perfil">Conferir decisão na minha conta</ActionLink> : null}
      </div> : null}
    </main>
    <Dialog open={open} title="O acesso à residência foi revogado" kicker="Aviso de acesso"
      subtitle="Os dados desta residência deixaram de estar disponíveis." headingIcon="lock"
      popupClassName="hca-document-change-dialog hca-access-notice-dialog hca-revoked-dialog" onClose={close}
      finalFocus={returnRef} footer={<ActionButton variant="primary" onClick={close}>Entendi</ActionButton>}>
      <p className="hca-document-change-note">Se precisar de acesso novamente, fale com o administrador do paciente.</p>
    </Dialog>
  </div>;
}

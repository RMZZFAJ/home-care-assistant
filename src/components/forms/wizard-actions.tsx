"use client";
import type { ReactNode } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/primitives";
import type { CreationDraftContent } from "@/types/creation-drafts";
import type { CreationDraftController } from "./use-creation-draft";

type DraftStatus = { draft: CreationDraftController; current: CreationDraftContent };

export function SupplyWizardFooter({ back, children, status }: { back: ReactNode; children: ReactNode; status?: DraftStatus }) {
  const draft = status?.draft;
  let text = "";
  let saved = false;
  if (status && draft?.active) {
    if (draft.backgroundBusy || (draft.busy && draft.pending?.action === "save")) text = "Salvando rascunho…";
    else if (draft.error || draft.loadError || draft.pending || draft.conflict) text = "Verifique o rascunho";
    else if (!draft.busy && draft.base?.state === "active") {
      saved = JSON.stringify(draft.base.content) === JSON.stringify(status.current) &&
        JSON.stringify(draft.base.navigation) === JSON.stringify(draft.navigation);
      text = saved ? "Último rascunho salvo." : "Alterações a salvar";
    }
  }
  return <footer className="hca-supply-wizard-footer">
    <div className="hca-supply-wizard-footer-actions">
      {back}
      <div>{children}</div>
    </div>
    <p className="hca-supply-wizard-status" role="status">{saved ? <Icon name="check" width={12} height={12} /> : null}{text}</p>
  </footer>;
}

export function WizardActions({ step, total, saving, draftBusy = false, uncertain, blocked = false, onBack, onDraft, onNext, onFinish, finishLabel = "Confirmar e concluir", supplyStatus }: {
  step: number; total: number; saving: boolean; draftBusy?: boolean; uncertain: boolean; blocked?: boolean;
  onBack: () => void; onDraft: () => void; onNext: () => void; onFinish: () => void; finishLabel?: string;
  supplyStatus?: DraftStatus;
}) {
  const back = <ActionButton type="button" variant={supplyStatus ? "quiet" : undefined} disabled={step === 0 || saving || uncertain} onClick={onBack}>
    {supplyStatus ? <Icon name="back" width={14} height={14} /> : null}Voltar
  </ActionButton>;
  const actions = <>
    <ActionButton type="button" variant={supplyStatus ? "quiet" : undefined} disabled={saving || draftBusy || uncertain} onClick={onDraft}>Salvar rascunho</ActionButton>
    {step < total - 1 ? (
      <ActionButton type="button" variant="primary" disabled={saving || uncertain || blocked} onClick={onNext}>
        {supplyStatus ? <Icon name="arrow" width={14} height={14} /> : null}
        {step === total - 2 ? "Revisar" : "Avançar"}{supplyStatus ? null : <Icon name="arrow" />}
      </ActionButton>
    ) : (
      <ActionButton type="button" variant="primary" disabled={saving || draftBusy || (blocked && !uncertain)} onClick={onFinish}>
        {supplyStatus && !saving && !uncertain ? <Icon name="send" width={14} height={14} /> : null}
        {saving ? "Registrando…" : uncertain ? "Recuperar esta tentativa" : finishLabel}
      </ActionButton>
    )}
  </>;
  return supplyStatus ? <SupplyWizardFooter back={back} status={uncertain ? undefined : supplyStatus}>{actions}</SupplyWizardFooter>
    : <div className="hca-wizard-actions">{back}<div>{actions}</div></div>;
}

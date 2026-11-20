"use client";
import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlays";
import type { CreationDraftContent } from "@/types/creation-drafts";
import { supplyWizardCopy, supplyWizardNextLabels, type SupplyWizardKind } from "./supply-wizard-stages";
import type { CreationDraftController } from "./use-creation-draft";

type DraftStatus = { draft: CreationDraftController; current: CreationDraftContent; hasEdits: boolean };
type SupplyActions = DraftStatus & { kind: SupplyWizardKind; exitHref: string };

export function SupplyWizardFooter({ back, children, status }: {
  back: ReactNode; children: ReactNode; status?: DraftStatus;
}) {
  const draft = status?.draft;
  let text = "";
  let saved = false;
  if (status && draft?.active) {
    if (draft.backgroundBusy || (draft.busy && draft.pending?.action === "save")) text = "Salvando rascunho…";
    else if (draft.error || draft.loadError || draft.pending || draft.conflict) text = "Verifique o rascunho";
    else if (!draft.busy && !draft.blocked) {
      saved = draft.base?.state === "active" && JSON.stringify(draft.base.content) === JSON.stringify(status.current) &&
        JSON.stringify(draft.base.navigation) === JSON.stringify(draft.navigation);
      if (saved) text = "Último rascunho salvo.";
      else if (status.hasEdits) text = "Alterações a salvar";
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

function SupplyWizardExit({ supply, disabled }: { supply: SupplyActions; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { draft, current, hasEdits, exitHref } = supply;
  const busy = draft.busy || draft.backgroundBusy;

  return <>
    <ActionButton ref={exitButtonRef} variant="quiet" disabled={disabled} onClick={() => {
      if (hasEdits) setOpen(true);
      else router.push(exitHref);
    }}><Icon name="back" width={14} height={14} />Sair por agora</ActionButton>
    <Dialog open={open} title="Sair por agora?" onClose={() => setOpen(false)} closeDisabled={busy} finalFocus={exitButtonRef}>
      <p>Você pode guardar o preenchimento e continuar em outro momento.</p>
      <div className="hca-toolbar">
        <ActionButton disabled={busy} onClick={() => setOpen(false)}>Continuar editando</ActionButton>
        <ActionButton variant="primary" disabled={busy || draft.blocked} onClick={async () => {
          const saved = await draft.save(current);
          setOpen(false);
          if (saved) router.push(exitHref);
        }}>Salvar e fechar</ActionButton>
        <ActionButton disabled={busy || !!draft.pending} onClick={() => router.push(exitHref)}>Fechar sem salvar estas alterações</ActionButton>
      </div>
    </Dialog>
  </>;
}

export function WizardActions({ step, total, saving, draftBusy = false, uncertain, blocked = false, finishLabel = "Confirmar e concluir", onBack, onDraft, onNext, onFinish, supply }: {
  step: number; total: number; saving: boolean; draftBusy?: boolean; uncertain: boolean; blocked?: boolean;
  onBack: () => void; onDraft?: () => void; onNext: () => void; onFinish: () => void;
  finishLabel?: string;
  supply?: SupplyActions;
}) {
  const back = supply && step === 0 ? <SupplyWizardExit supply={supply} disabled={saving || uncertain} />
    : <ActionButton variant={supply ? "quiet" : undefined} disabled={step === 0 || saving || uncertain} onClick={onBack}>
      {supply ? <Icon name="back" width={14} height={14} /> : null}Voltar
    </ActionButton>;
  const advance = step === total - 2 ? "Revisar" : "Avançar";
  const finish = supply ? supplyWizardCopy[supply.kind].finish : finishLabel;
  const mainAction = step < total - 1 ? (
      <ActionButton type="button" variant="primary" disabled={saving || uncertain || blocked} onClick={onNext}>
        {supply ? <Icon name="arrow" width={14} height={14} /> : null}
        {supply ? supplyWizardNextLabels[step] : advance}{supply ? null : <Icon name="arrow" />}
      </ActionButton>
    ) : (
      <ActionButton type="button" variant="primary" disabled={saving || draftBusy || (blocked && !uncertain)} onClick={onFinish}>
        {supply && !saving && !uncertain ? <Icon name="send" width={14} height={14} /> : null}
        {saving ? "Registrando…" : uncertain ? "Recuperar esta tentativa" : finish}
      </ActionButton>
    );
  return supply ? <SupplyWizardFooter back={back} status={uncertain ? undefined : supply}>{mainAction}</SupplyWizardFooter>
    : <div className="hca-wizard-actions">{back}<div>{onDraft && <ActionButton disabled={saving || draftBusy || uncertain} onClick={onDraft}>Salvar rascunho</ActionButton>}{mainAction}</div></div>;
}

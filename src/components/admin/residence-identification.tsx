"use client";

import { useId, useState, type RefObject } from "react";
import { ActionButton, CheckboxField, DefinitionGrid, FormField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { residenceIdentity, type ResidenceIdentity } from "@/lib/validation/residence-administration";

export function ResidenceIdentification({ identity, initial, globalMode, review, returnFocus, onChange, onReview, onBack, onClose, onConfirm }: {
  identity: ResidenceIdentity;
  initial: ResidenceIdentity;
  globalMode: boolean;
  review: boolean;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onChange: (identity: ResidenceIdentity) => void;
  onReview: (identity: ResidenceIdentity) => void;
  onBack: () => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const formId = useId();
  const [error, setError] = useState("");
  const kicker = "Organização da residência";
  const fields = [
    { label: "Paciente", value: identity.displayName },
    { label: "Situação", value: identity.active ? "Ativa" : "Inativa" },
    ...(identity.development !== initial.development ? [{ label: "Cadastro de desenvolvimento", value: identity.development ? "Sim" : "Não" }] : []),
  ];

  if (review) return <Dialog key="review" open title="Salvar identificação?" kicker={kicker} headingIcon="home"
    finalFocus={returnFocus} onClose={onBack} popupClassName="hca-residence-identification" footer={<>
      <ActionButton onClick={onBack}>Voltar ao preenchimento</ActionButton>
      <ActionButton variant="primary" onClick={onConfirm}><Icon name="check" />{globalMode ? "Registrar proposta" : "Salvar identificação"}</ActionButton>
    </>}>
    <DefinitionGrid items={fields} />
    <p className="hca-residence-edit-hint"><Icon name="info" />{globalMode ?
      "Outro administrador da residência precisa aprovar a proposta antes de alterar o cadastro." : identity.active ?
        "O cadastro será atualizado." : "Novas operações serão suspensas. O histórico permanece disponível."}</p>
  </Dialog>;

  return <Dialog key="edit" open title="Identificação da residência" kicker={kicker} headingIcon="home"
    finalFocus={returnFocus} onClose={onClose} popupClassName="hca-residence-identification" footer={<>
      <ActionButton onClick={onClose}>Voltar</ActionButton>
      <ActionButton type="submit" form={formId} variant="primary"><Icon name="check" />Salvar identificação</ActionButton>
    </>}>
    <form id={formId} className="hca-residence-edit-form" onSubmit={event => {
      event.preventDefault();
      const result = residenceIdentity.safeParse(identity);
      if (!result.success) { setError("Informe um nome de 2 a 160 caracteres."); return; }
      setError("");
      onReview(result.data);
    }}>
      <FormField label="Nome do paciente" required error={error || undefined}>
        <TextInput value={identity.displayName} required minLength={2} maxLength={160} onChange={event => {
          setError("");
          onChange({ ...identity, displayName: event.target.value });
        }} />
      </FormField>
      <CheckboxField className="hca-setting-switch hca-residence-active-switch" role="switch" aria-label="Residência ativa"
        checked={identity.active} onChange={event => onChange({ ...identity, active: event.target.checked })}
        label={<><strong>Residência ativa</strong><small>Desativar preserva os registros existentes.</small></>} />
      <p className="hca-residence-edit-hint"><Icon name="info" />A identificação aparece nos acessos e nas novas consultas da residência.</p>
      {globalMode ? <details className="hca-residence-registration-options">
        <summary>Opções do cadastro</summary>
        <CheckboxField className="hca-setting-switch hca-residence-active-switch" role="switch" aria-label="Cadastro de desenvolvimento"
          checked={identity.development} onChange={event => onChange({ ...identity, development: event.target.checked })}
          label={<><strong>Cadastro de desenvolvimento</strong><small>Destinado exclusivamente a dados fictícios.</small></>} />
      </details> : null}
    </form>
  </Dialog>;
}

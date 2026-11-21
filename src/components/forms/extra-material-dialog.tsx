"use client";

import { useId, type FormEvent, type ReactNode } from "react";
import { ActionButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";

export function ExtraMaterialDialog({ isNew, onClose, onSubmit, submitDisabled, children }: {
  isNew: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitDisabled?: boolean;
  children: ReactNode;
}) {
  const formId = useId();
  return <Dialog open onClose={onClose} kicker="Itens extras" title={isNew ? "Adicionar item extra" : "Editar item extra"}
    popupClassName="hca-requisition-extra" subtitle="Identifique o material e confira a unidade." footer={<>
      <ActionButton onClick={onClose}>Voltar</ActionButton>
      <ActionButton type="submit" form={formId} variant="primary" disabled={submitDisabled}>
        <Icon name="check" />{isNew ? "Adicionar material" : "Salvar alteração"}
      </ActionButton>
    </>}>
    <form id={formId} className="hca-form-stack" noValidate onSubmit={onSubmit}>{children}</form>
  </Dialog>;
}

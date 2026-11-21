import type { ComponentProps, ReactNode } from "react";
import { ActionButton, FormField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";

export function WizardQuantityInput({ unit, ...input }: ComponentProps<typeof TextInput> & { unit?: string }) {
  if (!unit) return <TextInput {...input} />;
  return <span className="hca-wizard-stock-input">
    <TextInput {...input} />
    <span aria-hidden="true">{unit}</span>
  </span>;
}

export function WizardExtraButton({ inExtras, onClick }: { inExtras: boolean; onClick: () => void }) {
  return <ActionButton variant={inExtras ? "secondary" : "quiet"} compact={!inExtras} onClick={onClick}>
    <Icon name="plus" />{inExtras ? "Adicionar item extra" : "Item extra"}
  </ActionButton>;
}

export function WizardMaterialSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <FormField label="Buscar material">
    <TextInput type="search" value={value} onChange={event => onChange(event.currentTarget.value)} placeholder="Nome do material" />
  </FormField>;
}

export function WizardMaterialToolbar({ count, matches, children }: { count: number; matches?: number; children?: ReactNode }) {
  return <div className="hca-wizard-material-toolbar">
    <p role="status" aria-label="Resultado da busca e seleção de materiais">
      {matches === undefined ? null : `${matches} ${matches === 1 ? "material encontrado" : "materiais encontrados"} · `}
      {count} {count === 1 ? "material selecionado" : "materiais selecionados"}
    </p>
    {children ? <div className="hca-toolbar">{children}</div> : null}
  </div>;
}

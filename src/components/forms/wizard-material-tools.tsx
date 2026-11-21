import type { ComponentProps, ReactNode } from "react";
import { ActionButton, FormField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { MaterialReview, type MaterialReviewRow } from "@/components/documents/material-review";
import { materialCategories, type WizardMaterialCategory } from "./supply-wizard-stages";

export function WizardQuantityInput({ unit, ...input }: ComponentProps<typeof TextInput> & { unit?: string }) {
  if (!unit) return <TextInput {...input} data-wizard-quantity />;
  return <span className="hca-wizard-stock-input">
    <TextInput {...input} data-wizard-quantity />
    <span aria-hidden="true">{unit}</span>
  </span>;
}

export function focusWizardMaterial(getScope: () => HTMLElement | null, materialId: string) {
  requestAnimationFrame(() => {
    const row = getScope()?.querySelector<HTMLElement>(`[data-wizard-material="${CSS.escape(materialId)}"]`);
    if (!row) return;
    const field = row.querySelector<HTMLInputElement>("input[data-wizard-quantity]:enabled")
      ?? row.querySelector<HTMLElement>("input:enabled, button:enabled");
    field?.focus({ preventScroll: true });
    (field ?? row).scrollIntoView({ block: "center", inline: "nearest" });
  });
}

export function WizardCatalogueReview({ rows, onEdit, disabled }: {
  rows: readonly (MaterialReviewRow & { category?: string })[];
  onEdit: (category: WizardMaterialCategory, materialId: string) => void;
  disabled?: boolean;
}) {
  return materialCategories.map(category => {
    const group = rows.filter(row => row.category === category.id);
    if (!group.length) return null;
    return <section className="hca-wizard-review-group" key={category.id}>
      <h3>{category.label}</h3>
      <MaterialReview rows={group.map(row => ({
        ...row,
        icon: category.icon,
        edit: <ActionButton compact variant="quiet" disabled={disabled} aria-label={`Editar material ${row.name}`}
          onClick={() => onEdit(category.id, row.id)}><Icon name="edit" />Editar</ActionButton>,
      }))} />
    </section>;
  });
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

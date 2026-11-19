"use client";

import { useState, type FormEvent } from "react";
import { ExtraMaterialDialog } from "@/components/forms/extra-material-dialog";
import { ActionButton, FormField, Pill, SelectField, TextAreaField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { matchCatalog, normalizeCatalogText } from "@/lib/catalog-match";
import { extraMaterialUnits } from "@/lib/documents/extra-material-identity";
import { formatQuantity } from "@/lib/quantity";
import { exactQuantity } from "@/lib/validation/exact-quantity";
import { pendingPurchaseExtra, type PendingPurchaseExtra } from "@/lib/validation/pending-purchase-extras";
import type { CatalogProduct } from "@/types/documents";

type ExtraEditor = { item?: PendingPurchaseExtra };

export function PurchaseExtraItems({ items, catalogue, selected, inExtras, onChange, onChoose }: {
  items: PendingPurchaseExtra[];
  catalogue: CatalogProduct[];
  selected: Record<string, string>;
  inExtras: boolean;
  onChange: (items: PendingPurchaseExtra[]) => void;
  onChoose: (product: string, quantity: string, replace?: string) => void;
}) {
  const [editor, setEditor] = useState<ExtraEditor | null>(null);
  return <>
    {inExtras && items.length ? <ul className="hca-form-stack">
      {items.map(item => <li key={item.id} className="hca-requisition-extra-row">
        <div className="hca-extra-item-heading"><strong>{item.name}</strong>
          <ActionButton compact variant="quiet" aria-label={`Editar ${item.name}`} onClick={() => setEditor({ item })}>Editar</ActionButton>
        </div>
        <p>{formatQuantity(item.quantity, item.unit)}</p>
        {item.details ? <p className="whitespace-pre-wrap">{item.details}</p> : null}
        <div className="hca-extra-item-heading"><Pill>Cadastro pendente</Pill>
          <ActionButton compact variant="quiet" aria-label={`Remover ${item.name}`}
            onClick={() => onChange(items.filter(row => row.id !== item.id))}>Remover</ActionButton>
        </div>
      </li>)}
    </ul> : null}
    <ActionButton onClick={() => setEditor({})}><Icon name="plus" />{inExtras ? "Adicionar item extra" : "Item extra"}</ActionButton>
    {editor ? <PurchaseExtraEditor item={editor.item} catalogue={catalogue} selected={selected}
      atLimit={items.length >= 20} onClose={() => setEditor(null)}
      onChoose={(product, quantity) => {
        onChoose(product, quantity, editor.item?.id);
        setEditor(null);
      }}
      onSave={item => {
        onChange(editor.item ? items.map(current => current.id === item.id ? item : current) : [...items, item]);
        setEditor(null);
      }} /> : null}
  </>;
}

function PurchaseExtraEditor({ item, catalogue, selected, atLimit, onClose, onChoose, onSave }: {
  item?: PendingPurchaseExtra;
  catalogue: CatalogProduct[];
  selected: Record<string, string>;
  atLimit: boolean;
  onClose: () => void;
  onChoose: (product: string, quantity: string) => void;
  onSave: (item: PendingPurchaseExtra) => void;
}) {
  const [draft, setDraft] = useState(() => ({
    id: item?.id ?? crypto.randomUUID(), name: item?.name ?? "", category: item?.category ?? "higiene",
    unit: item?.unit ?? "", quantity: item?.quantity ?? "", details: item?.details ?? "",
  }));
  const [ignored, setIgnored] = useState(() => item ? normalizeCatalogText(item.name) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const query = normalizeCatalogText(draft.name);
  const { candidates } = matchCatalog(draft.name, catalogue);
  const nearby = candidates.length ? candidates.map(match => match.product) : query.length >= 2
    ? catalogue.filter(product => product.active !== false && [product.name, ...(product.aliases ?? [])]
      .some(label => normalizeCatalogText(label).includes(query))) : [];
  const exactMatch = candidates.some(match => match.kind === "exact" || match.kind === "alias");
  const needsChoice = nearby.length > 0 && query !== ignored;

  function update<K extends keyof typeof draft>(field: K, value: (typeof draft)[K]) {
    setDraft(current => ({ ...current, [field]: value }));
    setErrors(current => current[field] ? { ...current, [field]: "" } : current);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item && atLimit) return;
    const parsed = pendingPurchaseExtra.safeParse({ ...draft, details: draft.details.trim() || undefined });
    const nextErrors: Record<string, string> = {};
    if (!parsed.success) for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] = issue.message;
    if (!draft.unit) nextErrors.unit = "Escolha uma unidade de medida.";
    if (exactMatch) nextErrors.name = "Escolha o material do catálogo ou informe um nome que diferencie o novo material.";
    else if (needsChoice) nextErrors.name = "Escolha o material do catálogo ou confirme que é outro.";
    setErrors(nextErrors);
    if (!parsed.success || Object.keys(nextErrors).length) {
      const form = event.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    onSave(parsed.data);
  }

  return <ExtraMaterialDialog isNew={!item} onClose={onClose} onSubmit={save} submitDisabled={!item && atLimit}>
    {!item && atLimit ? <p className="doc-subtle">O limite de itens fora do catálogo foi atingido. Você ainda pode escolher um material do catálogo.</p> : null}
    <FormField label="Nome do material" error={errors.name}>
      <TextInput required maxLength={200} value={draft.name} placeholder="Digite o nome do material"
        onChange={event => { setIgnored(""); update("name", event.currentTarget.value); }} />
    </FormField>
    {exactMatch || needsChoice ? <div className="hca-material-suggestions space-y-2">
      <p role="status" className="font-semibold">É um destes materiais?</p>
      {nearby.slice(0, 5).map(product => <ActionButton key={product.id} compact variant="quiet"
        className="hca-material-suggestion" disabled={Object.hasOwn(selected, product.id)}
        aria-label={`Usar item do catálogo: ${product.name} (${product.unit})`} onClick={() => {
          const quantity = exactQuantity.safeParse(draft.quantity);
          const sameUnit = !draft.unit || product.unit.trim().localeCompare(draft.unit, "pt-BR", { sensitivity: "base" }) === 0;
          onChoose(product.id, quantity.success && sameUnit ? quantity.data : "");
        }}>
        <span><strong>{product.name}</strong><small>{product.unit}</small></span><Icon name="plus" />
      </ActionButton>)}
      <ActionButton className="hca-requisition-extra-other" variant="quiet" compact onClick={() => {
        setIgnored(query);
        if (exactMatch) setErrors({ name: "Informe um nome que diferencie o novo material." });
      }}>É outro material</ActionButton>
    </div> : null}
    <FormField label="Tipo de material"><SelectField value={draft.category} onChange={event => {
      update("category", event.currentTarget.value as PendingPurchaseExtra["category"]);
    }}>
      <option value="medicamentos">Medicamentos</option><option value="higiene">Materiais</option><option value="dieta">Dieta</option>
    </SelectField></FormField>
    <FormField label="Unidade de medida" error={errors.unit}>
      <SelectField required value={draft.unit} onChange={event => update("unit", event.currentTarget.value)}>
        <option value="">Selecione a unidade</option>
        {extraMaterialUnits.map(unit => <option key={unit} value={unit}>{unit[0].toUpperCase() + unit.slice(1)}</option>)}
      </SelectField>
    </FormField>
    <FormField label="Quantidade" error={errors.quantity}>
      <TextInput required inputMode="decimal" maxLength={64} value={draft.quantity}
        onChange={event => update("quantity", event.currentTarget.value)} />
    </FormField>
    <FormField label="Detalhes para identificar" error={errors.details}>
      <TextAreaField rows={2} maxLength={400} value={draft.details} placeholder="Opcional · apresentação ou tamanho"
        onChange={event => update("details", event.currentTarget.value)} />
    </FormField>
  </ExtraMaterialDialog>;
}

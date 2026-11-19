"use client";

import { useId, useState, type FormEvent } from "react";
import { ActionButton, CheckboxField, FormField, SelectField, TextAreaField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { matchCatalog, normalizeCatalogText } from "@/lib/catalog-match";
import { extraMaterialUnits } from "@/lib/documents/extra-material-identity";
import { formatStockObservation, validStockObservation } from "@/lib/stock-observation";
import { extraMaterialIdentity } from "@/lib/validation/extra-material-identity";
import type { ExtraItem } from "@/types/requisition";
import type { Product } from "./requisition-steps";
import { StockObservationField } from "./stock-observation-field";

const fields = { name: "Nome do material", unit: "Unidade de medida" };

export function RequisitionExtras({ items, setItems, products, selectedIds, adopt, showItems, errors }: {
  items: ExtraItem[];
  setItems: (items: ExtraItem[]) => void;
  products: Product[];
  selectedIds: string[];
  adopt: (product: Product, extra: ExtraItem) => void;
  showItems: boolean;
  errors: Record<string, string>;
}) {
  const [editor, setEditor] = useState<{ item: ExtraItem; isNew: boolean } | null>(null);
  const close = () => setEditor(null);
  return <div className="hca-form-stack">
    {showItems ? <>
      <p className="doc-subtle">Inclua materiais adicionais ou confira os que você acrescentou durante o preenchimento.</p>
      {items.length ? <ul className="hca-form-stack">
        {items.map(item => {
          const issue = ["name", "unit", "stock"].find(key => errors[item.id + ":" + key]);
          return <li className="hca-record" key={item.id}>
            <div className="hca-record-main">
              <div className="hca-extra-item-heading"><strong>{item.name}</strong>
                <ActionButton compact variant="quiet" aria-label={`Editar ${item.name}`}
                  data-field-error={issue ? `${item.id}:${issue}` : undefined}
                  onClick={() => setEditor({ item, isNew: false })}>Editar</ActionButton>
              </div>
              <p>{formatStockObservation(item.currentStock, item.stockObservation, item.identification?.unit)}</p>
              {item.identification?.details ? <p className="whitespace-pre-wrap">{item.identification.details}</p> : null}
              {issue ? <p className="ui-field-error">{errors[item.id + ":" + issue]}</p> : null}
              <div className="hca-extra-item-heading"><span className="doc-subtle">Fora do catálogo</span>
                <ActionButton compact variant="quiet" aria-label={`Remover ${item.name}`}
                  onClick={() => setItems(items.filter(row => row.id !== item.id))}>Remover</ActionButton>
              </div>
            </div>
          </li>;
        })}
      </ul> : <p className="hca-issuance-observation-empty"><Icon name="stock" />Nenhum item extra incluído.</p>}
    </> : null}
    <ActionButton disabled={items.length >= 20} onClick={() => setEditor({
      item: { id: `extra-${crypto.randomUUID()}`, name: "", currentStock: null, stockObservation: "unknown", urgent: false },
      isNew: true,
    })}><Icon name="plus" />{showItems ? "Adicionar item extra" : "Item extra"}</ActionButton>
    {editor ? <ExtraItemEditor key={editor.item.id} item={editor.item} isNew={editor.isNew} products={products}
      selectedIds={selectedIds} onClose={close}
      onChoose={(product, extra) => { adopt(product, extra); close(); }}
      onSave={extra => {
        setItems(editor.isNew ? [...items, extra] : items.map(item => item.id === extra.id ? extra : item));
        close();
      }} /> : null}
  </div>;
}

function ExtraItemEditor({ item, isNew, products, selectedIds, onClose, onChoose, onSave }: {
  item: ExtraItem;
  isNew: boolean;
  products: Product[];
  selectedIds: string[];
  onClose: () => void;
  onChoose: (product: Product, item: ExtraItem) => void;
  onSave: (item: ExtraItem) => void;
}) {
  const formId = useId();
  const [draft, setDraft] = useState(item);
  const [unit, setUnit] = useState<string>(item.identification?.unit ?? "");
  const [category, setCategory] = useState<string>(item.identification?.category ?? "higiene");
  const [details, setDetails] = useState(item.identification?.details ?? "");
  const [differentName, setDifferentName] = useState(() => isNew ? "" : normalizeCatalogText(item.name));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const query = normalizeCatalogText(draft.name);
  const active = products.filter(product => product.is_active !== false && product.active !== false);
  const matches = matchCatalog(draft.name, active);
  const nearby = matches.candidates.length ? matches.candidates.map(match => match.product) : query.length >= 2
    ? active.filter(product => [product.name, ...(product.aliases ?? [])].some(label => normalizeCatalogText(label).includes(query)))
    : [];
  const sameCatalogueName = matches.candidates.some(match => match.kind === "exact" || match.kind === "alias");
  const confirmationNeeded = nearby.length > 0 && query !== differentName;

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!draft.name.trim()) nextErrors.name = "Informe o nome do material.";
    else if (sameCatalogueName) nextErrors.name = "Escolha o item do catálogo ou informe um nome que diferencie o novo material.";
    else if (confirmationNeeded) nextErrors.name = "Escolha o material do catálogo ou confirme que é outro.";
    const identification = extraMaterialIdentity.safeParse({ unit, category, ...(details.trim() ? { details } : {}) });
    if (!identification.success) nextErrors.unit = "Escolha uma unidade de medida.";
    if (!validStockObservation(draft)) nextErrors.stock = "Revise a informação de estoque deste item extra.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !identification.success) {
      const form = event.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    onSave({ ...draft, name: draft.name.trim(), identification: identification.data });
  }

  return <Dialog open onClose={onClose} kicker="Itens extras" title={isNew ? "Adicionar item extra" : "Editar item extra"}
    popupClassName="hca-requisition-extra"
    subtitle="Identifique o material e confira a unidade." footer={<>
      <ActionButton onClick={onClose}>Voltar</ActionButton>
      <ActionButton type="submit" form={formId} variant="primary"><Icon name="check" />{isNew ? "Adicionar material" : "Salvar alteração"}</ActionButton>
    </>}>
    <form id={formId} className="hca-form-stack" noValidate onSubmit={apply}>
      <FormField label={fields.name} error={errors.name}>
        <TextInput required value={draft.name} maxLength={200} placeholder="Digite o nome do material" onChange={event => {
          setDifferentName("");
          setDraft({ ...draft, name: event.currentTarget.value });
        }} />
      </FormField>
      {sameCatalogueName || confirmationNeeded ? <div className="hca-material-suggestions space-y-2">
        <p className="font-semibold" role="status">É um destes materiais?</p>
        {nearby.slice(0, 5).map(product => <ActionButton key={product.id} compact variant="quiet"
          className="hca-material-suggestion" disabled={selectedIds.includes(product.id)}
          aria-label={`Usar item do catálogo: ${product.name} (${product.unit})`}
          onClick={() => onChoose(product, draft)}>
          <span><strong>{product.name}</strong><small>{product.unit}</small></span><Icon name="plus" />
        </ActionButton>)}
        <ActionButton className="hca-requisition-extra-other" variant="quiet" compact onClick={() => {
          setDifferentName(query);
          if (sameCatalogueName) setErrors({ name: "Informe um nome que diferencie o novo material." });
        }}>É outro material</ActionButton>
      </div> : null}
      <FormField label="Tipo de material"><SelectField value={category} onChange={event => setCategory(event.currentTarget.value)}>
        <option value="medicamentos">Medicamentos</option><option value="higiene">Materiais</option><option value="dieta">Dieta</option>
      </SelectField></FormField>
      <FormField label={fields.unit} error={errors.unit}>
        <SelectField required value={unit} onChange={event => setUnit(event.currentTarget.value)}>
          <option value="">Selecione a unidade</option>
          {extraMaterialUnits.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
        </SelectField>
      </FormField>
      <StockObservationField value={draft.currentStock} mode={draft.stockObservation} at={draft.stockObservationAt}
        unit={unit || undefined} error={errors.stock} onChange={change => setDraft({ ...draft, ...change })} />
      <CheckboxField checked={draft.urgent} label="Reposição urgente" onChange={event => setDraft({ ...draft, urgent: event.currentTarget.checked })} />
      <FormField label="Detalhes para identificar">
        <TextAreaField rows={2} maxLength={400} value={details} placeholder="Opcional · apresentação ou tamanho" onChange={event => setDetails(event.currentTarget.value)} />
      </FormField>
    </form>
  </Dialog>;
}

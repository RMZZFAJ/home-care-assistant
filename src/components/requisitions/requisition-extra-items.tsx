"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ActionButton, CheckboxField, FormField, Pill, SelectField, TextAreaField, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/overlays";
import { matchCatalog, normalizeCatalogText } from "@/lib/catalog-match";
import { extraMaterialUnits } from "@/lib/documents/extra-material-identity";
import { formatStockObservation, validStockObservation } from "@/lib/stock-observation";
import { formatQuantity } from "@/lib/quantity";
import { extraMaterialIdentity } from "@/lib/validation/extra-material-identity";
import type { ItemContext } from "@/types/documents";
import type { ExtraItem, RequisitionLine } from "@/types/requisition";
import { RequisitionRepeatReason, type Product } from "./requisition-steps";
import { StockObservationField } from "./stock-observation-field";

const fields = { name: "Nome do material", unit: "Unidade de medida" };
function stockSummary(item: Pick<ExtraItem, "currentStock" | "stockObservation">, unit?: string) {
  if (item.stockObservation === "observed" && item.currentStock !== null)
    return "Estoque informado: " + formatQuantity(item.currentStock, unit);
  return "Estoque: " + formatStockObservation(item.currentStock, item.stockObservation, unit);
}

type Editor = { kind: "unlisted"; item: ExtraItem; isNew: boolean }
  | { kind: "catalogue"; product: Product; line: RequisitionLine };

export function RequisitionExtras({ items, setItems, products, lines, itemContext, adopt, updateLine, removeLine, showItems, errors }: {
  items: ExtraItem[];
  setItems: (items: ExtraItem[]) => void;
  products: Product[];
  lines: RequisitionLine[];
  itemContext: ItemContext[];
  adopt: (product: Product, extra: ExtraItem, details: string) => void;
  updateLine: (product: Product, patch: Partial<RequisitionLine>) => void;
  removeLine: (id: string) => void;
  showItems: boolean;
  errors: Record<string, string>;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const catalogueLines = lines.filter(line => line.catalogueExtra);
  const close = () => setEditor(null);
  return <div className="hca-form-stack">
    {showItems ? <>
      <p className="doc-subtle">Inclua materiais adicionais ou confira os que você acrescentou durante o preenchimento.</p>
      {items.length || catalogueLines.length ? <ul className="hca-form-stack">
        {catalogueLines.map(line => {
          const product = products.find(product => product.id === line.productId);
          const key = errors[line.productId] ? line.productId : line.productId + ":repeat";
          return <ExtraRow key={line.productId} name={line.productName} label="Material do catálogo" urgent={line.urgent}
            observation={stockSummary(line, line.unit)}
            error={errors[key]} errorKey={key} details={line.catalogueExtra?.details}
            edit={product ? () => setEditor({ kind: "catalogue", product, line }) : undefined}
            remove={() => removeLine(line.productId)} />;
        })}
        {items.map(item => {
          const issue = ["name", "unit", "stock"].find(key => errors[item.id + ":" + key]);
          return <ExtraRow key={item.id} name={item.name} label="Fora do catálogo" urgent={item.urgent}
            observation={stockSummary(item, item.identification?.unit)}
            error={issue ? errors[item.id + ":" + issue] : undefined} errorKey={item.id + ":" + issue}
            details={item.identification?.details}
            edit={() => setEditor({ kind: "unlisted", item, isNew: false })}
            remove={() => setItems(items.filter(row => row.id !== item.id))} />;
        })}
      </ul> : <p className="hca-issuance-observation-empty"><Icon name="stock" />Nenhum item extra incluído.</p>}
    </> : null}
    <ActionButton onClick={() => setEditor({
      kind: "unlisted",
      item: { id: `extra-${crypto.randomUUID()}`, name: "", currentStock: null, stockObservation: "unknown", urgent: false },
      isNew: true,
    })}><Icon name="plus" />{showItems ? "Adicionar item extra" : "Item extra"}</ActionButton>
    {editor?.kind === "unlisted" ? <ExtraItemEditor key={editor.item.id} item={editor.item} isNew={editor.isNew} products={products}
      selectedIds={lines.map(line => line.productId)} limitReached={items.length >= 20} onClose={close}
      onChoose={(product, extra, details) => { adopt(product, extra, details); close(); }}
      onSave={extra => {
        setItems(editor.isNew ? [...items, extra] : items.map(item => item.id === extra.id ? extra : item));
        close();
      }} /> : null}
    {editor?.kind === "catalogue" ? <CatalogueExtraEditor key={editor.line.productId}
      product={editor.product} line={editor.line} pending={itemContext.find(item => item.productId === editor.product.id)?.pending ?? []}
      onClose={close} onSave={patch => { updateLine(editor.product, patch); close(); }} /> : null}
  </div>;
}

function ExtraRow({ name, label, observation, details, urgent, error, errorKey, edit, remove }: {
  name: string; label: string; observation: string; details?: string; error?: string; errorKey: string;
  urgent: boolean; edit?: () => void; remove: () => void;
}) {
  return <li className="hca-requisition-extra-row" data-urgent={urgent || undefined}>
      <div className="hca-extra-item-heading"><strong>{name}</strong>
        {edit ? <ActionButton compact variant="quiet" aria-label={`Editar ${name}`}
          data-field-error={error ? errorKey : undefined} onClick={edit}>Editar</ActionButton> : null}
      </div>
      <p>{observation}</p>
      {details ? <p className="whitespace-pre-wrap">{details}</p> : null}
      {error ? <p className="ui-field-error">{error}</p> : null}
      <div className="hca-extra-item-heading">
        <div className="flex flex-wrap items-center gap-1.5"><Pill>{label}</Pill>{urgent ? <Pill tone="danger">Urgente</Pill> : null}</div>
        <ActionButton compact variant="quiet" aria-label={`Remover ${name}`} onClick={remove}>Remover</ActionButton>
      </div>
  </li>;
}

function ExtraItemEditor({ item, isNew, products, selectedIds, limitReached, onClose, onChoose, onSave }: {
  item: ExtraItem;
  isNew: boolean;
  products: Product[];
  selectedIds: string[];
  limitReached: boolean;
  onClose: () => void;
  onChoose: (product: Product, item: ExtraItem, details: string) => void;
  onSave: (item: ExtraItem) => void;
}) {
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
    if (isNew && limitReached) return;
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

  return <ExtraEditorDialog isNew={isNew} onClose={onClose} onSubmit={apply} submitDisabled={isNew && limitReached}>
      {isNew && limitReached ? <p className="doc-subtle">O limite de itens fora do catálogo foi atingido. Você ainda pode escolher um material do catálogo.</p> : null}
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
          onClick={() => onChoose(product, draft, details.trim())}>
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
  </ExtraEditorDialog>;
}

function CatalogueExtraEditor({ product, line, pending, onSave, onClose }: {
  product: Product; line: RequisitionLine; pending: ItemContext["pending"];
  onSave: (patch: Partial<RequisitionLine>) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(line);
  const [details, setDetails] = useState(line.catalogueExtra?.details ?? "");
  const [errors, setErrors] = useState<{ stock?: string; reason?: string }>({});
  const decimals = product.quantity_decimals ?? 0;
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reasonLength = draft.repeatReason?.trim().length ?? 0;
    const stock = validStockObservation(draft, decimals) ? undefined : "Revise a informação de estoque e a precisão da unidade.";
    const reason = pending.length && (reasonLength < 3 || reasonLength > 1000)
      ? "Justifique a nova requisição deste produto, entre três e 1.000 caracteres." : undefined;
    setErrors({ stock, reason });
    if (stock || reason) {
      const form = event.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    onSave({ ...draft, catalogueExtra: details.trim() ? { details: details.trim() } : {} });
  }
  return <ExtraEditorDialog isNew={false} onClose={onClose} onSubmit={apply}>
    <FormField label="Material"><TextInput value={product.name} disabled /></FormField>
    <StockObservationField value={draft.currentStock} mode={draft.stockObservation} at={draft.stockObservationAt}
      unit={product.unit} decimals={decimals} error={errors.stock} onChange={change => setDraft({ ...draft, ...change })} />
    <CheckboxField checked={draft.urgent} label="Reposição urgente" onChange={event => setDraft({ ...draft, urgent: event.currentTarget.checked })} />
    <FormField label="Detalhes para identificar">
      <TextAreaField rows={2} maxLength={400} value={details} placeholder="Opcional · apresentação ou tamanho" onChange={event => setDetails(event.currentTarget.value)} />
    </FormField>
    {pending.length ? <RequisitionRepeatReason productId={product.id} pending={pending} value={draft.repeatReason}
      error={errors.reason} onChange={repeatReason => setDraft({ ...draft, repeatReason })} /> : null}
  </ExtraEditorDialog>;
}

function ExtraEditorDialog({ isNew, onClose, onSubmit, submitDisabled, children }: {
  isNew: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitDisabled?: boolean; children: ReactNode;
}) {
  const formId = useId();
  return <Dialog open onClose={onClose} kicker="Itens extras" title={isNew ? "Adicionar item extra" : "Editar item extra"}
    popupClassName="hca-requisition-extra" subtitle="Identifique o material e confira a unidade." footer={<>
      <ActionButton onClick={onClose}>Voltar</ActionButton>
      <ActionButton type="submit" form={formId} variant="primary" disabled={submitDisabled}><Icon name="check" />{isNew ? "Adicionar material" : "Salvar alteração"}</ActionButton>
    </>}>
    <form id={formId} className="hca-form-stack" noValidate onSubmit={onSubmit}>{children}</form>
  </Dialog>;
}

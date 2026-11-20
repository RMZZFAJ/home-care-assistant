"use client";
import { useId, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/primitives";
import { RelatedDocument } from "@/components/documents/related-document";
import { formatBrazilDate } from "@/lib/receipt";
import { inputClass, Notice } from "@/components/workspace";
import { normalizeCatalogText as normalize } from "@/lib/catalog-match";
import { textRows } from "@/lib/text-rows";
import { formatQuantity } from "@/lib/quantity";
import { formatStockObservation } from "@/lib/stock-observation";
import { StockObservationField } from "./stock-observation-field";
import { MaterialChoice } from "@/components/catalog/material-choice";
import { MaterialReview } from "@/components/documents/material-review";
import { MaterialConsultButton } from "@/components/documents/catalogue-material-panel";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { materialCategories, type WizardMaterialCategory } from "@/components/forms/supply-wizard-stages";
import { IssuanceObservationList } from "@/components/forms/issuance-observations";
import { WizardMaterialSearch, WizardMaterialToolbar } from "@/components/forms/wizard-material-tools";
import type { WorkspaceContext } from "@/types/workspace";
import type {
  RequisitionFormData,
  RequisitionLine,
} from "@/types/requisition";
import type { ItemContext } from "@/types/documents";

export type Product = {
  id: string;
  name: string;
  category: RequisitionLine["category"];
  unit: string;
  quantity_decimals?: number;
  aliases?: string[];
  active?: boolean;
  is_active?: boolean;
  selectionPredecessors?: { id: string; name: string; unit: string }[];
};

export function CatalogStep({
  context,
  items,
  itemContext,
  selected,
  updateLine,
  removeLine,
  onLink,
  linkedCount,
  errors,
  selectedCount,
  extras,
}: {
  context: WorkspaceContext;
  items: Product[];
  itemContext: ItemContext[];
  selected: (id: string) => RequisitionLine | undefined;
  updateLine: (item: Product, patch: Partial<RequisitionLine>) => void;
  removeLine: (id: string) => void;
  onLink: (material: Product, returnFocus: () => HTMLButtonElement | null) => void;
  linkedCount: (id: string) => number;
  errors: Record<string, string>;
  selectedCount: number;
  extras: ReactNode;
}) {
  const materialGroupId = useId();
  const [search, setSearch] = useState("");
  const [duplicate, setDuplicate] = useState<Product | null>(null);
  const [repeatReason, setRepeatReason] = useState("");
  const visible = items.filter((item) =>
    [
      item.name,
      ...(item.aliases ?? []),
      ...(item.selectionPredecessors ?? []).map((row) => row.name),
    ].some((name) => normalize(name).includes(normalize(search))),
  );
  return (
    <div className="space-y-4">
      <Dialog
        open={Boolean(duplicate)}
        title="Este produto já está em uma requisição pendente"
        kicker="Requisição"
        headingIcon="alert"
        onClose={() => setDuplicate(null)}
        footer={<>
          <ActionButton onClick={() => setDuplicate(null)}>Não incluir o item</ActionButton>
          <ActionButton variant="primary" disabled={repeatReason.trim().length < 3} onClick={() => {
            if (duplicate) updateLine(duplicate, { repeatReason: repeatReason.trim() });
            setDuplicate(null);
          }}>Manter nova requisição</ActionButton>
        </>}
      >
        <p className="text-sm">
          Confira a necessidade anterior antes de reiterar {duplicate?.name}. A
          nova linha não substitui o pedido anterior.
        </p>
        <ul className="my-3 space-y-3">
          {itemContext
            .find((info) => info.productId === duplicate?.id)
            ?.pending.map((pending) => (
              <li
                key={pending.lineId}
                className="rounded-lg border border-(--line) p-3 text-sm"
              >
                <RelatedDocument
                  id={pending.requisitionId}
                  label={pending.code}
                />
                <p>
                  {formatBrazilDate(pending.createdAt)} · Aguardando atendimento
                </p>
              </li>
            ))}
        </ul>
        <label className="block text-sm font-semibold">
          Justificativa da nova requisição
          <textarea
            className={inputClass}
            minLength={3}
            maxLength={1000}
            value={repeatReason}
            onChange={(event) => setRepeatReason(event.target.value)}
          />
        </label>
      </Dialog>
      <WizardMaterialToolbar count={selectedCount} matches={search.trim() ? visible.length : undefined}>{extras}</WizardMaterialToolbar>
      <WizardMaterialSearch value={search} onChange={setSearch} />
      {!visible.length ? (
        <Notice>Nenhum produto encontrado nesta categoria.</Notice>
      ) : null}
      <div className="hca-wizard-material-list">
      {visible.map((item) => {
        const line = selected(item.id);
        const references = linkedCount(item.id);
        const info = itemContext.find((entry) => entry.productId === item.id);
        const choiceId = `${materialGroupId}-${item.id}`;
        return (
          <MaterialChoice
            key={item.id}
            selected={Boolean(line)}
            urgent={line?.urgent}
            className="ui-product-choice hca-wizard-material"
          >
            <div className="hca-wizard-material-head">
            <label className="hca-material-choice-heading" htmlFor={choiceId}>
              <input
                id={choiceId}
                type="checkbox"
                className="hca-wizard-include-switch"
                aria-labelledby={`${choiceId}-label`}
                checked={Boolean(line)}
                onChange={() => {
                  if (line) removeLine(item.id);
                  else if (info?.pending.length) {
                    setDuplicate(item);
                    setRepeatReason("");
                  } else updateLine(item, {});
                }}
              />
              <span className="hca-wizard-material-icon"><Icon name={materialCategories.find(category => category.id === item.category)?.icon ?? "box"} /></span>
              <span id={`${choiceId}-label`} className="hca-material-choice-copy">
                <strong>{item.name}</strong>
                <small>{item.unit}</small>
                {references ? <small>{references} {references === 1 ? "ficha vinculada" : "fichas vinculadas"}</small> : null}
              </span>
            </label>
            <MaterialConsultButton context={context} material={item} menu
              onLink={line ? returnFocus => onLink(item, returnFocus) : undefined} />
            </div>
            {item.selectionPredecessors?.length ? (
              <p className="mt-2 text-sm">
                Opção cadastrada para novas escolhas após{" "}
                {item.selectionPredecessors
                  .map((row) => `${row.name} (${row.unit})`)
                  .join(", ")}
                . Confira a unidade {item.unit}; a seleção é sua e não converte
                o estoque anterior.
              </p>
            ) : null}
            {line?.catalogueExtra ? <p className="doc-subtle mt-3">Incluído em Itens extras.</p> : null}
            {line && !line.catalogueExtra ? (
              <div className="hca-wizard-material-fields">
                <p className="hca-wizard-material-balance">
                  Família · saldo confirmado deste produto:{" "}
                  {info?.familyStock === null || !info
                    ? "consulta indisponível"
                    : formatQuantity(info.familyStock, item.unit)}
                </p>
                <div className="hca-wizard-material-stock">
                  <label className="hca-wizard-material-urgent">
                    <input
                      type="checkbox"
                      checked={line.urgent}
                      onChange={(event) => updateLine(item, { urgent: event.target.checked })}
                    />
                    Reposição urgente
                  </label>
                  <StockObservationField
                    compact
                    value={line.currentStock}
                    mode={line.stockObservation}
                    suggested={info?.teamStock}
                    unit={item.unit}
                    decimals={item.quantity_decimals ?? 0}
                    error={errors[item.id]}
                    errorKey={item.id}
                    onChange={(change) => updateLine(item, change)}
                  />
                </div>
                {info?.pending.length ? <RequisitionRepeatReason
                  productId={item.id}
                  pending={info.pending}
                  value={line.repeatReason}
                  error={errors[item.id + ":repeat"]}
                  onChange={repeatReason => updateLine(item, { repeatReason })}
                /> : null}
              </div>
            ) : null}
          </MaterialChoice>
        );
      })}
      </div>
    </div>
  );
}
export function RequisitionRepeatReason({ productId, pending, value, error, onChange }: {
  productId: string;
  pending: ItemContext["pending"];
  value?: string;
  error?: string;
  onChange: (value: string | undefined) => void;
}) {
  const labelId = useId();
  const errorId = error ? labelId + "-error" : undefined;
  return <div className="hca-material-pending">
    <p>Este produto ainda tem requisição pendente:{" "}
      {pending.map(row => <RelatedDocument key={row.lineId} id={row.requisitionId} label={row.code} />)}
    </p>
    <label className="mt-3 block font-semibold">
      <span id={labelId}>Motivo da nova requisição</span>
      <textarea aria-labelledby={labelId} data-field-error={productId + ":repeat"} aria-describedby={errorId}
        className={inputClass} value={value ?? ""} minLength={3} maxLength={1000} aria-invalid={Boolean(error)}
        onChange={event => onChange(event.target.value || undefined)} />
      {error ? <span id={errorId} className="ui-field-error">{error}</span> : null}
    </label>
  </div>;
}

export function Review({
  context,
  form,
  recipientName,
  requesterName,
  onEditCategory,
  onEditExtras,
  onEditObservations,
}: {
  context: WorkspaceContext;
  form: RequisitionFormData;
  recipientName: string;
  requesterName: string;
  onEditCategory: (category: WizardMaterialCategory) => void;
  onEditExtras: () => void;
  onEditObservations: () => void;
}) {
  const lines = form.lines;
  const extras = form.extraItems.filter((item) => item.name.trim());
  const displayStock = (item: Pick<RequisitionLine, "currentStock" | "stockObservation">, unit?: string) =>
    item.stockObservation === "observed" && item.currentStock != null
      ? formatQuantity(item.currentStock, unit) : formatStockObservation(item.currentStock, item.stockObservation, unit);
  const catalogueRow = (item: RequisitionLine) => ({
    id: item.productId, name: item.productName, urgent: item.urgent,
    consult: <MaterialConsultButton context={context} material={{ id: item.productId, name: item.productName, unit: item.unit }} menu />,
    details: <>
      {item.catalogueExtra ? <small>Material do catálogo · {item.unit}</small> : null}
      <small>Estoque atual da equipe: {displayStock(item, item.unit)}</small>
      {item.repeatReason ? <small>Reiteração: {item.repeatReason}</small> : null}
      {item.catalogueExtra?.details ? <small className="whitespace-pre-wrap">{item.catalogueExtra.details}</small> : null}
    </>,
  });
  return (
    <div className="space-y-6" style={{ overflowWrap: "anywhere" }}>
      <DefinitionGrid items={[{ label: "Solicitante", value: requesterName }, { label: "Pessoa assistida", value: recipientName }]} />
      {materialCategories.map(category => {
        const group = lines.filter(item => item.category === category.id && !item.catalogueExtra);
        return group.length ? <section key={category.id} className="hca-document-summary">
          <div className="hca-issuance-observation-heading">
            <h3>{category.label}</h3>
            <ActionButton compact variant="quiet" aria-label={`Editar materiais de ${category.label}`} onClick={() => onEditCategory(category.id)}>Editar</ActionButton>
          </div>
          <MaterialReview rows={group.map(catalogueRow)} />
        </section> : null;
      })}
      <section className="hca-document-summary">
        <div className="hca-issuance-observation-heading">
          <h3>Itens extras</h3>
          <ActionButton compact variant="quiet" aria-label="Editar itens extras" onClick={onEditExtras}>Editar</ActionButton>
        </div>
        <MaterialReview rows={[...lines.filter(item => item.catalogueExtra).map(catalogueRow), ...extras.map(item => ({
          id: item.id, name: item.name, urgent: item.urgent,
          details: <>
            <small>Cadastro pendente{item.identification ? " · " + item.identification.unit : ""}</small>
            <small>Estoque atual da equipe: {displayStock(item, item.identification?.unit)}</small>
            {item.identification?.details ? <small className="whitespace-pre-wrap">{item.identification.details}</small> : null}
          </>,
        }))]} />
      </section>
      <section className="hca-document-summary">
        <div className="hca-issuance-observation-heading">
          <h3>Observações</h3>
          <ActionButton compact variant="quiet" aria-label="Editar observações" onClick={onEditObservations}>Editar</ActionButton>
        </div>
        <IssuanceObservationList observations={form.observations.filter((item) => item.trim())} />
      </section>
    </div>
  );
}
export function Summary({
  title,
  rows,
  details,
}: {
  title: string;
  rows: string[];
  details?: string[];
}) {
  return (
    <div className="hca-document-summary">
      <h3 className="font-bold">{title}</h3>
      {rows.length ? (
        <ul>
          {textRows(rows).map((row, index) => (
            <li key={row.key}>
              <span>{row.value}</span>
              {details?.[index] ? (
                <span className="block text-xs text-(--muted)">
                  {details[index]}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-(--muted)">Nenhum registro.</p>
      )}
    </div>
  );
}

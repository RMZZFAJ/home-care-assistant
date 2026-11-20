"use client";
import { useId, useState } from "react";
import { Dialog } from "@/components/ui/primitives";
import { RelatedDocument } from "@/components/documents/related-document";
import { formatBrazilDate } from "@/lib/receipt";
import { inputClass, Notice } from "@/components/workspace";
import { normalizeCatalogText as normalize } from "@/lib/catalog-match";
import { textRows } from "@/lib/text-rows";
import { formatQuantity } from "@/lib/quantity";
import {
  formatStockObservation,
  formatStockObservationTime,
} from "@/lib/stock-observation";
import { StockObservationField } from "./stock-observation-field";
import { MaterialChoice } from "@/components/catalog/material-choice";
import { MaterialReview } from "@/components/documents/material-review";
import { MaterialConsultButton } from "@/components/documents/catalogue-material-panel";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { materialCategories } from "@/components/forms/supply-wizard-stages";
import { IssuanceObservationList } from "@/components/forms/issuance-observations";
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

export function Identity({
  name,
  requesterName,
}: {
  name: string;
  requesterName: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm">
        Paciente: <strong>{name}</strong>
      </p>
      <p className="text-sm">
        Solicitante: <strong>{requesterName}</strong>
      </p>
      <Notice>
        Marque os produtos necessários e informe o estoque observado com a
        equipe. Ao emitir, as contagens informadas atualizam o estoque da equipe.
        A requisição registra necessidades sem quantidade solicitada.
      </Notice>
    </div>
  );
}
export function CatalogStep({
  context,
  items,
  itemContext,
  selected,
  updateLine,
  removeLine,
  errors,
  selectedCount,
}: {
  context: WorkspaceContext;
  items: Product[];
  itemContext: ItemContext[];
  selected: (id: string) => RequisitionLine | undefined;
  updateLine: (item: Product, patch: Partial<RequisitionLine>) => void;
  removeLine: (id: string) => void;
  errors: Record<string, string>;
  selectedCount: number;
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
        onClose={() => setDuplicate(null)}
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
        <div className="ui-form-actions">
          <button
            type="button"
            className="ui-button ui-button-secondary"
            onClick={() => setDuplicate(null)}
          >
            Não incluir o item
          </button>
          <button
            type="button"
            className="ui-button ui-button-primary"
            disabled={repeatReason.trim().length < 3}
            onClick={() => {
              if (duplicate)
                updateLine(duplicate, { repeatReason: repeatReason.trim() });
              setDuplicate(null);
            }}
          >
            Manter nova requisição
          </button>
        </div>
      </Dialog>
      <label className="block text-sm font-semibold">
        Buscar produto
        <input
          className={inputClass}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome ou nome alternativo"
        />
      </label>
      <p
        role="status"
        aria-label="Resultado da busca e seleção de materiais"
        className="text-sm"
      >
        {visible.length}{" "}
        {visible.length === 1 ? "material encontrado" : "materiais encontrados"}
        . {selectedCount}{" "}
        {selectedCount === 1
          ? "material selecionado"
          : "materiais selecionados"}
        .
      </p>
      {!visible.length ? (
        <Notice>Nenhum produto encontrado nesta categoria.</Notice>
      ) : null}
      {visible.map((item) => {
        const line = selected(item.id);
        const info = itemContext.find((entry) => entry.productId === item.id);
        const choiceId = `${materialGroupId}-${item.id}`;
        return (
          <MaterialChoice
            key={item.id}
            selected={Boolean(line)}
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
              </span>
            </label>
            <MaterialConsultButton context={context} material={item} menu />
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
                    at={line.stockObservationAt}
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
  onEditObservations,
}: {
  context: WorkspaceContext;
  form: RequisitionFormData;
  recipientName: string;
  requesterName: string;
  onEditObservations: () => void;
}) {
  const lines = form.lines;
  const extras = form.extraItems.filter((item) => item.name.trim());
  const catalogueRow = (item: RequisitionLine) => ({
    id: item.productId, name: item.productName, urgent: item.urgent,
    consult: <MaterialConsultButton context={context} material={{ id: item.productId, name: item.productName, unit: item.unit }} />,
    details: <>
      {item.catalogueExtra ? <small>Material do catálogo · {item.unit}</small> : null}
      <small>Estoque da equipe: {formatStockObservation(item.currentStock, item.stockObservation, item.unit)}</small>
      <small>{formatStockObservationTime(item.stockObservationAt)}</small>
      {item.repeatReason ? <small>Reiteração: {item.repeatReason}</small> : null}
      {item.catalogueExtra?.details ? <small className="whitespace-pre-wrap">{item.catalogueExtra.details}</small> : null}
    </>,
  });
  return (
    <div className="space-y-6" style={{ overflowWrap: "anywhere" }}>
      <DefinitionGrid items={[{ label: "Solicitante", value: requesterName }, { label: "Pessoa assistida", value: recipientName }]} />
      <section className="hca-document-summary">
        <h3>Itens do catálogo</h3>
        <MaterialReview rows={lines.filter(item => !item.catalogueExtra).map(catalogueRow)} />
      </section>
      <section className="hca-document-summary">
        <h3>Itens extras</h3>
        <MaterialReview rows={[...lines.filter(item => item.catalogueExtra).map(catalogueRow), ...extras.map(item => ({
          id: item.id, name: item.name, urgent: item.urgent,
          details: <>
            <small>Cadastro pendente{item.identification ? " · " + item.identification.unit : ""}</small>
            <small>Estoque da equipe: {formatStockObservation(item.currentStock, item.stockObservation, item.identification?.unit)}</small>
            <small>{formatStockObservationTime(item.stockObservationAt)}</small>
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

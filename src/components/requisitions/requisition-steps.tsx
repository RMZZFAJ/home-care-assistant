"use client";
import { useId, useState } from "react";
import { Dialog } from "@/components/ui/primitives";
import { RelatedDocument } from "@/components/documents/related-document";
import { formatBrazilDate } from "@/lib/receipt";
import { inputClass, Notice } from "@/components/workspace";
import {
  matchCatalog,
  normalizeCatalogText as normalize,
} from "@/lib/catalog-match";
import { textRows } from "@/lib/text-rows";
import { formatQuantity } from "@/lib/quantity";
import {
  formatStockObservation,
  formatStockObservationTime,
} from "@/lib/stock-observation";
import { StockObservationField } from "./stock-observation-field";
import { MaterialChoice } from "@/components/catalog/material-choice";
import { MaterialReview } from "@/components/documents/material-review";
import { ActionButton, DefinitionGrid } from "@/components/ui/controls";
import type {
  ExtraItem,
  RequisitionFormData,
  RequisitionLine,
} from "@/types/requisition";
import type { ItemContext } from "@/types/documents";

const emptyExtra = (): ExtraItem => ({
  id: "extra-" + crypto.randomUUID(),
  name: "",
  currentStock: null,
  stockObservation: "unfilled",
  stockObservationAt: new Date().toISOString(),
  urgent: false,
});
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
        equipe. A requisição não contém quantidade solicitada e não movimenta o
        estoque.
      </Notice>
    </div>
  );
}
export function CatalogStep({
  items,
  itemContext,
  selected,
  updateLine,
  removeLine,
  errors,
  selectedCount,
}: {
  items: Product[];
  itemContext: ItemContext[];
  selected: (id: string) => RequisitionLine | undefined;
  updateLine: (item: Product, patch: Partial<RequisitionLine>) => void;
  removeLine: (id: string) => void;
  errors: Record<string, string>;
  selectedCount: number;
}) {
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
        return (
          <MaterialChoice
            key={item.id}
            selected={Boolean(line)}
            className="ui-product-choice"
          >
            <label className="hca-material-choice-heading">
              <input
                type="checkbox"
                checked={Boolean(line)}
                onChange={() => {
                  if (line) removeLine(item.id);
                  else if (info?.pending.length) {
                    setDuplicate(item);
                    setRepeatReason("");
                  } else updateLine(item, {});
                }}
              />
              <span className="hca-material-choice-copy">
                <strong>{item.name}</strong>
                <small>{item.unit}</small>
              </span>
            </label>
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
            {line ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-(--muted)">
                  Família · saldo confirmado deste produto:{" "}
                  {info?.familyStock === null || !info
                    ? "consulta indisponível"
                    : formatQuantity(info.familyStock, item.unit)}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StockObservationField
                    value={line.currentStock}
                    mode={line.stockObservation}
                    at={line.stockObservationAt}
                    unit={item.unit}
                    decimals={item.quantity_decimals ?? 0}
                    error={errors[item.id]}
                    errorKey={item.id}
                    onChange={(change) => updateLine(item, change)}
                  />
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={line.urgent}
                      onChange={(event) =>
                        updateLine(item, { urgent: event.target.checked })
                      }
                    />
                    Reposição urgente
                  </label>
                </div>
                {info?.pending.length ? (
                  <div className="hca-material-pending">
                    <p>
                      Este produto ainda tem requisição pendente:{" "}
                      {info.pending.map((pending) => (
                        <RelatedDocument
                          key={pending.lineId}
                          id={pending.requisitionId}
                          label={pending.code}
                        />
                      ))}
                    </p>
                    <label className="mt-3 block font-semibold">
                      <span id={item.id + "-repeat-label"}>Motivo da nova requisição</span>
                      <textarea
                        aria-labelledby={item.id + "-repeat-label"}
                        data-field-error={item.id + ":repeat"}
                        aria-describedby={errors[item.id + ":repeat"] ? item.id + "-repeat-error" : undefined}
                        className={inputClass}
                        value={line.repeatReason ?? ""}
                        minLength={3}
                        maxLength={1000}
                        aria-invalid={Boolean(errors[item.id + ":repeat"])}
                        onChange={(event) =>
                          updateLine(item, {
                            repeatReason: event.target.value || undefined,
                          })
                        }
                      />
                      {errors[item.id + ":repeat"] ? (
                        <span id={item.id + "-repeat-error"} className="ui-field-error">
                          {errors[item.id + ":repeat"]}
                        </span>
                      ) : null}
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}
          </MaterialChoice>
        );
      })}
    </div>
  );
}
export function Extras({
  errors = {},
  items,
  setItems,
  products,
  adopt,
}: {
  errors?: Record<string, string>;
  items: ExtraItem[];
  setItems: (items: ExtraItem[]) => void;
  products: Product[];
  adopt: (product: Product, extra: ExtraItem) => void;
}) {
  const classificationLabels = {
    exact: "Correspondência exata no catálogo.",
    alias: "Nome alternativo reconhecido no catálogo.",
    approximate:
      "Correspondência aproximada. Confira nome e unidade antes de escolher.",
    ambiguous:
      "Correspondência ambígua: há mais de um item possível. Escolha explicitamente o correto.",
    absent: "Nenhuma correspondência no catálogo deste paciente.",
  };
  const candidateLabels = {
    exact: "Nome exato",
    alias: "Nome alternativo",
    approximate: "Grafia aproximada",
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-(--muted)">
        Adicione materiais não disponíveis no catálogo e informe somente o
        estoque atual. As sugestões exigem sua escolha antes de vincular um
        item.
      </p>
      {items.map((item, index) => {
        const result = matchCatalog(item.name, products);
        return (
          <div
            key={item.id}
            className="grid gap-3 rounded-xl border border-(--line) p-4 sm:grid-cols-[1fr_auto_auto]"
          >
            <label className="text-sm font-semibold">
              <span id={item.id + "-name-label"}>Nome</span>
              <input
                aria-labelledby={item.id + "-name-label"}
                value={item.name}
                data-field-error={item.id + ":name"}
                aria-invalid={Boolean(errors[item.id + ":name"])}
                aria-describedby={errors[item.id + ":name"] ? item.id + "-name-error" : undefined}
                maxLength={200}
                onChange={(event) =>
                  setItems(
                    items.map((current) =>
                      current.id === item.id
                        ? { ...current, name: event.target.value }
                        : current,
                    ),
                  )
                }
                className={inputClass + " mt-1"}
              />
              {errors[item.id + ":name"] ? <span id={item.id + "-name-error"} className="ui-field-error">{errors[item.id + ":name"]}</span> : null}
            </label>
            <StockObservationField
              error={errors[item.id + ":stock"]}
              errorKey={item.id + ":stock"}
              value={item.currentStock}
              mode={item.stockObservation}
              at={item.stockObservationAt}
              onChange={(change) =>
                setItems(
                  items.map((current) =>
                    current.id === item.id
                      ? { ...current, ...change }
                      : current,
                  ),
                )
              }
            />
            <div className="flex items-end">
              <ActionButton
                variant="danger"
                onClick={() =>
                  setItems(items.filter((current) => current.id !== item.id))
                }
                className="w-full sm:w-auto"
              >
                Remover item {index + 1}
              </ActionButton>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-3">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={item.urgent}
                onChange={(event) =>
                  setItems(
                    items.map((current) =>
                      current.id === item.id
                        ? { ...current, urgent: event.target.checked }
                        : current,
                    ),
                  )
                }
              />
              Reposição urgente
            </label>
            {normalize(item.name) && (
              <div className="hca-material-suggestions space-y-2 sm:col-span-3">
                <p role="status" className="text-sm font-semibold">
                  {classificationLabels[result.classification]}
                </p>
                {result.candidates.slice(0, 5).map((candidate) => (
                  <ActionButton
                    key={candidate.product.id}
                    className="hca-material-suggestion"
                    onClick={() => adopt(candidate.product, item)}
                  >
                    Usar item do catálogo: {candidate.product.name} (
                    {candidate.product.unit})
                    <span className="mt-1 block text-xs text-(--muted)">
                      {candidateLabels[candidate.kind]}
                      {candidate.kind === "alias"
                        ? `: ${candidate.matchedName}`
                        : ""}
                    </span>
                  </ActionButton>
                ))}
                {result.candidates.length > 5 && (
                  <p className="text-xs text-(--muted)">
                    Mostrando 5 de {result.candidates.length} possibilidades.
                    Refine o nome para localizar o item correto.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
      <ActionButton
        onClick={() => setItems([...items, emptyExtra()])}
      >
        + Incluir novo item
      </ActionButton>
    </div>
  );
}
export function Observations({
  errors = {},
  observations,
  setObservations,
}: {
  errors?: Record<string, string>;
  observations: string[];
  setObservations: (observations: string[]) => void;
}) {
  const fieldId = useId();
  const [rows, setRows] = useState(() =>
    observations.map((value) => ({ id: crypto.randomUUID(), value })),
  );
  function update(next: typeof rows) {
    setRows(next);
    setObservations(next.map((row) => row.value));
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-(--muted)">
        Registre apenas informações operacionais necessárias.
      </p>
      {rows.map((row, index) => (
        <div key={row.id} className="flex flex-wrap gap-2">
          <textarea
            aria-label={`Observação ${index + 1}`}
            data-field-error={"observation:" + index}
            aria-invalid={Boolean(errors["observation:" + index])}
            aria-describedby={errors["observation:" + index] ? fieldId + "-" + index : undefined}
            rows={3}
            value={row.value}
            onChange={(event) =>
              update(
                rows.map((item) =>
                  item.id === row.id
                    ? { ...item, value: event.target.value }
                    : item,
                ),
              )
            }
            className={inputClass}
          />
          <ActionButton
            variant="danger"
            onClick={() => update(rows.filter((item) => item.id !== row.id))}
            className="self-start"
          >
            Remover
          </ActionButton>
          {errors["observation:" + index] ? <p id={fieldId + "-" + index} className="ui-field-error w-full">{errors["observation:" + index]}</p> : null}
        </div>
      ))}
      <ActionButton
        onClick={() =>
          update([...rows, { id: crypto.randomUUID(), value: "" }])
        }
      >
        + Incluir nova observação
      </ActionButton>
    </div>
  );
}
export function Review({
  form,
  recipientName,
  requesterName,
}: {
  form: RequisitionFormData;
  recipientName: string;
  requesterName: string;
}) {
  const lines = form.lines;
  const extras = form.extraItems.filter((item) => item.name.trim());
  return (
    <div className="space-y-6" style={{ overflowWrap: "anywhere" }}>
      <DefinitionGrid items={[{ label: "Solicitante", value: requesterName }, { label: "Pessoa assistida", value: recipientName }]} />
      <section className="hca-document-summary">
        <h3>Itens do catálogo</h3>
        <MaterialReview rows={lines.map(item => ({
          id: item.productId, name: item.productName, urgent: item.urgent,
          details: <><small>Estoque da equipe: {formatStockObservation(item.currentStock, item.stockObservation, item.unit)}</small><small>{formatStockObservationTime(item.stockObservationAt)}</small>{item.repeatReason ? <small>Reiteração: {item.repeatReason}</small> : null}</>,
        }))} />
      </section>
      <section className="hca-document-summary">
        <h3>Itens extras</h3>
        <MaterialReview rows={extras.map(item => ({
          id: item.id, name: item.name, urgent: item.urgent,
          details: <><small>Estoque da equipe: {formatStockObservation(item.currentStock, item.stockObservation)}</small><small>{formatStockObservationTime(item.stockObservationAt)}</small></>,
        }))} />
      </section>
      <Summary
        title="Observações"
        rows={form.observations.filter((item) => item.trim())}
      />
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

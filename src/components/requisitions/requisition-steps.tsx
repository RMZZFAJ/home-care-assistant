"use client";
import { useState } from "react";
import Link from "next/link";
import { inputClass, Notice } from "@/components/workspace";
import {
  matchCatalog,
  normalizeCatalogText as normalize,
} from "@/lib/catalog-match";
import { textRows } from "@/lib/text-rows";
import { formatQuantity } from "@/lib/quantity";
import type {
  ExtraItem,
  RequisitionFormData,
  RequisitionLine,
} from "@/types/requisition";
import type { ItemContext } from "@/types/documents";

const emptyExtra = (): ExtraItem => ({
  id: "extra-" + crypto.randomUUID(),
  name: "",
  currentStock: 0,
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
}: {
  items: Product[];
  itemContext: ItemContext[];
  selected: (id: string) => RequisitionLine | undefined;
  updateLine: (item: Product, patch: Partial<RequisitionLine>) => void;
  removeLine: (id: string) => void;
  errors: Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const visible = items.filter((item) =>
    [item.name, ...(item.aliases ?? [])].some((name) =>
      normalize(name).includes(normalize(search)),
    ),
  );
  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold">
        Buscar produto
        <input
          className={inputClass}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome ou nome alternativo"
        />
      </label>
      {!visible.length ? (
        <Notice>Nenhum produto encontrado nesta categoria.</Notice>
      ) : null}
      {visible.map((item) => {
        const line = selected(item.id);
        const info = itemContext.find((entry) => entry.productId === item.id);
        return (
          <article
            key={item.id}
            className={"ui-product-choice " + (line ? "is-selected" : "")}
          >
            <label className="flex items-center gap-3 font-semibold">
              <input
                type="checkbox"
                checked={Boolean(line)}
                onChange={() =>
                  line ? removeLine(item.id) : updateLine(item, {})
                }
              />
              {item.name}
              <span className="ml-auto text-xs font-normal text-(--muted)">
                {item.unit}
              </span>
            </label>
            {line ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-(--muted)">
                  Família · saldo confirmado deste produto:{" "}
                  {info?.familyStock === null || !info
                    ? "consulta indisponível"
                    : formatQuantity(info.familyStock, item.unit)}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold">
                    Estoque observado com a equipe
                    <input
                      className={inputClass}
                      type="number"
                      inputMode={
                        (item.quantity_decimals ?? 0) ? "decimal" : "numeric"
                      }
                      min="0"
                      max="100000"
                      step={
                        (item.quantity_decimals ?? 0)
                          ? 10 ** -(item.quantity_decimals ?? 0)
                          : 1
                      }
                      value={
                        Number.isNaN(line.currentStock) ? "" : line.currentStock
                      }
                      aria-invalid={Boolean(errors[item.id])}
                      onChange={(event) =>
                        updateLine(item, {
                          currentStock:
                            event.target.value === ""
                              ? NaN
                              : Number(event.target.value),
                        })
                      }
                    />
                    {errors[item.id] ? (
                      <span className="ui-field-error">{errors[item.id]}</span>
                    ) : null}
                  </label>
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
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                    <p>
                      Este produto ainda tem requisição pendente:{" "}
                      {info.pending.map((pending) => (
                        <Link
                          key={pending.lineId}
                          className="underline mr-2"
                          href={"/historico/" + pending.requisitionId}
                        >
                          {pending.code}
                        </Link>
                      ))}
                    </p>
                    <label className="mt-3 block font-semibold">
                      Motivo da nova requisição
                      <textarea
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
                        <span className="ui-field-error">
                          {errors[item.id + ":repeat"]}
                        </span>
                      ) : null}
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
export function Extras({
  items,
  setItems,
  products,
  adopt,
}: {
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
              Nome
              <input
                value={item.name}
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
                className="mt-1 min-h-12 w-full rounded-lg border border-(--line) p-3"
              />
            </label>
            <label className="text-sm font-semibold">
              Estoque atual
              <input
                type="number"
                min="0"
                step="1"
                value={item.currentStock}
                onChange={(event) =>
                  setItems(
                    items.map((current) =>
                      current.id === item.id
                        ? {
                            ...current,
                            currentStock: Number(event.target.value),
                          }
                        : current,
                    ),
                  )
                }
                className="mt-1 min-h-12 w-full rounded-lg border border-(--line) p-3"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() =>
                  setItems(items.filter((current) => current.id !== item.id))
                }
                className="min-h-12 w-full rounded-lg border border-red-200 px-3 text-left text-sm font-semibold text-red-700 sm:w-auto"
              >
                Remover item {index + 1}
              </button>
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
              <div className="space-y-2 rounded-lg bg-slate-50 p-3 sm:col-span-3">
                <p role="status" className="text-sm font-semibold">
                  {classificationLabels[result.classification]}
                </p>
                {result.candidates.slice(0, 5).map((candidate) => (
                  <button
                    key={candidate.product.id}
                    type="button"
                    className="block min-h-11 w-full rounded border border-(--brand) p-2 text-left text-sm"
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
                  </button>
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
      <button
        type="button"
        onClick={() => setItems([...items, emptyExtra()])}
        className="min-h-12 rounded-lg border border-(--brand) px-4 py-2 text-sm font-bold text-(--brand)"
      >
        + Incluir novo item
      </button>
    </div>
  );
}
export function Observations({
  observations,
  setObservations,
}: {
  observations: string[];
  setObservations: (observations: string[]) => void;
}) {
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
        <div key={row.id} className="flex gap-2">
          <textarea
            aria-label={`Observação ${index + 1}`}
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
            className="w-full rounded-lg border border-(--line) p-3"
          />
          <button
            type="button"
            onClick={() => update(rows.filter((item) => item.id !== row.id))}
            className="self-start text-sm font-semibold text-red-700"
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          update([...rows, { id: crypto.randomUUID(), value: "" }])
        }
        className="rounded-lg border border-(--brand) px-4 py-2 text-sm font-bold text-(--brand)"
      >
        + Incluir nova observação
      </button>
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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-(--muted)">Solicitante</p>
        <p className="font-semibold">{requesterName}</p>
        <p className="mt-4 text-sm text-(--muted)">Pessoa assistida</p>
        <p className="font-semibold">{recipientName}</p>
      </div>
      <Summary
        title="Itens do catálogo"
        rows={lines.map(
          (item) =>
            `${item.productName} — estoque atual: ${item.currentStock ?? "desconhecido"}${item.urgent ? " (urgente)" : ""}`,
        )}
      />
      <Summary
        title="Itens extras"
        rows={extras.map(
          (item) =>
            `${item.name} — estoque atual: ${item.currentStock ?? "desconhecido"}${item.urgent ? " (urgente)" : ""}`,
        )}
      />
      <Summary
        title="Observações"
        rows={form.observations.filter((item) => item.trim())}
      />
    </div>
  );
}
export function Summary({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div>
      <h3 className="font-bold">{title}</h3>
      {rows.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {textRows(rows).map((row) => (
            <li key={row.key}>{row.value}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-(--muted)">Nenhum registro.</p>
      )}
    </div>
  );
}

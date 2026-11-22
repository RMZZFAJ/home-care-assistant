"use client";

import { useRef, useState } from "react";
import { CatalogueMaterialPanel } from "@/components/documents/catalogue-material-panel";
import { ActionButton, DefinitionGrid, Pill } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/primitives";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { stockBalanceRows, stockBalanceSituation, type StockBalanceFilter, type StockBalanceRow } from "@/lib/stock-presentation";
import type { ProductStock, StockMetric } from "@/types/stock";
import type { WorkspaceContext } from "@/types/workspace";

const labels = { FAMILY: "Família", CARE_TEAM: "Equipe" };
const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

function StockUpdate({ updatedAt, queriedAt }: { updatedAt?: string | null; queriedAt: string | null }) {
  if (!updatedAt) return <small>Sem movimentação registrada</small>;
  const absolute = formatBrazilDate(updatedAt);
  const minutes = queriedAt ? Math.min(0, Math.ceil((Date.parse(updatedAt) - Date.parse(queriedAt)) / 60_000)) : null;
  const text = minutes === null ? absolute
    : minutes === 0 ? "Agora"
      : minutes > -60 ? relative.format(minutes, "minute")
        : minutes > -1_440 ? relative.format(Math.ceil(minutes / 60), "hour")
          : relative.format(Math.ceil(minutes / 1_440), "day");
  return <time dateTime={updatedAt} title={absolute}>{text}<span className="sr-only"> · {absolute}</span></time>;
}

function purchaseFacts(stock: StockBalanceRow["stock"]) {
  return [
    { label: "Compra aprovada a realizar", value: stock.purchaseExpected ?? "0" },
    { label: "Compra registrada a receber", value: stock.purchaseAwaiting ?? stock.purchasePending ?? "0" },
    { label: "Chegada aguardando validação", value: stock.purchasePendingValidation ?? "0" },
  ].filter(item => quantity(item.value).gt(0));
}

export function StockOverview({
  context, products, custody, allowedCustodies, metrics, queriedAt, onTransit,
  filter = "all", showEmpty = true,
}: {
  context: WorkspaceContext;
  products: ProductStock[];
  custody: string;
  allowedCustodies: string[];
  metrics: StockMetric[];
  queriedAt: string | null;
  onTransit: (product: ProductStock) => void;
  filter?: StockBalanceFilter;
  showEmpty?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<{ productId: string; opener: HTMLElement } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const grouped = new Map<string, StockBalanceRow[]>();
  const rows = stockBalanceRows(products, custody, allowedCustodies, filter);
  for (const row of rows) {
    const group = grouped.get(row.product.productId);
    if (group) group.push(row);
    else grouped.set(row.product.productId, [row]);
  }
  const groups = Array.from(grouped.values());
  const pageCount = Math.max(1, Math.ceil(groups.length / 15));
  const currentPage = Math.min(page, pageCount);
  const visible = groups.slice((currentPage - 1) * 15, currentPage * 15);
  const selected = selection && grouped.get(selection.productId);
  const selectedProduct = selected?.[0]?.product;
  return <div className="hca-stock-results" ref={listRef} tabIndex={-1}>
    <p className="hca-field-hint" role="status">
      {groups.length} {groups.length === 1 ? "material neste filtro" : "materiais neste filtro"}.
      {groups.length > 15 ? ` Exibindo ${(currentPage - 1) * 15 + 1} a ${Math.min(currentPage * 15, groups.length)}.` : ""}
    </p>
    {visible.length ? <section className="hca-stock-material-list" aria-label="Saldos por produto e custódia">
      {visible.map(entries => {
        const product = entries[0].product;
        return <article key={product.productId} className="hca-stock-material-card">
          <button type="button" className="hca-stock-material-heading" aria-label={"Consultar " + product.name + (entries.length === 1 ? " · " + labels[entries[0].custody] : "")}
            onClick={event => setSelection({ productId: product.productId, opener: event.currentTarget })}>
            <span className="hca-stock-material-icon"><Icon name="box" width={20} height={20} /></span>
            <span><strong>{product.name}</strong><small>{product.unit}{product.active ? "" : " · Inativo"}</small></span>
            <Icon name="chevron" width={17} height={17} />
          </button>
          <div className="hca-stock-custodies" data-count={entries.length}>
            {entries.map(({ custody: key, stock }) => {
              const situation = stockBalanceSituation(stock);
              return <section key={key} className="hca-stock-custody" data-tone={situation.tone} aria-label={product.name + " · " + labels[key]}>
                <span className="hca-stock-custody-label"><Icon name={key === "FAMILY" ? "home" : "users"} width={14} height={14} />{labels[key]}</span>
                <div className="hca-stock-custody-quantity"><strong>{formatQuantity(stock.confirmed)}</strong>{" "}<span>{product.unit}</span></div>
                <small>{stock.minimum === null ? "Mínimo não definido" : "Mínimo " + formatQuantity(stock.minimum)}</small>
                {situation.tone !== "neutral" && situation.tone !== "success" ? <Pill tone={situation.tone}>{situation.label}</Pill> : null}
                <StockUpdate updatedAt={stock.updatedAt} queriedAt={queriedAt} />
              </section>;
            })}
          </div>
          {entries.flatMap(({ custody: key, stock }) => [
            ...(quantity(stock.incoming).gt(0) ? [<button key={key + ":transit"} type="button" className="hca-stock-material-pending"
              onClick={() => onTransit(product)}>
              <Icon name="truck" width={16} height={16} />
              <span><strong>{formatQuantity(stock.incoming, product.unit)} em trânsito</strong><small>Destino · {labels[key]}</small></span>
              <Icon name="chevron" width={15} height={15} />
            </button>] : []),
            ...(quantity(stock.disputed ?? 0).gt(0) ? [<div className="hca-stock-material-pending" key={key + ":disputed"}>
              <Icon name="alert" width={16} height={16} />
              <span><strong>Divergência pendente</strong><small>{formatQuantity(stock.disputed ?? "0", product.unit)} · {labels[key]}</small></span>
            </div>] : []),
            ...purchaseFacts(stock).map(item => <div className="hca-stock-material-pending" key={key + ":" + item.label}>
              <Icon name="box" width={16} height={16} />
              <span><strong>{formatQuantity(item.value, product.unit)}</strong><small>{item.label}</small></span>
            </div>),
          ])}
        </article>;
      })}
    </section> : showEmpty ? <EmptyState title="Nenhum material encontrado">Ajuste a busca ou limpe os filtros.</EmptyState> : null}
    {pageCount > 1 ? <nav aria-label="Páginas dos saldos" className="hca-pagination">
      <ActionButton disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</ActionButton>
      <span>{currentPage} / {pageCount}</span>
      <ActionButton disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Próxima</ActionButton>
    </nav> : null}
    {selection && selected && selectedProduct ? <CatalogueMaterialPanel
      key={selectedProduct.productId}
      context={context}
      material={{ id: selectedProduct.productId, name: selectedProduct.name, unit: selectedProduct.unit }}
      onClose={() => setSelection(null)}
      closeText="Voltar ao estoque"
      detailTitle="Saldos e compromissos"
      finalFocus={() => selection.opener.isConnected ? selection.opener : listRef.current ?? false}
      detail={<div className="hca-form-stack">{selected.map(({ custody: key, stock }) => <section key={key}>
        <h4>{labels[key]}</h4>
        <DefinitionGrid items={[
          { label: "Saldo confirmado", value: formatQuantity(stock.confirmed, selectedProduct.unit) },
          { label: "Mínimo configurado", value: stock.minimum === null ? "Não definido" : formatQuantity(stock.minimum, selectedProduct.unit) },
          { label: "Entrada em trânsito", value: formatQuantity(stock.incoming, selectedProduct.unit) },
          { label: "Divergência pendente", value: formatQuantity(stock.disputed ?? "0", selectedProduct.unit) },
          ...purchaseFacts(stock).map(item => ({ label: item.label, value: formatQuantity(item.value, selectedProduct.unit) })),
          { label: "Consumo confirmado · 30 dias", value: formatQuantity(metrics.find(item =>
            item.productId === selectedProduct.productId && item.location === key)?.quantity ?? "0", selectedProduct.unit) },
          { label: "Atualização do saldo", value: <StockUpdate updatedAt={stock.updatedAt} queriedAt={queriedAt} /> },
        ]} />
      </section>)}</div>} /> : null}
  </div>;
}

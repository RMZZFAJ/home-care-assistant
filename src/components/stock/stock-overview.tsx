"use client";
import {
  ActionButton,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeading,
  DataTableRow,
  Pill,
} from "@/components/ui/controls";
import { useRef, useState } from "react";
import { EmptyState } from "@/components/ui/primitives";
import {
  stockBalanceRows,
  stockBalanceSituation,
  type StockBalanceFilter,
} from "@/lib/stock-presentation";

import { RecordDrawer } from "@/components/forms/record-drawer";
import { formatQuantity, quantity } from "@/lib/quantity";
import type { ProductStock, StockCustody, StockMetric } from "@/types/stock";

const labels: Record<string, string> = {
  FAMILY: "Família",
  CARE_TEAM: "Equipe",
};
const projection = (stock: StockCustody) =>
  quantity(stock.confirmed)
    .plus(stock.incoming)
    .plus(stock.purchasePending ?? 0)
    .toFixed();
function StockQuantity({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="hca-stock-quantity">
      <span>{formatQuantity(value)}</span> <small>{unit}</small>
    </span>
  );
}
export function StockOverview({
  products,
  custody,
  allowedCustodies,
  metrics,
  filter = "all",
  showEmpty = true,
}: {
  products: ProductStock[];
  custody: string;
  allowedCustodies: string[];
  metrics: StockMetric[];
  filter?: StockBalanceFilter;
  showEmpty?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<{
    productId: string;
    custody: string;
    opener: HTMLElement;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rows = stockBalanceRows(products, custody, allowedCustodies, filter);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / 15)));
  const visible = rows.slice((currentPage - 1) * 15, currentPage * 15);
  const selected = rows.find(
    (row) =>
      row.product.productId === selection?.productId &&
      row.custody === selection.custody,
  );
  const open = (
    productId: string,
    selectedCustody: string,
    opener: HTMLElement,
  ) => setSelection({ productId, custody: selectedCustody, opener });
  return (
    <div className="hca-stock-results" ref={listRef} tabIndex={-1}>
      <p className="hca-field-hint" role="status">
        {rows.length}{" "}
        {rows.length === 1 ? "saldo neste filtro" : "saldos neste filtro"}.
        {rows.length > 15
          ? ` Exibindo ${(currentPage - 1) * 15 + 1} a ${Math.min(currentPage * 15, rows.length)}.`
          : ""}
      </p>
      {rows.length ? (
        <div
          className="hca-stock-table-wrap"
          role="region"
          aria-label="Tabela de saldos; role horizontalmente quando necessário"
          tabIndex={0}
        >
          <DataTable
            className="hca-stock-table hca-mobile-records"
            role="table"
            aria-label="Saldos por produto e custódia"
          >
            <colgroup>
              {Object.entries({ material: 29, confirmed: 14, minimum: 14, situation: 17, forecasts: 17, details: 9 }).map(([column, width]) => (
                <col key={column} style={{ width: `${width}%` }} />
              ))}
            </colgroup>
            <DataTableHead role="rowgroup">
              <DataTableRow role="row">
                {[
                  "Material",
                  "Saldo confirmado",
                  "Mínimo",
                  "Situação",
                  "Previsões",
                  "Consulta",
                ].map((label) => (
                  <DataTableHeading role="columnheader" key={label}>
                    {label}
                  </DataTableHeading>
                ))}
              </DataTableRow>
            </DataTableHead>
            <DataTableBody role="rowgroup">
              {visible.map(({ product, stock, custody: key }) => {
                const situation = stockBalanceSituation(stock);
                return (
                  <DataTableRow
                    role="row"
                    key={product.productId + key}
                    aria-label={product.name + " · " + labels[key]}
                  >
                    <DataTableCell role="cell">
                      <strong>{product.name}</strong>
                      <small className="hca-cell-secondary">
                        Custódia: {labels[key]}
                      </small>
                      <small className="hca-cell-secondary">
                        {product.unit}
                        {product.active ? "" : " · Inativo"}
                      </small>
                    </DataTableCell>
                    <DataTableCell role="cell" data-label="Confirmado">
                      <strong className="hca-stock-confirmed">
                        <StockQuantity
                          value={stock.confirmed}
                          unit={product.unit}
                        />
                      </strong>
                    </DataTableCell>
                    <DataTableCell role="cell" data-label="Mínimo">
                      {stock.minimum === null ? (
                        "Não definido"
                      ) : (
                        <StockQuantity
                          value={stock.minimum}
                          unit={product.unit}
                        />
                      )}
                    </DataTableCell>
                    <DataTableCell role="cell" data-label="Situação">
                      <div className="hca-stock-status">
                        <Pill tone={situation.tone}>{situation.label}</Pill>
                        {quantity(product.disputed).gt(0) ? (
                          <Pill tone="danger">Divergência pendente</Pill>
                        ) : null}
                      </div>
                    </DataTableCell>
                    <DataTableCell role="cell" className="hca-stock-estimate">
                      <dl className="hca-stock-forecasts">
                        <div>
                          <dt>Em trânsito</dt>
                          <dd>
                            <StockQuantity
                              value={stock.incoming}
                              unit={product.unit}
                            />
                          </dd>
                        </div>
                        <div>
                          <dt>Projeção</dt>
                          <dd>
                            <StockQuantity
                              value={projection(stock)}
                              unit={product.unit}
                            />
                          </dd>
                        </div>
                      </dl>
                    </DataTableCell>
                    <DataTableCell role="cell">
                      <ActionButton
                        variant="quiet"
                        compact
                        aria-label={
                          "Consultar " + product.name + " · " + labels[key]
                        }
                        onClick={(event) =>
                          open(product.productId, key, event.currentTarget)
                        }
                      >
                        Detalhes
                      </ActionButton>
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        </div>
      ) : showEmpty ? (
        <EmptyState title="Nenhum produto encontrado">
          Ajuste a busca, a custódia ou o filtro de saldo. Quantidades em
          trânsito não entram no saldo confirmado.
        </EmptyState>
      ) : null}
      {rows.length > 15 ? (
        <nav aria-label="Páginas dos saldos" className="hca-pagination">
          <ActionButton
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Anterior
          </ActionButton>
          <span>
            {currentPage} / {Math.ceil(rows.length / 15)}
          </span>
          <ActionButton
            disabled={currentPage * 15 >= rows.length}
            onClick={() => setPage(currentPage + 1)}
          >
            Próxima
          </ActionButton>
        </nav>
      ) : null}
      {selection && selected ? (
        <RecordDrawer
          title={selected.product.name + " · " + labels[selected.custody]}
          onClose={() => setSelection(null)}
          restoreFocusTo={selection.opener}
          restoreFocusFallbackRef={listRef}
          trackChanges={false}
        >
          <div className="hca-stock-detail">
            <div className="hca-stock-available">
              <span>Saldo confirmado · {selected.product.unit}</span>
              <strong>
                {formatQuantity(
                  selected.stock.confirmed,
                  selected.product.unit,
                )}
              </strong>
            </div>
            <p className="hca-field-hint">
              Disponível nesta custódia, conforme movimentos confirmados.
            </p>
            <Pill tone={stockBalanceSituation(selected.stock).tone}>
              {stockBalanceSituation(selected.stock).label}
            </Pill>
            <dl>
              <dt>Entrada em trânsito</dt>
              <dd>
                {formatQuantity(selected.stock.incoming, selected.product.unit)}
              </dd>
              {selected.stock.purchasePending !== undefined ? (
                <>
                  <dt>COM aprovada ainda não recebida</dt>
                  <dd>
                    {formatQuantity(
                      selected.stock.purchasePending,
                      selected.product.unit,
                    )}
                  </dd>
                </>
              ) : null}
              <dt>Projeção após entradas previstas</dt>
              <dd>
                {formatQuantity(
                  projection(selected.stock),
                  selected.product.unit,
                )}
              </dd>
              <dt>Mínimo configurado</dt>
              <dd>
                {selected.stock.minimum === null
                  ? "Não definido"
                  : formatQuantity(
                      selected.stock.minimum,
                      selected.product.unit,
                    )}
              </dd>
              <dt>Consumo extraordinário confirmado · 30 dias</dt>
              <dd>
                {formatQuantity(
                  metrics.find(
                    (item) =>
                      item.productId === selected.product.productId &&
                      item.location === selected.custody,
                  )?.quantity ?? "0",
                  selected.product.unit,
                )}
              </dd>
              <dt>Divergência pendente</dt>
              <dd>
                {formatQuantity(
                  selected.product.disputed,
                  selected.product.unit,
                )}
              </dd>
            </dl>
            <p className="hca-field-hint">
              Trânsito, compras pendentes e projeção dependem de recebimentos
              válidos. Somente a ENT aceita atende as linhas REQ.
            </p>
          </div>
        </RecordDrawer>
      ) : null}
    </div>
  );
}

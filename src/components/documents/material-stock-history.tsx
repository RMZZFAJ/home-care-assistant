"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { ActionButton, LoadingIndicator } from "@/components/ui/controls";
import { MovementOrigin } from "@/components/stock/movement-origin";
import { StockMovementHistory } from "@/components/stock/stock-movement-history";
import { parseStockOperationHistory, type StockOperationMovement } from "@/lib/validation/stock-reads";
import { useScopedRead } from "@/lib/use-scoped-read";

export function MaterialStockHistory({ patientId, productId, revision, page, onPage, renderDocumentLink, expanded, onToggle, onRead }: {
  patientId: string;
  productId: string;
  revision: string;
  page: number;
  onPage: (page: number) => void;
  renderDocumentLink: NonNullable<ComponentProps<typeof StockMovementHistory>["renderDocumentLink"]>;
  expanded: readonly string[];
  onToggle: (id: string, open: boolean) => void;
  onRead: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [origin, setOrigin] = useState<{ movement: StockOperationMovement; opener: HTMLElement } | null>(null);
  const decode = useCallback((raw: unknown) => parseStockOperationHistory(raw, {
    careRecipientId: patientId, productId, page, pageSize: 20, location: "", from: "", to: "", origin: "", search: "",
  }), [patientId, productId, page]);
  const query = new URLSearchParams({ view: "operations", careRecipientId: patientId, productId, page: String(page), pageSize: "20" });
  const read = useScopedRead("/api/stock/movements?" + query, revision, decode);
  useEffect(() => {
    if (!read.loading) onRead();
  }, [read.loading, onRead]);
  const total = read.data?.total ?? 0;
  return <section className="hca-form-stack">
    <h4 ref={headingRef} tabIndex={-1}>Movimentações do material</h4>
    {read.loading ? <LoadingIndicator label="Consultando movimentos" />
      : read.error ? <div role="alert" className="hca-v7-material-read-error">
        <p>{read.error}</p><ActionButton onClick={read.refresh}>Consultar movimentos novamente</ActionButton>
      </div> : read.data?.data.length ? <StockMovementHistory patientId={patientId} operations={read.data.data} fallbackRef={headingRef}
        onOrigin={(movement, opener) => setOrigin({ movement, opener })} renderDocumentLink={renderDocumentLink}
        expanded={expanded} onToggle={onToggle} />
        : <p>Nenhuma movimentação registrada para este material.</p>}
    {total > 20 || page > 1 ? <nav className="hca-material-pagination" aria-label="Páginas dos movimentos">
      <ActionButton disabled={page <= 1 || read.loading} onClick={() => onPage(page - 1)}>Anterior</ActionButton>
      <span>Página {page} de {Math.max(1, Math.ceil(total / 20))}</span>
      <ActionButton disabled={total <= page * 20 || read.loading} onClick={() => onPage(page + 1)}>Próxima</ActionButton>
    </nav> : null}
    {origin ? <MovementOrigin patientId={patientId} movementId={origin.movement.id} effect={origin.movement}
      opener={origin.opener} onClose={() => setOrigin(null)} restoreFocusFallbackRef={headingRef} /> : null}
  </section>;
}

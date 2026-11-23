"use client";
import { lazy, Suspense, useCallback, useState } from "react";
import type { MaterialVisitTarget } from "@/components/documents/material-full-visit";
import { EmptyState, Icon, StatusBadge } from "@/components/ui/primitives";
import { formatQuantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import type { TransitDocument } from "@/types/stock";
import type { WorkspaceContext } from "@/types/workspace";
import { ActionButton, DefinitionGrid, LoadingIndicator } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/overlays";
import { Notice } from "@/components/workspace";
import { useScopedRead } from "@/lib/use-scoped-read";
import { parseStockBalances } from "@/lib/validation/stock-reads";

const MaterialFullVisit = lazy(() => import("@/components/documents/material-full-visit").then(module => ({ default: module.MaterialFullVisit })));

export type { TransitDocument } from "@/types/stock";
export function StockTransitDrawer({ patientId, context, revision, search, productId, onClose, finalFocus }: {
  patientId: string;
  context: WorkspaceContext;
  revision: string;
  search: string;
  productId?: string;
  onClose: () => void;
  finalFocus: () => HTMLElement | false;
}) {
  const [visit, setVisit] = useState<{ target: MaterialVisitTarget; opener: HTMLElement } | null>(null);
  const decode = useCallback((value: unknown) => parseStockBalances(value, {
    careRecipientId: patientId, custody: "TRANSIT",
  }), [patientId]);
  const read = useScopedRead("/api/stock/balances?" + new URLSearchParams({
    careRecipientId: patientId, custody: "TRANSIT",
  }), revision, decode);
  return <Drawer open title="Materiais em trânsito" closeLabel="Fechar painel de trânsito"
    onClose={onClose} finalFocus={finalFocus} footer={<ActionButton onClick={onClose}>Fechar</ActionButton>}>
    {read.loading ? <LoadingIndicator label="Consultando os materiais em trânsito" /> : null}
    {read.error ? <Notice error>{read.error}
      <ActionButton onClick={read.refresh}>Atualizar consulta</ActionButton>
    </Notice> : null}
    {read.data ? <TransitStock documents={read.data.transit} search={search}
      productId={productId} loading={read.loading} showEmpty={!read.error}
      onVisit={(document, materialId, opener) => setVisit({
        target: { kind: "document", productId: materialId, reference: { id: document.id, code: document.code, type: "ENT" } },
        opener,
      })} /> : null}
    {visit ? <Suspense fallback={<LoadingIndicator label="Abrindo ficha completa" />}>
      <MaterialFullVisit context={context} target={visit.target} onClose={() => setVisit(null)}
        finalFocus={() => visit.opener.isConnected ? visit.opener : false} />
    </Suspense> : null}
  </Drawer>;
}

function TransitStock({
  documents,
  search,
  productId,
  loading,
  showEmpty = true,
  onVisit,
}: {
  documents: TransitDocument[];
  search: string;
  productId?: string;
  loading: boolean;
  showEmpty?: boolean;
  onVisit: (document: TransitDocument, productId: string, opener: HTMLElement) => void;
}) {
  const term = search.trim().toLocaleLowerCase("pt-BR");
  const groups = new Map<string, { document: TransitDocument; line: TransitDocument["lines"][number] }[]>();
  for (const document of documents) {
    for (const line of document.lines) {
      const matches = productId ? line.productId === productId : line.name.toLocaleLowerCase("pt-BR").includes(term);
      if (!matches) continue;
      const group = groups.get(line.productId);
      const entry = { document, line };
      if (group) group.push(entry);
      else groups.set(line.productId, [entry]);
    }
  }
  return (
    <div className="hca-form-stack hca-transit-stock">
      <p className="text-sm leading-6 text-(--muted)">
        Materiais expedidos aguardando conferência ou resolução de divergência.
        Essas quantidades ainda não fazem parte do saldo confirmado do
        destinatário.
      </p>
      {[...groups].map(([id, entries]) => (
        <section className="ui-card hca-form-stack hca-transit-material" key={id} aria-label={entries[0].line.name}>
          <header className="hca-transit-material-heading">
            <span className="hca-stock-material-icon"><Icon name="box" width={20} height={20} /></span>
            <div><h3>{entries[0].line.name}</h3>
              <small>{entries.length} {entries.length === 1 ? "ficha vinculada" : "fichas vinculadas"}</small>
            </div>
          </header>
          {entries.map(({ document, line }) => (
              <article className="hca-transit-record" key={document.id}>
                <div className="hca-transit-record-heading">
                  <ActionButton compact onClick={event => onVisit(document, id, event.currentTarget)}>{document.code}</ActionButton>
                  <StatusBadge status={document.status} />
                </div>
                <p>{document.source === "FAMILY" ? "Família → Equipe" : "Equipe → Família"} · {formatBrazilDate(document.createdAt)}</p>
                {line.name !== entries[0].line.name ? <p>Identificação na ficha · {line.name}</p> : null}
                <DefinitionGrid items={[
                    ["Expedido", line.dispatched],
                    ["Aceito no destino", line.accepted],
                    ["Conciliado", line.reconciled],
                    [
                      line.disputed
                        ? "Divergência pendente"
                        : "Aguardando conferência",
                      line.pending,
                    ],
                  ].map(([label, value]) => ({ label, value: formatQuantity(value, line.unit) }))} />
              </article>
          ))}
        </section>
      ))}
      {!loading && showEmpty && !groups.size ? (
        <EmptyState title="Nenhuma entrega em trânsito">
          As conferências pendentes deste paciente aparecerão aqui.
        </EmptyState>
      ) : null}
    </div>
  );
}
